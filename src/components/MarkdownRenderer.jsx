import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Copy, Check } from 'lucide-react'

export default function MarkdownRenderer({ content, className = '' }) {
  const [copiedCode, setCopiedCode] = React.useState(false)

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className={`markdown-content text-sm ${className} prose prose-sm max-w-none`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 标题样式 - Kimi风格
          h1: ({children}) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900 border-b border-gray-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({children}) => (
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-900 flex items-center">
              <span className="w-1 h-5 bg-blue-500 mr-2 rounded"></span>
              {children}
            </h2>
          ),
          h3: ({children}) => (
            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-900 flex items-center">
              <span className="w-1 h-4 bg-blue-400 mr-2 rounded"></span>
              {children}
            </h3>
          ),
          h4: ({children}) => (
            <h4 className="text-base font-medium mb-2 mt-3 text-gray-900">{children}</h4>
          ),
          h5: ({children}) => (
            <h5 className="text-sm font-medium mb-2 mt-3 text-gray-900">{children}</h5>
          ),
          h6: ({children}) => (
            <h6 className="text-sm font-medium mb-2 mt-3 text-gray-600">{children}</h6>
          ),

          // 段落样式
          p: ({children}) => (
            <p className="mb-4 text-gray-800 leading-relaxed text-[15px]">
              {children}
            </p>
          ),

          // 列表样式
          ul: ({children}) => (
            <ul className="list-disc list-inside mb-4 text-gray-800 space-y-2 text-[15px]">
              {children}
            </ul>
          ),
          ol: ({children}) => (
            <ol className="list-decimal list-inside mb-4 text-gray-800 space-y-2 text-[15px]">
              {children}
            </ol>
          ),
          li: ({children}) => (
            <li className="leading-relaxed text-gray-700">{children}</li>
          ),

          // 代码样式 - 优化UX和UI
          code: ({inline, children, className}) => {
            if (inline) {
              return (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800 border border-gray-300">
                  {children}
                </code>
              )
            }

            const language = className?.replace('language-', '') || 'text'
            const codeText = typeof children === 'string' ? children : children?.props?.children || ''

            // 对于纯文本代码，不显示语言标签和复制按钮
            const isPlainText = language === 'text' || language === 'plain' || !className

            return (
              <div className="relative mb-3 group">
                {!isPlainText && (
                  <div className="flex items-center justify-between bg-gray-50 text-gray-600 px-4 py-2 text-xs font-medium border border-gray-200 border-b-0 rounded-t-md">
                    <span className="uppercase">{language}</span>
                    <button
                      onClick={() => handleCopyCode(codeText)}
                      className="copy-button flex items-center space-x-1 px-2 py-1 text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors"
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
                )}
                <div className={`${isPlainText ? 'border border-gray-200' : 'border border-gray-200 border-t-0'} rounded-b-md overflow-x-auto bg-white`}>
                  <code
                    className={`hljs ${className} block p-3 text-sm font-mono text-gray-800 ${isPlainText ? 'whitespace-pre' : 'whitespace-pre-wrap'}`}
                    style={{
                      width: isPlainText ? 'fit-content' : '100%',
                      display: isPlainText ? 'inline-block' : 'block',
                      maxWidth: isPlainText ? '100%' : 'none'
                    }}
                  >
                    {children}
                  </code>
                </div>
              </div>
            )
          },

          pre: ({children}) => <>{children}</>,

          // 引用样式 - 浅色主题优化
          blockquote: ({children}) => (
            <blockquote className="border-l-4 border-blue-500 bg-gray-50 pl-4 py-3 my-4 rounded-r-md border border-gray-200">
              <div className="text-gray-700 italic">{children}</div>
            </blockquote>
          ),

          // 链接样式
          a: ({href, children}) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-700 hover:underline decoration-2 transition-all duration-200 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // 文本格式
          strong: ({children}) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({children}) => (
            <em className="italic text-gray-800">{children}</em>
          ),

          // 分割线
          hr: () => (
            <hr className="my-6 border-0 border-t border-gray-200" />
          ),

          // 表格样式 - 浅色主题优化
          table: ({children}) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-gray-300 bg-white">
              <table className="min-w-full">{children}</table>
            </div>
          ),
          thead: ({children}) => (
            <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
          ),
          tbody: ({children}) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
          tr: ({children}) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
          th: ({children}) => (
            <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 bg-gray-50">
              {children}
            </th>
          ),
          td: ({children}) => (
            <td className="border border-gray-200 px-4 py-3 text-gray-800 align-top">{children}</td>
          ),

          // 任务列表
          input: ({type, checked}) => (
            <input
              type={type}
              checked={checked}
              className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              readOnly
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}