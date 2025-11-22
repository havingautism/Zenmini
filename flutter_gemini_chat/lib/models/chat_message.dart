enum ChatRole {
  user,
  model,
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.isLoading = false,
    this.thinkingProcess,
    this.sources = const [],
    this.suggestedReplies = const [],
    this.generatedWithThinking = false,
    this.generatedWithSearch = false,
    this.groundingMetadata,
  });

  final String id;
  final ChatRole role;
  final String content;
  final DateTime createdAt;

  final bool isLoading;
  final String? thinkingProcess;
  final List<dynamic> sources;
  final List<String> suggestedReplies;
  final bool generatedWithThinking;
  final bool generatedWithSearch;
  final Map<String, dynamic>? groundingMetadata;

  ChatMessage copyWith({
    String? id,
    ChatRole? role,
    String? content,
    DateTime? createdAt,
    bool? isLoading,
    String? thinkingProcess,
    List<String>? sources,
    List<String>? suggestedReplies,
    bool? generatedWithThinking,
    bool? generatedWithSearch,
    Map<String, dynamic>? groundingMetadata,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
      isLoading: isLoading ?? this.isLoading,
      thinkingProcess: thinkingProcess ?? this.thinkingProcess,
      sources: sources ?? this.sources,
      suggestedReplies: suggestedReplies ?? this.suggestedReplies,
      generatedWithThinking:
          generatedWithThinking ?? this.generatedWithThinking,
      generatedWithSearch: generatedWithSearch ?? this.generatedWithSearch,
      groundingMetadata: groundingMetadata ?? this.groundingMetadata,
    );
  }
}
