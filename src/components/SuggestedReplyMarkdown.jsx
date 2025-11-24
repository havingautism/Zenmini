import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 只用于延伸问题气泡的轻量级 Markdown 渲染
// 主要支持：粗体 / 斜体 / 行内代码 / 链接，避免段落外边距和大段排版
export default function SuggestedReplyMarkdown({ content }) {
  return (
    <div className="text-xs text-black-800 leading-snug whitespace-nowrap break-keep">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          strong: ({ children }) => (
            <strong className="font-semibold text-black-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-black-800">{children}</em>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-black-100/80 text-[11px] font-mono text-black-900">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 decoration-black-400 hover:text-black-700"
            >
              {children}
            </a>
          ),
          // 把列表、标题等都压成行内，避免破坏气泡形状
          ul: ({ children }) => <span>{children}</span>,
          ol: ({ children }) => <span>{children}</span>,
          li: ({ children }) => <span>{children}</span>,
          h1: ({ children }) => <span>{children}</span>,
          h2: ({ children }) => <span>{children}</span>,
          h3: ({ children }) => <span>{children}</span>,
          blockquote: ({ children }) => <span>{children}</span>,
          hr: () => null,
          table: ({ children }) => <span>{children}</span>,
          thead: ({ children }) => <span>{children}</span>,
          tbody: ({ children }) => <span>{children}</span>,
          tr: ({ children }) => <span>{children}</span>,
          th: ({ children }) => <span>{children}</span>,
          td: ({ children }) => <span>{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
