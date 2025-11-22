import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/chat_message.dart';

class GeminiChatResult {
  GeminiChatResult({
    required this.text,
    this.thinkingProcess,
    this.sources = const [],
    this.groundingMetadata,
  });

  final String text;
  final String? thinkingProcess;
  final List<Map<String, dynamic>> sources;
  final Map<String, dynamic>? groundingMetadata;
}

class GeminiTtsResult {
  GeminiTtsResult({
    required this.bytes,
    required this.mimeType,
  });

  final List<int> bytes;
  final String mimeType;
}

class GeminiService {
  GeminiService(this.apiKey);

  final String apiKey;

  static const _defaultModel = 'gemini-2.5-flash';

  Future<GeminiChatResult> callGeminiApi({
    required List<ChatMessage> history,
    required String userMessage,
    String modelToUse = _defaultModel,
    bool isSearchEnabled = true,
    bool isThinkingEnabled = true,
  }) async {
    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/$modelToUse:generateContent?key=$apiKey';

    final contents = [
      ...history.map(
        (m) => {
          'role': m.role == ChatRole.user ? 'user' : 'model',
          'parts': [
            {'text': m.content},
          ],
        },
      ),
      {
        'role': 'user',
        'parts': [
          {'text': userMessage},
        ],
      },
    ];

    final payload = <String, dynamic>{
      'contents': contents,
    };

    final systemInstructions = <String>[
      'Respond *only* with the plain text answer. '
          'Do not include pinyin, romanization, or automatic translations '
          'unless the user explicitly asks for them.',
    ];

    if (systemInstructions.isNotEmpty) {
      payload['systemInstruction'] = {
        'parts': [
          {'text': systemInstructions.join(' ')},
        ],
      };
    }

    if (isThinkingEnabled) {
      payload['generationConfig'] = {
        'thinkingConfig': {
          'thinkingBudget': -1,
          'includeThoughts': true,
        },
      };
    }

    if (isSearchEnabled) {
      payload['tools'] = [
        {'googleSearch': {}},
      ];
    }

    final response = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode != 200) {
      return GeminiChatResult(
        text: '抱歉，我暂时无法回答。（API 响应错误 ${response.statusCode}）',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final candidates = decoded['candidates'] as List<dynamic>?;
    if (candidates == null || candidates.isEmpty) {
      return GeminiChatResult(
        text: '抱歉，我暂时无法回答。（API 响应格式错误）',
      );
    }

    final candidate = candidates.first as Map<String, dynamic>;
    final content = candidate['content'] as Map<String, dynamic>?;
    final parts = content?['parts'] as List<dynamic>? ?? const [];

    String? thinkingProcess;
    String finalAnswer = '';

    if (isThinkingEnabled) {
      final thoughtParts = <String>[];
      final answerParts = <String>[];

      for (final p in parts) {
        final part = p as Map<String, dynamic>;
        final text = part['text'] as String? ?? '';
        if (part['thought'] == true) {
          thoughtParts.add(text);
        } else {
          answerParts.add(text);
        }
      }

      thinkingProcess = thoughtParts.join().trim();
      finalAnswer = answerParts.join().trim();

      if (thinkingProcess.isEmpty && finalAnswer.isEmpty) {
        finalAnswer = parts
            .map((p) => (p as Map<String, dynamic>)['text'] as String? ?? '')
            .join()
            .trim();
        thinkingProcess = null;
      }
    } else {
      finalAnswer = parts
          .map((p) => (p as Map<String, dynamic>)['text'] as String? ?? '')
          .join()
          .trim();
    }

    Map<String, dynamic>? groundingMetadata;
    List<Map<String, dynamic>> sources = [];
    final rawGrounding = candidate['groundingMetadata'];
    if (rawGrounding is Map<String, dynamic>) {
      groundingMetadata = jsonDecode(jsonEncode(rawGrounding));
      if (rawGrounding['groundingChunks'] is List) {
        sources = (rawGrounding['groundingChunks'] as List)
            .map((chunk) => chunk as Map<String, dynamic>)
            .map((chunk) => {
                  'uri': chunk['web']?['uri'],
                  'title': chunk['web']?['title'],
                })
            .where((s) => (s['uri'] ?? '').toString().isNotEmpty)
            .toList();
      } else if (rawGrounding['groundingAttributions'] is List) {
        sources = (rawGrounding['groundingAttributions'] as List)
            .map((attr) => attr as Map<String, dynamic>)
            .map((attr) => {
                  'uri': attr['web']?['uri'],
                  'title': attr['web']?['title'],
                })
            .where((s) => (s['uri'] ?? '').toString().isNotEmpty)
            .toList();
      }
    }

    return GeminiChatResult(
      text: finalAnswer,
      thinkingProcess: thinkingProcess,
      sources: sources,
      groundingMetadata: groundingMetadata,
    );
  }

  Future<List<String>> fetchSuggestedReplies(
    List<Map<String, dynamic>> history,
  ) async {
    const systemPrompt =
        'Based on the *last* message in the conversation, generate 3 very short, concise, one-click replies for the user to send next. The replies should be in the same language as the conversation (e.g., Chinese if the convo is in Chinese). Only output the JSON object.';

    final responseSchema = {
      'type': 'OBJECT',
      'properties': {
        'replies': {
          'type': 'ARRAY',
          'items': {'type': 'STRING'},
          'maxItems': 3,
        },
      },
      'propertyOrdering': ['replies'],
    };

    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=$apiKey';
    final payload = {
      'contents': history,
      'systemInstruction': {
        'parts': [
          {'text': systemPrompt},
        ],
      },
      'generationConfig': {
        'responseMimeType': 'application/json',
        'responseSchema': responseSchema,
      },
    };

    final resp = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (resp.statusCode != 200) return const [];
    final decoded = jsonDecode(resp.body) as Map<String, dynamic>;
    final candidates = decoded['candidates'] as List<dynamic>?;
    if (candidates == null || candidates.isEmpty) return const [];
    final candidate = candidates.first as Map<String, dynamic>;
    final text = (candidate['content']?['parts']?[0]?['text'] ?? '') as String;
    if (text.isEmpty) return const [];
    try {
      final json = jsonDecode(text) as Map<String, dynamic>;
      final replies = (json['replies'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList();
      return replies;
    } catch (_) {
      return const [];
    }
  }

  Future<String> translate(String textToTranslate, String targetLanguage) async {
    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=$apiKey';
    final payload = {
      'contents': [
        {
          'role': 'user',
          'parts': [
            {'text': textToTranslate},
          ],
        },
      ],
      'systemInstruction': {
        'parts': [
          {
            'text':
                'Translate the following text to $targetLanguage. Respond ONLY with the translated text, and nothing else.',
          },
        ],
      },
    };

    try {
      final resp = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
      if (resp.statusCode != 200) {
        return '翻译失败。';
      }
      final decoded = jsonDecode(resp.body) as Map<String, dynamic>;
      final candidates = decoded['candidates'] as List<dynamic>?;
      if (candidates == null || candidates.isEmpty) return '翻译失败。';
      final candidate = candidates.first as Map<String, dynamic>;
      final text = candidate['content']?['parts']?[0]?['text'] as String?;
      return text ?? '翻译失败。';
    } catch (_) {
      return '翻译失败。';
    }
  }

  Future<GeminiTtsResult> synthesizeTts(String textToSpeak) async {
    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=$apiKey';
    final payload = {
      'contents': [
        {
          'parts': [
            {'text': textToSpeak},
          ],
        },
      ],
      'generationConfig': {
        'responseModalities': ['AUDIO'],
        'speechConfig': {
          'voiceConfig': {
            'prebuiltVoiceConfig': {'voiceName': 'Kore'},
          },
        },
      },
      'model': 'gemini-2.5-flash-preview-tts',
    };

    final resp = await http.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (resp.statusCode != 200) {
      throw Exception('TTS 调用失败：${resp.statusCode}');
    }
    final decoded = jsonDecode(resp.body) as Map<String, dynamic>;
    final part =
        decoded['candidates']?[0]?['content']?['parts']?[0] as Map<String, dynamic>?;
    final inlineData = part?['inlineData'] as Map<String, dynamic>?;
    final audioData = inlineData?['data'] as String?;
    final mimeType = inlineData?['mimeType'] as String?;
    if (audioData == null || mimeType == null || !mimeType.startsWith('audio/')) {
      throw Exception('TTS 响应格式错误');
    }
    final bytes = base64Decode(audioData);
    return GeminiTtsResult(bytes: bytes, mimeType: mimeType);
  }
}
