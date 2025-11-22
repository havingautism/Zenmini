import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter/services.dart';
import 'package:highlight/highlight.dart' as hl;
import 'package:markdown/markdown.dart' as md;
import 'package:url_launcher/url_launcher.dart';

class MarkdownRenderer extends StatelessWidget {
  const MarkdownRenderer({
    super.key,
    required this.content,
    this.groundingMetadata,
  });

  final String content;
  final Map<String, dynamic>? groundingMetadata;

  @override
  Widget build(BuildContext context) {
    final processed = _injectCitations(content, groundingMetadata);

    return MarkdownBody(
      data: processed,
      selectable: false,
      styleSheet: _buildStyleSheet(context),
      onTapLink: (text, href, title) {
        if (href == null) return;
        launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
      },
      builders: {
        'code': CodeElementBuilder(),
      },
      softLineBreak: true,
    );
  }

  MarkdownStyleSheet _buildStyleSheet(BuildContext context) {
    final base = MarkdownStyleSheet.fromTheme(Theme.of(context));
    const baseColor = Color(0xFF111827);

    return base.copyWith(
      p: const TextStyle(
        fontSize: 15,
        height: 1.7,
        color: baseColor,
      ),
      h1: const TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: baseColor,
      ),
      h2: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: baseColor,
      ),
      h3: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: baseColor,
      ),
      strong: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: baseColor,
      ),
      em: const TextStyle(
        fontSize: 15,
        fontStyle: FontStyle.italic,
        color: baseColor,
      ),
      code: const TextStyle(
        fontSize: 13,
        height: 1.6,
        fontFamily: 'monospace',
        color: baseColor,
        backgroundColor: Color(0xFFF3F4F6),
      ),
      codeblockDecoration: BoxDecoration(
        color: const Color(0xFF020617),
        borderRadius: BorderRadius.circular(8),
      ),
      blockquoteDecoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: const Color(0xFFBFDBFE),
        ),
      ),
      blockquote: const TextStyle(
        fontSize: 14,
        fontStyle: FontStyle.italic,
        color: baseColor,
      ),
      a: const TextStyle(
        fontSize: 15,
        color: Color(0xFF2563EB),
        decoration: TextDecoration.underline,
      ),
    );
  }

  String _injectCitations(
    String text,
    Map<String, dynamic>? groundingMetadata,
  ) {
    if (groundingMetadata == null) return text;
    final supports = groundingMetadata['groundingSupports'];
    if (supports is! List) return text;

    var result = text;

    final sortedSupports = List<Map<String, dynamic>>.from(
      supports.cast<Map<String, dynamic>>(),
    )..sort(
        (a, b) =>
            (b['segment']?['text']?.length ?? 0) -
            (a['segment']?['text']?.length ?? 0),
      );

    for (final support in sortedSupports) {
      final segmentText = support['segment']?['text'] as String?;
      final indices = support['groundingChunkIndices'] as List<dynamic>?;
      if (segmentText == null || indices == null || indices.isEmpty) continue;

      final citation = indices
          .map((i) => '^[${(i as int) + 1}]')
          .join('');

      final idx = result.indexOf(segmentText);
      if (idx != -1) {
        final insertPos = idx + segmentText.length;
        result =
            result.substring(0, insertPos) + citation + result.substring(insertPos);
      }
    }

    return result;
  }
}

class CodeElementBuilder extends MarkdownElementBuilder {
  @override
  Widget? visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    final text = element.textContent;
    // 通过是否包含换行来粗略判断是否是代码块
    final isBlock = text.contains('\n');

    if (!isBlock) {
      // inline code
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontFamily: 'monospace',
            color: Color(0xFF111827),
          ),
        ),
      );
    }

    final classAttr = element.attributes['class'] ?? '';
    String language = 'text';
    if (classAttr.startsWith('language-')) {
      language = classAttr.substring('language-'.length);
    }

    final highlighted = _highlight(text, language);

    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF020617),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF020617),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Text(
                  language.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints.tightFor(
                    width: 24,
                    height: 24,
                  ),
                  icon: const Icon(
                    Icons.copy,
                    size: 14,
                    color: Color(0xFFD1D5DB),
                  ),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: text));
                  },
                ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 4, 10, 10),
              child: RichText(
                text: highlighted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  TextSpan _highlight(String source, String language) {
    try {
      final result = hl.highlight.parse(source, language: language);
      return TextSpan(
        style: const TextStyle(
          fontFamily: 'monospace',
          fontSize: 13,
          color: Color(0xFFE5E7EB),
        ),
        children: result.nodes?.map(_convert).toList(),
      );
    } catch (_) {
      return TextSpan(
        text: source,
        style: const TextStyle(
          fontFamily: 'monospace',
          fontSize: 13,
          color: Color(0xFFE5E7EB),
        ),
      );
    }
  }

  TextSpan _convert(hl.Node node) {
    final style = _styleFor(node.className);
    if (node.value != null) {
      return TextSpan(text: node.value, style: style);
    }
    return TextSpan(
      children: node.children?.map(_convert).toList(),
      style: style,
    );
  }

  TextStyle _styleFor(String? className) {
    const base = TextStyle(
      fontFamily: 'monospace',
      fontSize: 13,
      color: Color(0xFFE5E7EB),
    );
    if (className == null) return base;
    if (className.contains('keyword')) {
      return base.copyWith(color: const Color(0xFF60A5FA));
    }
    if (className.contains('string') || className.contains('meta')) {
      return base.copyWith(color: const Color(0xFFFBBF24));
    }
    if (className.contains('comment')) {
      return base.copyWith(color: const Color(0xFF6B7280), fontStyle: FontStyle.italic);
    }
    if (className.contains('number') || className.contains('literal')) {
      return base.copyWith(color: const Color(0xFF34D399));
    }
    return base;
  }
}
