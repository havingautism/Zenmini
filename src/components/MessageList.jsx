import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, User, Loader2, Brain, Search } from 'lucide-react';

export default function MessageList({ messages, messagesEndRef }) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
              ${isUser ? 'bg-gradient-to-br from-primary to-primary-hover text-white' : 'bg-white border border-border text-primary'}
            `}>
              {isUser ? <User size={20} /> : <Bot size={20} />}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
              
              {/* Thinking Process (if available) */}
              {!isUser && msg.thinkingProcess && (
                <div className="bg-surface border border-border rounded-xl p-3 text-xs text-text-muted mb-1 w-full">
                  <div className="flex items-center gap-2 font-medium mb-1 text-primary">
                    <Brain size={12} />
                    <span>Thinking Process</span>
                  </div>
                  <div className="opacity-80 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                    {msg.thinkingProcess}
                  </div>
                </div>
              )}

              {/* Main Bubble */}
              <div className={`
                px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed
                ${isUser 
                  ? 'bg-primary text-white rounded-tr-sm' 
                  : 'bg-white border border-border text-text-main rounded-tl-sm'
                }
              `}>
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  msg.content ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-2 text-text-muted italic">
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </div>
                  )
                )}
              </div>

              {/* Sources (if available) */}
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.sources.map((source, idx) => (
                    <a 
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs bg-surface border border-border px-2 py-1 rounded-lg text-text-muted hover:text-primary hover:border-primary transition-colors"
                    >
                      <Search size={10} />
                      <span className="truncate max-w-[150px]">{source.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
