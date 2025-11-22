import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/chat_message.dart';
import '../services/chat_service.dart';
import '../services/gemini_service.dart';
import '../services/supabase_service.dart';
import '../widgets/chat_sidebar.dart';
import '../widgets/message_bubble.dart';
import '../widgets/schema_init_modal.dart';
import '../widgets/settings_modal.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String? _apiKey;
  String? _activeSessionId;
  List<ChatSession> _sessions = [];

  SupabaseService? _supabaseService;
  ChatService? _chatService;

  bool _isSettingsOpen = false;
  bool _isAutoPlayTts = false;
  SupabaseConfig _localSbConfig = emptySbConfig;
  String _schemaSql = '';
  bool _needsSchemaInit = false;

  bool _isThinkingMode = true;
  bool _isSearchMode = true;
  List<String> _suggestedReplies = [];
  final Map<String, String> _translations = {};
  final Set<String> _translatingMessageIds = {};
  final Set<String> _ttsLoadingMessageIds = {};
  String? _translatingMessageId;
  String? _ttsLoadingMessageId;
  String? _playingMessageId;
  AudioPlayer? _audioPlayer;

  @override
  void initState() {
    super.initState();
    _loadLocalState();
    _initSupabase();
  }

  Future<void> _loadLocalState() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _apiKey = prefs.getString('gemini_api_key');
      _isAutoPlayTts = prefs.getBool('auto_play_tts') ?? false;
    });
    final cfg = await SupabaseService.loadConfigFromLocal();
    if (cfg != null && cfg.isValid) {
      setState(() {
        _localSbConfig = cfg;
      });
    }
  }

  Future<void> _initSupabase() async {
    final local = await SupabaseService.loadConfigFromLocal();
    final fromEnv = SupabaseService.loadConfigFromEnv();
    final config = local ?? fromEnv;
    if (config == null || !config.isValid) {
      return;
    }

    final svc = await SupabaseService.init(config);
    final chatSvc = ChatService(svc, 'default-app-id');

    setState(() {
      _supabaseService = svc;
      _chatService = chatSvc;
      _localSbConfig = config;
    });

    chatSvc.subscribeSessions().listen((items) {
      setState(() {
        _sessions = items
            .map(
              (s) => ChatSession(
                id: s['id'] as String,
                title: (s['title'] as String?) ?? '未命名对话',
                createdAt: DateTime.parse(s['created_at'] as String),
              ),
            )
            .toList();
      });
      if (_activeSessionId == null && _sessions.isNotEmpty) {
        _setActiveSession(_sessions.first.id);
      }
    });
  }

  void _setActiveSession(String sessionId) {
    if (_chatService == null) {
      setState(() {
        _activeSessionId = sessionId;
      });
      return;
    }
    setState(() {
      _activeSessionId = sessionId;
      _messages = [];
    });

    _chatService!.subscribeMessages(sessionId).listen((items) {
      setState(() {
        _messages = items.map(_mapDbMessageToModel).toList();
      });
      _scrollToBottom();
    });
  }

  Future<void> _saveApiKey(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('gemini_api_key', key);
    setState(() {
      _apiKey = key;
    });
  }

  Future<void> _setAutoPlayTts(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('auto_play_tts', value);
    setState(() {
      _isAutoPlayTts = value;
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isLoading) return;
    if (_apiKey == null || _apiKey!.isEmpty) {
      _showApiKeyDialog();
      return;
    }

    final userMessage = ChatMessage(
      id: 'user-${DateTime.now().millisecondsSinceEpoch}',
      role: ChatRole.user,
      content: text,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages = [..._messages, userMessage];
      _inputController.clear();
      _isLoading = true;
      _suggestedReplies = [];
    });

    String? currentSessionId = _activeSessionId;

    try {
      if (_chatService != null && currentSessionId == null) {
        final title =
            text.length > 50 ? text.substring(0, 50) : text;
        currentSessionId = await _chatService!.createSession(
          title.isEmpty ? '新会话' : title,
        );
        _setActiveSession(currentSessionId);
      }

      if (_chatService != null && currentSessionId != null) {
        _chatService!.addUserMessage(
          sessionId: currentSessionId,
          content: text,
          createdAt: userMessage.createdAt,
        );
      }

      final gemini = GeminiService(_apiKey!);
      final chatResult = await gemini.callGeminiApi(
        history: _messages,
        userMessage: text,
        isSearchEnabled: _isSearchMode,
        isThinkingEnabled: _isThinkingMode,
      );

      final modelMessage = ChatMessage(
        id: 'model-${DateTime.now().millisecondsSinceEpoch}',
        role: ChatRole.model,
        content: chatResult.text.isEmpty
            ? '抱歉，没有收到模型回复。'
            : chatResult.text,
        createdAt: DateTime.now(),
        thinkingProcess: chatResult.thinkingProcess,
        sources: chatResult.sources,
        generatedWithThinking: _isThinkingMode,
        generatedWithSearch: _isSearchMode,
      );

      setState(() {
        _messages = [..._messages, modelMessage];
      });
      _scrollToBottom();

      if (_chatService != null && currentSessionId != null) {
        _chatService!.addModelMessage(
          sessionId: currentSessionId,
          content: modelMessage.content,
          thinkingProcess: modelMessage.thinkingProcess,
          sources: modelMessage.sources,
          generatedWithThinking: modelMessage.generatedWithThinking,
          generatedWithSearch: modelMessage.generatedWithSearch,
          groundingMetadata: chatResult.groundingMetadata,
          createdAt: modelMessage.createdAt,
        );
      }

      final historyForApi = [
        ..._messages.map((m) => {
              'role': m.role == ChatRole.user ? 'user' : 'model',
              'parts': [
                {'text': m.content},
              ],
            }),
        {
          'role': 'model',
          'parts': [
            {'text': modelMessage.content},
          ],
        },
      ];
      final replies =
          await gemini.fetchSuggestedReplies(historyForApi);
      if (mounted) {
        setState(() {
          _suggestedReplies = replies;
        });
      }

      if (_isAutoPlayTts && modelMessage.content.isNotEmpty) {
        await _playTtsForText(modelMessage.id, modelMessage.content);
      }
    } catch (_) {
      setState(() {
        _messages = [
          ..._messages,
          ChatMessage(
            id: 'error-${DateTime.now().millisecondsSinceEpoch}',
            role: ChatRole.model,
            content: '抱歉，发送消息时出错，请重试。',
            createdAt: DateTime.now(),
          ),
        ];
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      _scrollToBottom();
    }
  }

Future<void> _playTtsForText(String messageId, String text) async {
    if (_apiKey == null || _apiKey!.isEmpty) return;
    setState(() {
      _ttsLoadingMessageIds.add(messageId);
    });
    _audioPlayer ??= AudioPlayer();
    try {
      final gemini = GeminiService(_apiKey!);
      final ttsResult = await gemini.synthesizeTts(text);
      await _audioPlayer!.stop();
      final bytes = Uint8List.fromList(ttsResult.bytes);
      await _audioPlayer!.play(BytesSource(bytes));
      setState(() {
        _playingMessageId = messageId;
      });
      _audioPlayer!.onPlayerComplete.listen((event) {
        if (mounted) {
          setState(() {
            _playingMessageId = null;
          });
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _ttsLoadingMessageIds.remove(messageId);
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _audioPlayer?.dispose();
    super.dispose();
  }

  void _openSettings() {
    setState(() {
      _isSettingsOpen = true;
    });
  }

  void _closeSettings() {
    setState(() {
      _isSettingsOpen = false;
    });
  }

  Future<void> _handleSaveSettings(
    String newKey,
    SupabaseConfig newConfig,
  ) async {
    final oldConfig = _localSbConfig;
    if (newKey != _apiKey) {
      await _saveApiKey(newKey);
    }
    await SupabaseService.saveConfig(newConfig);
    final changed =
        oldConfig.url != newConfig.url || oldConfig.anonKey != newConfig.anonKey;
    if (changed) {
      await _initSupabase();
    }
    _closeSettings();
  }

  Future<void> _handleTestSchema() async {
    if (_chatService == null) return;
    final status = await _chatService!.detectTables();
    if (status.hasSessions && status.hasMessages) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('数据库 Schema 已存在')),
        );
      }
      return;
    }
    setState(() {
      _schemaSql = getSchemaSql();
      _needsSchemaInit = true;
    });
  }

  void _closeSchemaModal() {
    setState(() {
      _needsSchemaInit = false;
    });
  }

  ChatMessage _mapDbMessageToModel(Map<String, dynamic> row) {
    final roleStr = row['role'] as String? ?? 'user';
    final role =
        roleStr == 'model' ? ChatRole.model : ChatRole.user;
    final createdAtStr = row['created_at'] as String?;
    final createdAt = createdAtStr != null
        ? DateTime.tryParse(createdAtStr) ?? DateTime.now()
        : DateTime.now();

    return ChatMessage(
      id: row['id'] as String? ?? '',
      role: role,
      content: row['content'] as String? ?? '',
      createdAt: createdAt,
      isLoading: false,
      thinkingProcess: row['thinking_process'] as String?,
      sources: row['sources'] as List<dynamic>? ?? const [],
      generatedWithThinking:
          (row['generated_with_thinking'] as bool?) ?? false,
      generatedWithSearch:
          (row['generated_with_search'] as bool?) ?? false,
      groundingMetadata:
          row['grounding_metadata'] as Map<String, dynamic>?,
    );
  }

  Future<void> _showApiKeyDialog() async {
    final controller = TextEditingController(text: _apiKey ?? '');
    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('设置 Gemini API Key'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'API Key',
              border: OutlineInputBorder(),
            ),
            obscureText: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('取消'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(controller.text),
              child: const Text('保存'),
            ),
          ],
        );
      },
    );

    if (result != null && result.trim().isNotEmpty) {
      await _saveApiKey(result.trim());
    }
  }

