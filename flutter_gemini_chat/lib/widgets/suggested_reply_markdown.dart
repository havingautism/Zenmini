import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

class SuggestedReplyMarkdown extends StatelessWidget {
  const SuggestedReplyMarkdown({super.key, required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: content,
      softLineBreak: true,
      styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
        p: const TextStyle(
          fontSize: 12,
          height: 1.4,
          color: Color(0xFF3730A3),
        ),
        strong: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF111827),
        ),
        em: const TextStyle(
          fontSize: 12,
          fontStyle: FontStyle.italic,
          color: Color(0xFF3730A3),
        ),
        code: const TextStyle(
          fontSize: 11,
          fontFamily: 'monospace',
          color: Color(0xFF1E3A8A),
          backgroundColor: Color(0xFFE0E7FF),
        ),
      ),
      builders: const {},
    );
  }
}

