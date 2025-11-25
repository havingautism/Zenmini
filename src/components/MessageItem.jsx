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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import SuggestedReplyMarkdown from "./SuggestedReplyMarkdown";
import { FaGoogle } from "react-icons/fa";
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
  suggestedReplies,
  onSuggestedReplyClick,
}) {
  const isUser = msg.role === "user";
  const areSourcesVisible = expandedSourcesMessageId === msg.id;
  const [isThinkingVisible, setIsThinkingVisible] = useState(false);
  const [thinkingPhaseIndex, setThinkingPhaseIndex] = useState(0);
  const suggestedRepliesRef = React.useRef(null);
  const [showSuggestionsLeftHint, setShowSuggestionsLeftHint] = useState(false);
  const [showSuggestionsRightHint, setShowSuggestionsRightHint] = useState(false);

  // Handle suggested replies scroll hint
  useEffect(() => {
    const el = suggestedRepliesRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowSuggestionsLeftHint(el.scrollLeft > 0);
      setShowSuggestionsRightHint(
        el.scrollLeft < el.scrollWidth - el.clientWidth - 5
      );
    };

    handleScroll(); // Initial check
    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [suggestedReplies]);

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
    "bg-transparent text-accent w-full ";

  return (
    <div className="flex justify-center">
      <div
        className={`flex w-full max-w-3xl px-4 sm:px-8 ${
          isUser ? "justify-end" : "justify-start"
        } mt-1 mb-1`}
      >
        <div
          className={`flex flex-col max-w-[100%] sm:max-w-[80%] ${
            isUser
              ? "shadow-soft-card bg-bubble-user text-bubble-text-user rounded-3xl rounded-br-sm"
              : botBubbleClass
          }`}
        >
          {msg.thinkingProcess && (
            <button
              onClick={() => setIsThinkingVisible((prev) => !prev)}
              className={`flex items-center text-[11px] sm:text-xs font-semibold w-full px-4 py-2 text-left ${
                isUser ? "text-bubble-text-user/80" : "text-accent-subtle"
              } ${
                isThinkingVisible
                  ? "bg-shell rounded-t-3xl"
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
              <p className="italic text-accent-subtle pb-2 border-b border-border text-[13px] sm:text-[14px]">
                <MarkdownRenderer content={msg.thinkingProcess} />
              </p>
            </div>
          )}

          <div className="px-4 pt-3 pb-3 sm:pt-4 sm:pb-4 text-[14px] sm:text-[15px] leading-relaxed">
            {isLoadingBubble ? (
              isThinkingLoading ? (
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-accent-subtle mt-0.5">
                    {THINKING_PHASES[thinkingPhaseIndex]}
                  </span>
                  <div>
                    <Loader />
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-accent-subtle">
                  <div>
                    <Loader />
                  </div>
                </div>
              )
            ) : isUser ? (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            ) : (
              <MarkdownRenderer
                content={msg.content}
                groundingMetadata={
                  msg.groundingMetadata || msg.grounding_metadata
                }
              />
            )}

            {translatedText && (
              <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
                <p className="text-sm italic ">
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
              <div className="mt-5 pt-4 border-t border-border">
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
                    {msg.grounding_metadata?.webSearchQueries && (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <FaGoogle size={14} className="mr-1" />
                        {msg.grounding_metadata.webSearchQueries.map(
                          (query, i) => (
                            <div
                              key={i}
                              className="text-[10px] bg-shell text-accent-subtle px-2 py-1 rounded-full flex items-center"
                            >
                              <Search size={10} className="mr-1" />
                              {query}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {msg.sources.map((source, index) => (
                        <li
                          key={index}
                          id={`source-${index}`}
                          className="text-xs bg-surface border border-border rounded-xl p-2 hover:bg-shell transition-colors scroll-mt-20"
                        >
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 group"
                            title={source.title}
                          >
                            {/* 统一的互联网图标 */}
                            <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-shell flex items-center justify-center text-accent-subtle">
                              <Globe size={14} />
                            </div>

                            {/* 只显示标题，不显示 URL / 域名 */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-accent truncate group-hover:text-blue-600 transition-colors">
                                {source.title || "未命名来源"}
                              </div>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Suggested Replies (Only for last model message) */}
            {isLastModelMessage && suggestedReplies && suggestedReplies.length > 0 && (
              <div className="mt-5 pt-2 border-t border-border">
                <div className="relative mb-2">
                  <div
                    ref={suggestedRepliesRef}
                    className="flex items-center gap-2 overflow-x-auto flex-nowrap pt-2 [&::-webkit-scrollbar]:hidden"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {suggestedReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => onSuggestedReplyClick(reply)}
                        className="px-3 py-2 rounded-3xl bg-shell text-[13px] border border-border text-accent hover:bg-surface transition-colors whitespace-nowrap"
                      >
                        <SuggestedReplyMarkdown content={reply} />
                      </button>
                    ))}
                  </div>
                  {showSuggestionsLeftHint && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface via-surface/80 to-transparent rounded-l-3xl flex items-center pl-1 text-accent-subtle">
                      <ChevronLeft size={14} />
                    </div>
                  )}
                  {showSuggestionsRightHint && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface via-surface/80 to-transparent rounded-r-3xl flex items-center justify-end pr-1 text-accent-subtle">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isUser && !isLoadingBubble && !isThinkingLoading && (
            <div className="mt-auto pt-2 px-4 pb-2 border-t border-border flex items-center justify-between space-x-1 text-[12px] sm:text-[13px]">
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
                    className="p-1.5 rounded-full bg-surface hover:bg-shell text-accent transition-colors"
                    title="复制"
                  >
                    <Copy size={16} />
                  </button>
                )}

                {isLastModelMessage && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-full bg-surface hover:bg-shell text-accent transition-colors"
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
                    className="p-1.5 rounded-full bg-surface hover:bg-shell text-accent transition-colors"
                    title="停止播放"
                  >
                    <StopCircle size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => onPlayAudio(msg)}
                    className="p-1.5 rounded-full bg-surface hover:bg-shell text-accent transition-colors"
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
                    className="p-1.5 rounded-full bg-surface hover:bg-shell text-accent transition-colors"
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
