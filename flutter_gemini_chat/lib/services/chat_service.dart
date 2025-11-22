import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/chat_message.dart';
import 'supabase_service.dart';

class ChatService {
  ChatService(this._sb, this.appId);

  final SupabaseService _sb;
  final String appId;

  SupabaseClient get _client => _sb.client;

  Future<List<Map<String, dynamic>>> _fetchSessions() async {
    final result = await _client
        .from('chat_sessions')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', ascending: false);
    return (result as List).cast<Map<String, dynamic>>();
  }

  Stream<List<Map<String, dynamic>>> subscribeSessions() async* {
    // 首次获取
    yield await _fetchSessions();

    // 简单轮询实现订阅，避免依赖已移除的 postgresChangeStream API
    yield* Stream.periodic(const Duration(seconds: 2))
        .asyncMap((_) => _fetchSessions());
  }

  Future<List<Map<String, dynamic>>> _fetchMessages(String sessionId) async {
    final result = await _client
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', ascending: true);
    return (result as List).cast<Map<String, dynamic>>();
  }

  Stream<List<Map<String, dynamic>>> subscribeMessages(String sessionId) async* {
    // 首次获取
    yield await _fetchMessages(sessionId);

    // 简单轮询实现订阅
    yield* Stream.periodic(const Duration(seconds: 2))
        .asyncMap((_) => _fetchMessages(sessionId));
  }

  Future<String> createSession(String title) async {
    final result = await _client
        .from('chat_sessions')
        .insert({
          'app_id': appId,
          'client_id': SupabaseService.getOrCreateClientId(),
          'title': title,
        })
        .select('id')
        .single();
    return result['id'] as String;
  }

  Future<void> addUserMessage({
    required String sessionId,
    required String content,
    DateTime? createdAt,
  }) async {
    final payload = <String, dynamic>{
      'session_id': sessionId,
      'role': 'user',
      'content': content,
    };
    if (createdAt != null) {
      payload['created_at'] = createdAt.toIso8601String();
    }
    await _client.from('messages').insert(payload);
  }

  Future<void> addModelMessage({
    required String sessionId,
    required String content,
    String? thinkingProcess,
    List<dynamic>? sources,
    List<String>? suggestedReplies,
    bool generatedWithThinking = false,
    bool generatedWithSearch = false,
    Map<String, dynamic>? groundingMetadata,
    DateTime? createdAt,
  }) async {
    final messageData = <String, dynamic>{
      'session_id': sessionId,
      'role': 'model',
      'content': content,
      'thinking_process': thinkingProcess,
      'sources': sources ?? [],
      'generated_with_thinking': generatedWithThinking,
      'generated_with_search': generatedWithSearch,
      'grounding_metadata': groundingMetadata,
    };
    if (createdAt != null) {
      messageData['created_at'] = createdAt.toIso8601String();
    }
    if (suggestedReplies != null && suggestedReplies.isNotEmpty) {
      messageData['suggested_replies'] = suggestedReplies;
    }

    try {
      await _client.from('messages').insert(messageData);
    } catch (e) {
      // Web 环境某些字段不存在时，移除问题字段后重试
      final errorText = e.toString();
      final fieldsToCheck = [
        'suggested_replies',
        'thinking_process',
        'grounding_metadata',
      ];
      for (final field in fieldsToCheck) {
        if (errorText.contains(field) && messageData.containsKey(field)) {
          messageData.remove(field);
          await _client.from('messages').insert(messageData);
          return;
        }
      }
      rethrow;
    }
  }

  Future<void> deleteMessages({
    required String sessionId,
    required List<String> ids,
  }) async {
    await _client
        .from('messages')
        .delete()
        .inFilter('id', ids)
        .eq('session_id', sessionId);
  }

  Future<void> deleteSession(String sessionId) async {
    // 新版 supabase_flutter 直接抛异常，不再通过 response.error
    await _client.from('messages').delete().eq('session_id', sessionId);
    await _client.from('chat_sessions').delete().eq('id', sessionId);
  }

  Future<SchemaStatus> detectTables() async {
    final Map<String, dynamic>? sRes =
        await _client.from('chat_sessions').select('id').limit(1).maybeSingle();
    final Map<String, dynamic>? mRes =
        await _client.from('messages').select('id').limit(1).maybeSingle();
    final hasSessions = sRes != null;
    final hasMessages = mRes != null;
    return SchemaStatus(hasSessions: hasSessions, hasMessages: hasMessages);
  }
}

class SchemaStatus {
  SchemaStatus({required this.hasSessions, required this.hasMessages});

  final bool hasSessions;
  final bool hasMessages;
}

String getSchemaSql() {
  return '''-- Create chat_sessions table
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  client_id text not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','model')),
  content text not null,
  thinking_process text,
  sources jsonb,
  suggested_replies jsonb,
  grounding_metadata jsonb,
  generated_with_thinking boolean default false,
  generated_with_search boolean default false,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_chat_sessions_client on public.chat_sessions(client_id);
create index if not exists idx_messages_session on public.messages(session_id);

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;
''';
}

