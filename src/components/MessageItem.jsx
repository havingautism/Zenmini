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
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

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
                  <div className="mt-2 flex items-center space-x-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: "0s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-0.5">
                    <span
                      className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0s" }}
                    />
                    <span
                      className="w-1 h-1 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-1 h-1 rounded-full bg-gray-200 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              )
            ) : isUser ? (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            ) : (
              <MarkdownRenderer content={msg.content} />
            )}

            {translatedText && (
              <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
                <p className="text-sm italic opacity-80 whitespace-pre-wrap break-words">
                  <MarkdownRenderer content={translatedText} />
                </p>
              </div>
            )}

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
                  <ul className="space-y-1 mt-2">
                    {msg.sources.map((source, index) => (
                      <li key={index} className="text-xs">
                        <a
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block hover:underline text-gray-700"
                          title={source.title}
                        >
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
