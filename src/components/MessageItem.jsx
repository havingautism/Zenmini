import React, { useState } from 'react'
import { Brain, Globe, ChevronDown, Languages, RefreshCw, Copy, Check, Loader2, Volume2, StopCircle } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

export default function MessageItem({
  msg,
  isTtsLoading,
  playingMessageId,
  onPlayAudio,
  onStopAudio,
  onTranslate,
  isTranslating,
  translatedText,
  expandedSourcesMessageId,
  setExpandedSourcesMessageId,
  isLastMessage,
  onCopy,
  copiedMessageId,
  onRegenerate,
  isLastModelMessage,
}) {
  const isUser = msg.role === 'user'
  const areSourcesVisible = expandedSourcesMessageId === msg.id
  const [isThinkingVisible, setIsThinkingVisible] = useState(false)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-xl shadow-md ${isUser ? 'bg-indigo-600 text-white rounded-xl rounded-br-none' : 'bg-white text-gray-800 rounded-xl rounded-bl-none border border-gray-200'}`}>
        {msg.thinkingProcess && (
          <button
            onClick={() => setIsThinkingVisible((prev) => !prev)}
            className={`flex items-center text-xs font-semibold w-full p-2 text-left ${isUser ? 'text-indigo-2 00' : 'text-indigo-600'} ${isThinkingVisible ? 'bg-gray-50 rounded-t-xl' : 'bg-transparent rounded-t-xl'}`}
          >
            <ChevronDown size={16} className={`mr-2 transition-transform ${isThinkingVisible ? 'rotate-180' : ''}`} />
            Thinking completed
          </button>
        )}

        {msg.thinkingProcess && (
          <div className={`px-4 pt-2 ${isThinkingVisible ? 'block' : 'hidden'}`}>
            <p className="whitespace-pre-wrap break-words italic text-gray-500 pb-2 border-b border-gray-200">{msg.thinkingProcess}</p>
          </div>
        )}

        <div className="px-4 pt-4 pb-4">
          {msg.isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-gray-500">BeeBot 正在思考中...</span>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : (
            <MarkdownRenderer content={msg.content} />
          )}

          {translatedText && (
            <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
              <p className="text-sm italic opacity-80 whitespace-pre-wrap break-words">{translatedText}</p>
            </div>
          )}

          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-indigo-200">
              <button className="flex justify-between items-center w-full text-xs font-semibold mb-1 opacity-80" onClick={() => setExpandedSourcesMessageId(areSourcesVisible ? null : msg.id)}>
                <span className="flex items-center">
                  <Globe size={14} className="mr-1" />参考来源 ({msg.sources.length})
                </span>
                <ChevronDown size={16} className={`transition-transform ${areSourcesVisible ? 'rotate-180' : ''}`} />
              </button>
              {areSourcesVisible && (
                <ul className="space-y-1 mt-2">
                  {msg.sources.map((source, index) => (
                    <li key={index} className="text-xs">
                      <a href={source.uri} target="_blank" rel="noopener noreferrer" className={`truncate block hover:underline ${isUser ? 'text-blue-200' : 'text-indigo-500'}`} title={source.title}>
                        {index + 1}. {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="mt-auto pt-2 px-4 pb-2 border-t border-gray-100 flex items-center justify-between space-x-1">
            <div className="flex items-center space-x-3">
              {msg.generatedWithThinking && (
                <div className="flex items-center text-xs opacity-60" title="此消息由深度思考模式 (Gemini Pro) 生成">
                  <Brain size={14} className="mr-1 text-indigo-400" />
                  <span className="text-indigo-600 text-xs">深度思考</span>
                </div>
              )}
              {msg.generatedWithSearch && (
                <div className="flex items-center text-xs opacity-60" title="此消息已联网搜索">
                  <Globe size={14} className="mr-1 text-indigo-400" />
                  <span className="text-indigo-600 text-xs">已联网</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {copiedMessageId === msg.id ? (
                <Check size={18} className="text-green-500 p-1.5" />
              ) : (
                <button onClick={() => onCopy(msg.content, msg.id)} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="复制">
                  <Copy size={16} />
                </button>
              )}

              {isLastModelMessage && (
                <button onClick={onRegenerate} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="重新生成">
                  <RefreshCw size={16} />
                </button>
              )}

              {isTtsLoading === msg.id ? (
                <Loader2 size={18} className="animate-spin text-gray-400 p-1.5" />
              ) : (playingMessageId === msg.id || (playingMessageId === 'auto-play' && isLastMessage && msg.role === 'model')) ? (
                <button onClick={onStopAudio} className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors" title="停止播放">
                  <StopCircle size={16} />
                </button>
              ) : (
                <button onClick={() => onPlayAudio(msg)} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="播放语音">
                  <Volume2 size={16} />
                </button>
              )}

              {isTranslating ? (
                <Loader2 size={18} className="animate-spin text-gray-400 p-1.5" />
              ) : (
                <button onClick={() => onTranslate(msg)} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title={translatedText ? '隐藏翻译' : '翻译 (中/英)'}>
                  <Languages size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

