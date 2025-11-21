import React, { useEffect, useState } from "react";
import {
  Brain,
  Globe,
  ChevronDown,
  Languages,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Volume2,
  StopCircle,
  Search,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

import Loader from "./Loader";

const THINKING_PHASES = [
  "正在理解你的问题…",
  "正在规划思考路径…",
  "正在检索和比对相关信息…",
  "正在组织更清晰的回答…",
];

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
  const isUser = msg.role === "user";
  const areSourcesVisible = expandedSourcesMessageId === msg.id;
  const [isThinkingVisible, setIsThinkingVisible] = useState(false);
  const [thinkingPhaseIndex, setThinkingPhaseIndex] = useState(0);

  const isLoadingBubble = !isUser && msg.isLoading && !msg.content;
  const isThinkingLoading =
    isLoadingBubble && Boolean(msg.generatedWithThinking);

  useEffect(() => {
    if (!isThinkingLoading) return;

    const timer = setInterval(
      () =>
        setThinkingPhaseIndex((prev) => (prev + 1) % THINKING_PHASES.length),
      1600
    );

    return () => clearInterval(timer);
  }, [isThinkingLoading]);

  const botBubbleClass =
    "bg-bubble-bot text-gray-900 rounded-3xl rounded-bl-sm border border-[#ece4da]";

  return (
    <div className="flex justify-center">
      <div
        className={`flex w-full max-w-3xl px-3 sm:px-4 ${
          isUser ? "justify-end" : "justify-start"
        } mt-1 mb-1`}
      >
        <div
          className={`flex flex-col max-w-[100%] sm:max-w-[80%] shadow-soft-card ${
            isUser
              ? "bg-bubble-user text-white rounded-3xl rounded-br-sm"
              : botBubbleClass
          }`}
        >
          {msg.thinkingProcess && (
            <button
              onClick={() => setIsThinkingVisible((prev) => !prev)}
              className={`flex items-center text-[11px] sm:text-xs font-semibold w-full px-4 py-2 text-left ${
                isUser ? "text-indigo-100" : "text-gray-600"
              } ${
                isThinkingVisible
                  ? "bg-[#f3ebe2] rounded-t-3xl"
                  : "bg-transparent rounded-t-3xl"
              }`}
            >
              <ChevronDown
                size={16}
                className={`mr-2 transition-transform ${
                  isThinkingVisible ? "rotate-180" : ""
                }`}
              />
              Thinking completed
            </button>
          )}

          {msg.thinkingProcess && (
            <div
              className={`px-4 pt-2 ${isThinkingVisible ? "block" : "hidden"}`}
            >
              <p className="whitespace-pre-wrap break-words italic text-gray-500 pb-2 border-b border-gray-200 text-[13px] sm:text-[14px]">
                <MarkdownRenderer content={msg.thinkingProcess} />
              </p>
            </div>
          )}

          <div className="px-4 pt-3 pb-3 sm:pt-4 sm:pb-4 text-[14px] sm:text-[15px] leading-relaxed">
            {isLoadingBubble ? (
              isThinkingLoading ? (
                <div className="flex flex-col space-y-1">
                  
                  <span className="text-sm text-gray-700 mt-0.5">
                    {THINKING_PHASES[thinkingPhaseIndex]}
                  </span>
                  <div >
                   <Loader />
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                   <div >
                   <Loader />
                  </div>
                </div>
              )
            ) : isUser ? (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            ) : (
              <MarkdownRenderer content={msg.content} groundingMetadata={msg.grounding_metadata} />
            )}

            {translatedText && (
              <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
                <p className="text-sm italic opacity-80 whitespace-pre-wrap break-words">
                  <MarkdownRenderer content={translatedText} />
                </p>
              </div>
            )}

            {/* {msg.groundingMetadata?.searchEntryPoint?.renderedContent && (
               <div
                 className="mt-4 mb-2"
                 dangerouslySetInnerHTML={{ __html: msg.groundingMetadata.searchEntryPoint.renderedContent }}
               />
            )} */}

            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#f0e6da]">
                <button
                  className="flex justify-between items-center w-full text-xs font-semibold mb-1 opacity-80"
                  onClick={() =>
                    setExpandedSourcesMessageId(
                      areSourcesVisible ? null : msg.id
                    )
                  }
                >
                  <span className="flex items-center">
                    <Globe size={14} className="mr-1" />
                    参考来源 ({msg.sources.length})
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      areSourcesVisible ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {areSourcesVisible && (
                  <div className="mt-3">
                    {msg.groundingMetadata?.webSearchQueries && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.groundingMetadata.webSearchQueries.map((query, i) => (
                          <div key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center">
                            <Search size={10} className="mr-1" />
                            {query}
                          </div>
                        ))}
                      </div>
                    )}
                    <ul className="space-y-2">
                    {msg.sources.map((source, index) => {
                      const domain = (() => {
                        try {
                          return new URL(source.uri).hostname;
                        } catch {
                          return "";
                        }
                      })();
                      const faviconUrl = domain
                        ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                        : null;

                      return (
                        <li key={index} id={`source-${index}`} className="text-xs bg-[#fcfcfc] border border-gray-100 rounded-xl p-2 hover:bg-gray-50 transition-colors scroll-mt-20">
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 group"
                            title={source.title}
                          >
                            <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-sm overflow-hidden bg-gray-100 flex items-center justify-center">
                              {faviconUrl ? (
                                <img
                                  src={faviconUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className="hidden w-full h-full items-center justify-center bg-gray-100 text-gray-400"
                                style={{ display: faviconUrl ? "none" : "flex" }}
                              >
                                <Globe size={10} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                {source.title || "未命名来源"}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {domain || source.uri}
                              </div>
                            </div>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isUser && (
            <div className="mt-auto pt-2 px-4 pb-2 border-t border-gray-100 flex items-center justify-between space-x-1 text-[12px] sm:text-[13px]">
              <div className="flex items-center space-x-3">
                {msg.generatedWithThinking && (
                  <div
                    className="flex items-center opacity-70"
                    title="此消息由 Thinking 模式生成"
                  >
                    <Brain size={14} className="mr-1 text-gray-500" />
                  </div>
                )}
                {msg.generatedWithSearch && (
                  <div
                    className="flex items-center opacity-70"
                    title="此消息使用联网搜索"
                  >
                    <Globe size={14} className="mr-1 text-gray-500" />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1">
                {copiedMessageId === msg.id ? (
                  <Check size={22} className="text-green-500 p-1.5" />
                ) : (
                  <button
                    onClick={() => onCopy(msg.content, msg.id)}
                    className="p-1.5 rounded-full bg-[#f3ebe2] hover:bg-[#ece1d6] text-gray-800 transition-colors"
                    title="复制"
                  >
                    <Copy size={16} />
                  </button>
                )}

                {isLastModelMessage && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-full bg-[#f3ebe2] hover:bg-[#ece1d6] text-gray-800 transition-colors"
                    title="重新生成"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}

                {isTtsLoading === msg.id ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-gray-400 p-1.5"
                  />
                ) : playingMessageId === msg.id ||
                  (playingMessageId === "auto-play" &&
                    isLastMessage &&
                    msg.role === "model") ? (
                  <button
                    onClick={onStopAudio}
                    className="p-1.5 rounded-full bg-[#f3ebe2] hover:bg-[#ece1d6] text-gray-800 transition-colors"
                    title="停止播放"
                  >
                    <StopCircle size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => onPlayAudio(msg)}
                    className="p-1.5 rounded-full bg-[#f3ebe2] hover:bg-[#ece1d6] text-gray-800 transition-colors"
                    title="播放语音"
                  >
                    <Volume2 size={16} />
                  </button>
                )}

                {isTranslating ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-gray-400 p-1.5"
                  />
                ) : (
                  <button
                    onClick={() => onTranslate(msg)}
                    className="p-1.5 rounded-full bg-[#f3ebe2] hover:bg-[#ece1d6] text-gray-800 transition-colors"
                    title={translatedText ? "隐藏翻译" : "翻译"}
                  >
                    <Languages size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