Future<void> _handleTranslateLastMessage() async {
    if (_apiKey == null || _apiKey!.isEmpty) return;
    final lastModel = _messages.lastWhere(
      (m) => m.role == ChatRole.model,
      orElse: () => ChatMessage(
        id: '',
        role: ChatRole.model,
        content: '',
        createdAt: DateTime.now(),
      ),
    );
    if (lastModel.id.isEmpty) return;
    await _handleTranslateMessage(lastModel.id, lastModel.content);
  }

  Future<void> _handleTtsLastMessage() async {
    final lastModel = _messages.lastWhere(
      (m) => m.role == ChatRole.model,
      orElse: () => ChatMessage(
        id: '',
        role: ChatRole.model,
        content: '',
        createdAt: DateTime.now(),
      ),
    );
    if (lastModel.id.isEmpty) return;
    await _playTtsForText(lastModel.id, lastModel.content);
  }

  Future<void> _handleTranslateMessage(String id, String content) async {
    if (_apiKey == null || _apiKey!.isEmpty) return;
    setState(() {
      _translatingMessageIds.add(id);
    });
    final gemini = GeminiService(_apiKey!);
    final translated = await gemini.translate(content, 'English');
    if (!mounted) return;
    setState(() {
      _translations[id] = translated;
      _translatingMessageIds.remove(id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 900;
                return Container(
                  color: const Color(0xFFF8F4EC),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1200),
                      child: Column(
                        children: [
                          _buildHeader(context, isWide),
                          const SizedBox(height: 8),
                          Expanded(
                            child: Container(
                              margin: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(32),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 32,
                                    offset: const Offset(0, 14),
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  _buildChatToolbar(context),
                                  const Divider(height: 1),
                                  Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 16,
                                      ),
                                      child: ListView.builder(
                                        controller: _scrollController,
                                        itemCount: _messages.length,
                                        itemBuilder: (context, index) {
                                          final msg = _messages[index];
                                          final translated =
                                              _translations[msg.id];
                                          return MessageBubble(
                                            message: msg,
                                            translatedText: translated,
                                            showActions:
                                                msg.role == ChatRole.model,
                                            onTranslate:
                                                msg.role == ChatRole.model
                                                    ? () =>
                                                        _handleTranslateMessage(
                                                          msg.id,
                                                          msg.content,
                                                        )
                                                    : null,
                                            onPlayTts:
                                                msg.role == ChatRole.model
                                                    ? () => _playTtsForText(
                                                          msg.id,
                                                          msg.content,
                                                        )
                                                    : null,
                                            isTranslating:
                                                _translatingMessageIds
                                                    .contains(msg.id),
                                            isTtsLoading:
                                                _ttsLoadingMessageIds
                                                    .contains(msg.id),
                                            isPlaying:
                                                _playingMessageId == msg.id,
                                          );
                                        },
                                      ),
                                    ),
                                  ),
                                  const Divider(height: 1),
                                  _buildInputArea(context),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isSettingsOpen)
            Container(
              color: Colors.black.withOpacity(0.2),
              alignment: Alignment.center,
              child: SettingsModal(
                currentGeminiApiKey: _apiKey ?? '',
                currentSbConfig: _localSbConfig,
                isAutoPlayTts: _isAutoPlayTts,
                onClose: _closeSettings,
                onSave: _handleSaveSettings,
                onToggleAutoPlayTts: () =>
                    _setAutoPlayTts(!_isAutoPlayTts),
                onTestSchema: _handleTestSchema,
              ),
            ),
          if (_needsSchemaInit)
            SchemaInitModal(
              sql: _schemaSql,
              onClose: _closeSchemaModal,
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isWide) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          if (!isWide)
            IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () {
                // 可以在这里实现 Drawer 展示会话列表
              },
            ),
          const SizedBox(width: 4),
          const Text(
            'Gemini Chat',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: '设置',
            onPressed: _openSettings,
          ),
        ],
      ),
    );
  }

  Widget _buildChatToolbar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4FF),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: const [
                Icon(Icons.bolt, size: 16, color: Color(0xFF4F46E5)),
                SizedBox(width: 4),
                Text(
                  'gemini-2.5-flash',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          FilterChip(
            selected: _isThinkingMode,
            onSelected: (v) {
              setState(() {
                _isThinkingMode = v;
              });
            },
            showCheckmark: false,
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.auto_awesome,
                  size: 14,
                  color: _isThinkingMode
                      ? const Color(0xFF4F46E5)
                      : Colors.grey.shade500,
                ),
                const SizedBox(width: 4),
                const Text(
                  '思维链',
                  style: TextStyle(fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilterChip(
            selected: _isSearchMode,
            onSelected: (v) {
              setState(() {
                _isSearchMode = v;
              });
            },
            showCheckmark: false,
            label: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.public,
                  size: 14,
                  color: _isSearchMode
                      ? const Color(0xFF4F46E5)
                      : Colors.grey.shade500,
                ),
                const SizedBox(width: 4),
                const Text(
                  '联网搜索',
                  style: TextStyle(fontSize: 11),
                ),
              ],
            ),
          ),
          const Spacer(),
          Text(
            _isLoading ? '正在思考…' : '就绪',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    minLines: 1,
                    maxLines: 5,
                    onSubmitted: (_) => _sendMessage(),
                    decoration: InputDecoration(
                      hintText: '向 Gemini 提问，支持中文哦…',
                      filled: true,
                      fillColor: const Color(0xFFF3F4F6),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _isLoading
                    ? const SizedBox(
                        width: 28,
                        height: 28,
                        child:
                            CircularProgressIndicator(strokeWidth: 2.4),
                      )
                    : IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF111827),
                          foregroundColor: Colors.white,
                        ),
                        onPressed: _sendMessage,
                        icon: const Icon(Icons.send_rounded, size: 18),
                      ),
              ],
            ),
            const SizedBox(height: 6),
            if (_suggestedReplies.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 2),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: _suggestedReplies.map((r) {
                      return ActionChip(
                        label: Text(
                          r,
                          style: const TextStyle(fontSize: 11),
                        ),
                        onPressed: () {
                          _inputController.text = r;
                          _inputController.selection =
                              TextSelection.fromPosition(
                            TextPosition(offset: r.length),
                          );
                        },
                      );
                    }).toList(),
                  ),
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'AI 可能会出错，请自行核查',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey.shade500,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton.icon(
                      onPressed: _handleTranslateLastMessage,
                      icon: _translatingMessageId != null
                          ? const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 1.8),
                            )
                          : const Icon(Icons.translate, size: 14),
                      label: const Text(
                        '翻译',
                        style: TextStyle(fontSize: 10),
                      ),
                    ),
                    const SizedBox(width: 4),
                    TextButton.icon(
                      onPressed: _handleTtsLastMessage,
                      icon: _ttsLoadingMessageId != null
                          ? const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 1.8),
                            )
                          : Icon(
                              _playingMessageId != null
                                  ? Icons.stop
                                  : Icons.volume_up,
                              size: 14,
                            ),
                      label: const Text(
                        '朗读',
                        style: TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
