import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github.css'
import { Copy, Check } from 'lucide-react'

export default function MarkdownRenderer({ content, groundingMetadata, className = '' }) {
  const [copiedCode, setCopiedCode] = React.useState(false)

  // Process content to inject inline citations if grounding metadata exists
  const processedContent = React.useMemo(() => {
    if (!groundingMetadata || !groundingMetadata.groundingSupports) {
      return content;
    }

    let text = content;
    
    // Sort supports by text length in descending order to avoid partial matches
    const supports = [...groundingMetadata.groundingSupports].sort(
      (a, b) => (b.segment?.text?.length ?? 0) - (a.segment?.text?.length ?? 0)
    );

    supports.forEach((support) => {
      const segmentText = support.segment?.text;
      const indices = support.groundingChunkIndices;

      if (!segmentText || !indices?.length) {
        return;
      }
      
      // Construct citation as superscript
      const citationLinks = indices
        .map((i) => `<sup><a href="#source-${i}" class="citation-link">[${i + 1}]</a></sup>`)
        .join("");
      
      // Find the text segment and append citations after it
      const segmentIndex = text.indexOf(segmentText);
      if (segmentIndex !== -1) {
        const insertPosition = segmentIndex + segmentText.length;
        text = text.slice(0, insertPosition) + citationLinks + text.slice(insertPosition);
      }
    });

    return text;
  }, [content, groundingMetadata]);

  const handleCopyCode = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <>
      <style>{`
        .citation-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.7em;
          font-weight: 600;
          margin: 0 1px;
          padding: 1px 3px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 3px;
          transition: all 0.2s ease;
          display: inline-block;
          line-height: 1.2;
        }
        .citation-link:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #93c5fd;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
        }
        sup {
          line-height: 0;
          vertical-align: super;
          font-size: 0.75em;
        }
      `}</style>
      <div className={`markdown-content text-sm ${className} prose prose-sm max-w-none`}>
        <ReactMarkdown
          children={processedContent}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900 border-b border-gray-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-900 flex items-center">
              <span className="w-1 h-5 bg-blue-500 mr-2 rounded" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-900 flex items-center">
              <span className="w-1 h-4 bg-black mr-2 rounded" />
              {children}
            </h3>
          ),

          p: ({ children }) => (
            <p className="mb-3 text-gray-800 leading-relaxed text-[15px]">
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1.5 text-[15px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 text-gray-800 space-y-1.5 text-[15px]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-gray-700">{children}</li>
          ),

          // 代码样式
          code: ({ inline, children, className }) => {
            if (inline) {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono text-gray-800">
                  {children}
                </code>
              )
            }

            const language = className?.replace('language-', '') || 'text'
            const codeText =
              typeof children === 'string'
                ? children
                : children?.props?.children || ''

            const isPlainText =
              language === 'text' || language === 'plain' || !className

            // text 类型代码块：自适应宽度，融入正文
            if (isPlainText) {
              return (
                <code className="bg-gray-50 px-1.5 py-0.5 rounded text-[13px] font-mono text-gray-800 whitespace-pre-wrap break-words inline-block max-w-full">
                  {children}
                </code>
              )
            }

            // 带语言的代码块：顶部窄色条 + 复制
            return (
              <div className="relative mb-4 group">
                <div className="flex items-center justify-between bg-gray-900 text-gray-100 px-3 py-1.5 text-[11px] font-medium rounded-t-md">
                  <span className="uppercase tracking-wide opacity-80">
                    {language}
                  </span>
                  <button
                    onClick={() => handleCopyCode(codeText)}
                    className="copy-button flex items-center space-x-1 px-2 py-0.5 text-[11px] bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={12} />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto bg-gray-950 text-gray-100 rounded-b-md">
                  <code className={`hljs ${className} block p-3 text-[13px] leading-relaxed font-mono whitespace-pre`}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },

          pre: ({ children }) => <>{children}</>,

          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-gray-50 pl-4 py-3 my-4 rounded-r-md border border-gray-200">
              <div className="text-gray-700 italic">{children}</div>
            </blockquote>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 p-[1px] hover:text-blue-700 hover:underline decoration-2 transition-all duration-200 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">{children}</em>
          ),

          hr: () => (
            <hr className="my-6 border-0 border-t border-gray-200" />
          ),

          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 border-b border-gray-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-4 py-3 text-gray-800 align-top">
              {children}
            </td>
          ),

          input: ({ type, checked }) => (
            <input
              type={type}
              checked={checked}
              className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              readOnly
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
    </>
  )
}

