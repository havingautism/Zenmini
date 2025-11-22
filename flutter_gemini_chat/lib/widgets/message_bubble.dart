import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import 'markdown_renderer.dart';

class MessageBubble extends StatefulWidget {
  const MessageBubble({
    super.key,
    required this.message,
    this.onCopy,
    this.onRegenerate,
    this.onTranslate,
    this.onPlayTts,
    this.translatedText,
    this.isTranslating = false,
    this.isTtsLoading = false,
    this.isPlaying = false,
    this.showActions = false,
  });

  final ChatMessage message;
  final VoidCallback? onCopy;
  final VoidCallback? onRegenerate;
  final VoidCallback? onTranslate;
  final VoidCallback? onPlayTts;
  final String? translatedText;
  final bool isTranslating;
  final bool isTtsLoading;
  final bool isPlaying;
  final bool showActions;

  @override
  State<MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<MessageBubble> {
  bool _sourcesExpanded = false;

  bool get _isUser => widget.message.role == ChatRole.user;

  @override
  Widget build(BuildContext context) {
    final bubbleColor = _isUser
        ? const Color(0xFF111827)
        : const Color(0xFFFFFBF5);
    final borderColor =
        _isUser ? Colors.transparent : const Color(0xFFECE4DA);

    return Align(
      alignment: _isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(
            color: bubbleColor,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(24),
              topRight: const Radius.circular(24),
              bottomLeft:
                  _isUser ? const Radius.circular(24) : const Radius.circular(4),
              bottomRight:
                  _isUser ? const Radius.circular(4) : const Radius.circular(24),
            ),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!_isUser && widget.message.thinkingProcess != null)
                  _buildThinkingHeader(context),
                if (!_isUser && widget.message.thinkingProcess != null)
                  const SizedBox(height: 8),
                _buildContent(context),
                if (!_isUser && widget.translatedText != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      widget.translatedText!,
                      style: const TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ),
                if (!_isUser) _buildSourcesSection(context),
                if (widget.showActions) _buildActions(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildThinkingHeader(BuildContext context) {
    return Row(
      children: [
        Icon(
          Icons.bubble_chart,
          size: 16,
          color: Colors.grey.shade600,
        ),
        const SizedBox(width: 6),
        Text(
          'Thinking completed',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    if (widget.message.isLoading && widget.message.content.isEmpty) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                _isUser ? Colors.white : const Color(0xFF4F46E5),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '正在生成回复…',
            style: TextStyle(
              fontSize: 14,
              color: _isUser ? Colors.white70 : Colors.grey.shade600,
            ),
          ),
        ],
      );
    }

    if (_isUser) {
      return Text(
        widget.message.content,
        style: const TextStyle(
          fontSize: 14,
          height: 1.5,
          color: Colors.white,
        ),
      );
    }

    return MarkdownRenderer(
      content: widget.message.content,
      groundingMetadata: widget.message.groundingMetadata,
    );
  }

  Widget _buildSourcesSection(BuildContext context) {
    final sources = widget.message.sources;
    final gm = widget.message.groundingMetadata;
    if (sources.isEmpty && gm == null) {
      return const SizedBox.shrink();
    }

    final queries = (gm?['webSearchQueries'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        const [];

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (queries.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: queries
                  .map(
                    (q) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.search,
                            size: 10,
                            color: Color(0xFF6B7280),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            q,
                            style: const TextStyle(
                              fontSize: 10,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
          if (sources.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 6),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 0),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: () {
                    setState(() {
                      _sourcesExpanded = !_sourcesExpanded;
                    });
                  },
                  icon: const Icon(
                    Icons.public,
                    size: 14,
                    color: Color(0xFF4B5563),
                  ),
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '参考来源 (${sources.length})',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF4B5563),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Icon(
                        _sourcesExpanded
                            ? Icons.expand_less
                            : Icons.expand_more,
                        size: 16,
                        color: const Color(0xFF9CA3AF),
                      ),
                    ],
                  ),
                ),
                if (_sourcesExpanded)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Column(
                      children: sources
                          .asMap()
                          .entries
                          .map(
                            (entry) => Container(
                              margin: const EdgeInsets.symmetric(vertical: 2),
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 20,
                                    height: 20,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(
                                      Icons.public,
                                      size: 14,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      (entry.value['title'] ??
                                              entry.value['uri'] ??
                                              '')
                                          .toString(),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF111827),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    if (widget.onCopy == null &&
        widget.onRegenerate == null &&
        widget.onTranslate == null &&
        widget.onPlayTts == null) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.onCopy != null)
            IconButton(
              icon: const Icon(Icons.copy, size: 16),
              splashRadius: 16,
              onPressed: widget.onCopy,
            ),
          if (widget.onRegenerate != null)
            IconButton(
              icon: const Icon(Icons.refresh, size: 16),
              splashRadius: 16,
              onPressed: widget.onRegenerate,
            ),
          if (widget.onTranslate != null)
            IconButton(
              icon: widget.isTranslating
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.translate, size: 16),
              splashRadius: 16,
              onPressed: widget.isTranslating ? null : widget.onTranslate,
            ),
          if (widget.onPlayTts != null)
            IconButton(
              icon: widget.isTtsLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      widget.isPlaying ? Icons.stop : Icons.volume_up,
                      size: 16,
                    ),
              splashRadius: 16,
              onPressed: widget.onPlayTts,
            ),
        ],
      ),
    );
  }
}

