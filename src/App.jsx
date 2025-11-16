import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import "./styles/markdown.css";
import {
  Bot,
  User,
  MessageSquarePlus,
  Loader2,
  Sparkles,
  Share2,
  ArrowUp,
  Search,
  Home,
  LayoutGrid,
  Book,
  History,
  Plus,
  File,
  Image,
  Video,
  Mic,
  Brain,
  Globe,
  SlidersHorizontal,
  ChevronsUpDown,
} from "lucide-react";

import {
  callGeminiApi,
  callGeminiForStructuredJson,
  callGeminiForTranslation,
  callGeminiTtsApi,
} from "./services/api";
import { GoogleGenAI } from "@google/genai/web";
import { base64ToArrayBuffer, pcmToWav } from "./services/audio";
import {
  EMPTY_SB_CONFIG,
  initSupabase,
  loadSupabaseConfigFromEnv,
  loadSupabaseConfigFromLocalStorage,
  getOrCreateClientId,
} from "./services/supabase";
import { initSchemaIfFirstUse } from "./services/schema";
import {
  subscribeSessions,
  subscribeMessages,
  createSession,
  addUserMessage,
  addModelMessage,
  deleteMessages,
} from "./services/chat";

import MessageItem from "./components/MessageItem";
import SummaryModal from "./components/SummaryModal";
import SettingsModal from "./components/SettingsModal";
import SchemaInitModal from "./components/SchemaInitModal";

export default function App() {
  const [client, setClient] = useState(null);
  const [isConfigMissing, setIsConfigMissing] = useState(false);
  const [appId, setAppId] = useState("default-app-id");

  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [suggestedReplies, setSuggestedReplies] = useState([]);

  const [isTtsLoading, setIsTtsLoading] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash"); // 默认选择flash
  const [isThinkingMode, setIsThinkingMode] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [localSbConfig, setLocalSbConfig] = useState(EMPTY_SB_CONFIG);
  const [needsSchemaInit, setNeedsSchemaInit] = useState(false);
  const [schemaSql, setSchemaSql] = useState("");

  const [isAutoPlayTts, setIsAutoPlayTts] = useState(false);
  const [expandedSourcesMessageId, setExpandedSourcesMessageId] =
    useState(null);
  const [isTranslatingId, setIsTranslatingId] = useState(null);
  const [translations, setTranslations] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const messagesEndRef = useRef(null);

  // 初始化 Supabase
  const initApp = async (cid) => {
    let configToUse = loadSupabaseConfigFromLocalStorage();
    if (!configToUse) configToUse = loadSupabaseConfigFromEnv();
    if (configToUse) setLocalSbConfig(configToUse);
    if (configToUse && configToUse.url && configToUse.anonKey) {
      try {
        const { client } = initSupabase(configToUse, cid);
        setClient(client);
        setIsConfigMissing(false);
        await initSchemaIfFirstUse(client, setNeedsSchemaInit, setSchemaSql);
        return client;
      } catch (e) {
        console.error("Supabase initialization error:", e);
        setIsConfigMissing(true);
        setClient(null);
        return null;
      }
    } else {
      setIsConfigMissing(true);
      setClient(null);
      return null;
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestedReplies, isLoading]);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("userApiKey");
      if (storedKey) setUserApiKey(storedKey);
    } catch {}

    const autoInitAndSignIn = async () => {
      const cid = getOrCreateClientId();
      setUserId(cid);
      const cl = await initApp(cid);
      if (!cl) return;
      setIsAuthReady(true);
    };

    autoInitAndSignIn();
  }, []);

  // 会话列表监听
  useEffect(() => {
    const db = client;
    if (!isAuthReady || !db || !userId) return;
    const unsubscribe = subscribeSessions(
      db,
      appId,
      userId,
      (fetched) => {
        setSessions(fetched);
        if (!activeSessionId && fetched.length > 0)
          setActiveSessionId(fetched[0].id);
      },
      (e) => console.error("Error fetching sessions:", e)
    );
    return () => unsubscribe();
  }, [isAuthReady, userId, client, appId]);

  // 消息加载 - 只在页面初始加载或切换会话时获取历史消息
  const loadHistoryMessages = useCallback(
    async (sessionId) => {
      const db = client;
      if (!db || !userId || !sessionId || isSessionActive) return;

      try {
        const { data: fetched, error } = await db
          .from("messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading history messages:", error);
          return;
        }

        // 只在没有本地消息且会话不活跃时才加载历史消息
        if (fetched && messages.length === 0 && !isSessionActive) {
          // 映射数据库字段名到前端使用的字段名
          const mappedMessages = fetched.map((msg) => ({
            ...msg,
            // 处理思考过程字段映射
            thinkingProcess: msg.thinkingProcess || msg.thinking_process,
            // 处理其他字段映射
            generatedWithThinking:
              msg.generatedWithThinking || msg.generated_with_thinking,
            generatedWithSearch:
              msg.generatedWithSearch || msg.generated_with_search,
          }));

          setMessages(mappedMessages || []);

          // 检查最后一条消息是否有延伸问题，如果有则显示
          const lastMessage = mappedMessages[mappedMessages.length - 1];
          if (lastMessage && lastMessage.role === "model") {
            try {
              const replies = Array.isArray(lastMessage.suggested_replies)
                ? lastMessage.suggested_replies
                : Array.isArray(lastMessage.suggestedReplies)
                ? lastMessage.suggestedReplies
                : [];
              setSuggestedReplies(replies);
            } catch (e) {
              console.warn(
                "suggested_replies field not available in database:",
                e
              );
              setSuggestedReplies([]);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load history messages:", e);
      }
    },
    [client, userId, messages.length, isSessionActive]
  );

  // 切换会话时加载历史消息
  useEffect(() => {
    if (activeSessionId && !isSessionActive) {
      loadHistoryMessages(activeSessionId);
      // 加载完成后标记会话为活跃
      setIsSessionActive(true);
    }
  }, [activeSessionId, loadHistoryMessages, isSessionActive]);

  const apiHistory = useMemo(
    () => messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    [messages]
  );

  const fetchSuggestedReplies = async (history, updateLocalState = true) => {
    if (updateLocalState) setSuggestedReplies([]);
    const systemPrompt =
      "Based on the *last* message in the conversation, generate 3 very short, concise, one-click replies for the user to send next. The replies should be in the same language as the conversation (e.g., Chinese if the convo is in Chinese). Only output the JSON object.";
    const schema = {
      type: "OBJECT",
      properties: {
        replies: { type: "ARRAY", items: { type: "STRING" }, maxItems: 3 },
      },
      propertyOrdering: ["replies"],
    };
    try {
      const result = await callGeminiForStructuredJson(
        history,
        systemPrompt,
        schema,
        userApiKey
      );
      const replies = result && result.replies ? result.replies : [];
      if (updateLocalState) setSuggestedReplies(replies);
      return replies;
    } catch (e) {
      console.error("Failed to fetch suggested replies:", e);
      return [];
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleSelectSession = async (id) => {
    if (id !== activeSessionId) {
      // 先完全清空UI状态和重置活跃标志
      setActiveSessionId(null);
      setIsSessionActive(false);
      setMessages([]);
      setSuggestedReplies([]);

      // 短暂延迟确保状态清空，然后设置新会话
      setTimeout(() => {
        setActiveSessionId(id);
      }, 50);
    }
  };

  const submitMessage = async (messageContent) => {
    const db = client;
    const trimmed = messageContent.trim();
    if (!trimmed || isLoading || !userId || !db) return;

    setIsLoading(true);
    setCurrentInput("");
    setSuggestedReplies([]);
    setIsSessionActive(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession(
          db,
          appId,
          userId,
          trimmed.substring(0, 40) + "..."
        );
        setActiveSessionId(currentSessionId);
      }

      // 不在流式生成过程中写入数据库，等待完整响应后再统一写入

      const historyForApi = [
        ...messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: trimmed }] },
      ];

      const modelToUse = selectedModel;

      const modelMessageId = `model-${Date.now()}`;
      const modelCreatedAt = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: modelMessageId,
          role: "model",
          content: "",
          isLoading: true,
          thinkingProcess: null,
          sources: [],
          generatedWithThinking: isThinkingMode,
          generatedWithSearch: isSearchMode,
          created_at: modelCreatedAt,
        },
      ]);

      const aiClient = new GoogleGenAI({
        apiKey: userApiKey || "",
      });

      const params = {
        model: modelToUse,
        contents: historyForApi,
      };

      const systemInstructions = [
        "Respond *only* with the plain text answer. Do not include pinyin, romanization, or automatic translations unless the user explicitly asks for them.",
      ];

      if (systemInstructions.length > 0) {
        params.systemInstruction = {
          parts: [{ text: systemInstructions.join(" ") }],
        };
      }

      if (isThinkingMode) {
        params.config = {
          thinkingConfig: {
            thinkingBudget: -1,
            includeThoughts: true,
          },
        };
      }

      if (isSearchMode) {
        params.tools = [{ google_search: {} }];
      }
      console.log("params", params);
      const stream = await aiClient.models.generateContentStream(params);

      let fullText = "";
      const thoughtParts = [];
      let sources = [];

      for await (const chunk of stream) {
        const delta = chunk.text || "";
        if (delta) {
          fullText += delta;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMessageId ? { ...m, content: fullText } : m
            )
          );
        }

        const candidate =
          chunk.candidates && chunk.candidates.length > 0
            ? chunk.candidates[0]
            : null;

        if (
          candidate &&
          candidate.content &&
          Array.isArray(candidate.content.parts)
        ) {
          candidate.content.parts.forEach((part) => {
            if (part.thought && part.text) {
              thoughtParts.push(part.text);
            }
          });
        }

        const groundingMetadata = candidate && candidate.groundingMetadata;
        if (
          groundingMetadata &&
          Array.isArray(groundingMetadata.groundingAttributions)
        ) {
          sources = groundingMetadata.groundingAttributions
            .map((attribution) => ({
              uri: attribution.web?.uri,
              title: attribution.web?.title,
            }))
            .filter((s) => s.uri && s.title);
        }
      }

      const thinkingProcess =
        thoughtParts.length > 0 ? thoughtParts.join("").trim() || null : null;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMessageId
            ? {
                ...m,
                content: fullText,
                thinkingProcess,
                sources: sources || [],
                generatedWithThinking: !!thinkingProcess,
                generatedWithSearch: isSearchMode,
                isLoading: false,
              }
            : m
        )
      );

      const finalHistoryForReplies = [
        ...historyForApi,
        { role: "model", parts: [{ text: fullText }] },
      ];

      let suggestedReplies = [];
      try {
        suggestedReplies = await fetchSuggestedReplies(
          finalHistoryForReplies,
          false
        );
        setSuggestedReplies(suggestedReplies);
      } catch (e) {
        console.error("Failed to fetch suggested replies:", e);
        setSuggestedReplies([]);
      }

      setTimeout(() => {
        // 在完成整个流式响应后，再统一持久化用户消息和模型消息
        addUserMessage(db, appId, userId, currentSessionId, trimmed).catch(
          (e) => console.error("Failed to save user message:", e)
        );

        const messageData = {
          content: fullText,
          thinkingProcess,
          sources: sources || [],
          suggestedReplies,
          generatedWithThinking: !!thinkingProcess,
          generatedWithSearch: isSearchMode,
        };

        addModelMessage(db, appId, userId, currentSessionId, messageData).catch(
          (e) => console.error("Failed to save model message:", e)
        );
      }, 200);

      if (isAutoPlayTts && fullText) {
        handleStopAudio();
        try {
          const { audioData, mimeType } = await callGeminiTtsApi(
            fullText,
            userApiKey
          );
          if (!mimeType.includes("rate="))
            throw new Error("Invalid TTS mimeType");
          const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
          const pcmData = base64ToArrayBuffer(audioData);
          const pcm16 = new Int16Array(pcmData);
          const wavBlob = pcmToWav(pcm16, sampleRate);
          const audioUrl = URL.createObjectURL(wavBlob);
          const audio = new Audio(audioUrl);
          setCurrentAudio(audio);
          setPlayingMessageId("auto-play");
          audio.play();
          audio.onended = () => {
            setPlayingMessageId(null);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
          };
        } catch (ttsError) {
          console.error("Auto-play TTS failed:", ttsError);
          if (currentAudio) currentAudio.pause();
          setCurrentAudio(null);
          setPlayingMessageId(null);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== userMessage.id),
        {
          id: `error-${Date.now()}`,
          role: "model",
          content: "抱歉，发送消息时出错，请重试。",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitMessageLegacy = async (messageContent) => {
    const db = client;
    const trimmed = messageContent.trim();
    if (!trimmed || isLoading || !userId || !db) return;

    setIsLoading(true);
    setCurrentInput("");
    setSuggestedReplies([]);
    setIsSessionActive(true); // 标记会话为活跃状态

    // 创建用户消息并立即显示
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession(
          db,
          appId,
          userId,
          trimmed.substring(0, 40) + "..."
        );
        setActiveSessionId(currentSessionId);
      }

      // 后台异步保存用户消息到数据库（完全不阻塞UI）
      setTimeout(() => {
        addUserMessage(db, appId, userId, currentSessionId, trimmed).catch(
          (e) => console.error("Failed to save user message:", e)
        );
      }, 100);

      // 构建API调用历史（使用最新的消息状态）
      const historyForApi = [
        ...messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: trimmed }] },
      ];

      const modelToUse = selectedModel;
      const aiResponse = await callGeminiApi(
        historyForApi,
        modelToUse,
        isSearchMode,
        isThinkingMode,
        userApiKey
      );

      // 创建AI消息并立即显示
      const modelMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        content: aiResponse.text,
        thinkingProcess: aiResponse.thinkingProcess,
        sources: aiResponse.sources || [],
        generatedWithThinking: !!aiResponse.thinkingProcess,
        generatedWithSearch: isSearchMode,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMessage]);

      // 获取建议回复
      const finalHistoryForReplies = [
        ...historyForApi,
        { role: "model", parts: [{ text: aiResponse.text }] },
      ];

      // 获取延伸问题并保存到数据库
      let suggestedReplies = [];
      try {
        suggestedReplies = await fetchSuggestedReplies(
          finalHistoryForReplies,
          false
        );
        // 手动更新延伸问题显示
        setSuggestedReplies(suggestedReplies);
      } catch (e) {
        console.error("Failed to fetch suggested replies:", e);
        setSuggestedReplies([]);
      }

      // 后台异步保存AI消息到数据库（包含延伸问题，完全不阻塞UI）
      setTimeout(() => {
        const messageData = {
          content: aiResponse.text,
          thinkingProcess: aiResponse.thinkingProcess,
          sources: aiResponse.sources || [],
          suggestedReplies,
          generatedWithThinking: !!aiResponse.thinkingProcess,
          generatedWithSearch: isSearchMode,
        };

        // 临时调试日志
        console.log("保存到数据库的消息数据:", {
          hasThinkingProcess: !!messageData.thinkingProcess,
          thinkingProcessLength: messageData.thinkingProcess
            ? messageData.thinkingProcess.length
            : 0,
          hasSuggestedReplies:
            messageData.suggestedReplies &&
            messageData.suggestedReplies.length > 0,
        });

        addModelMessage(db, appId, userId, currentSessionId, messageData).catch(
          (e) => console.error("Failed to save model message:", e)
        );
      }, 200);

      // 自动播放TTS
      if (isAutoPlayTts && aiResponse.text) {
        handleStopAudio();
        try {
          const { audioData, mimeType } = await callGeminiTtsApi(
            aiResponse.text,
            userApiKey
          );
          if (!mimeType.includes("rate="))
            throw new Error("Invalid TTS mimeType");
          const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
          const pcmData = base64ToArrayBuffer(audioData);
          const pcm16 = new Int16Array(pcmData);
          const wavBlob = pcmToWav(pcm16, sampleRate);
          const audioUrl = URL.createObjectURL(wavBlob);
          const audio = new Audio(audioUrl);
          setCurrentAudio(audio);
          setPlayingMessageId("auto-play");
          audio.play();
          audio.onended = () => {
            setPlayingMessageId(null);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
          };
        } catch (ttsError) {
          console.error("Auto-play TTS failed:", ttsError);
          if (currentAudio) currentAudio.pause();
          setCurrentAudio(null);
          setPlayingMessageId(null);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // 显示错误消息
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== userMessage.id),
        {
          id: `error-${Date.now()}`,
          role: "model",
          content: "抱歉，发送消息时出错，请重试。",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    await submitMessage(currentInput);
  };

  const handleSuggestedReplyClick = async (reply) => {
    await submitMessage(reply);
  };

  const handleSummarizeChat = async () => {
    if (isLoading || isSummaryLoading || messages.length === 0) return;
    setIsSummaryLoading(true);
    setSummaryContent("");
    setIsSummaryModalOpen(true);
    const summaryHistory = [
      ...apiHistory,
      {
        role: "user",
        parts: [
          {
            text: "请用中文(Chinese)为我们到目前为止的对话提供一个简洁的要点总结。",
          },
        ],
      },
    ];
    try {
      const summaryResponse = await callGeminiApi(
        summaryHistory,
        "gemini-2.5-flash-preview-09-2025",
        false,
        false,
        userApiKey
      );
      const answerMatch = summaryResponse.text.match(
        /\[ANSWER\]([\s\S]*?)\[\/ANSWER\]/
      );
      let summaryText = summaryResponse.text;
      if (answerMatch && answerMatch[1].trim())
        summaryText = answerMatch[1].trim();
      setSummaryContent(summaryText);
    } catch (e) {
      console.error("Error summarizing chat:", e);
      setSummaryContent("抱歉，生成总结时出错。");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handlePlayAudio = async (message) => {
    if (currentAudio) currentAudio.pause();
    if (playingMessageId === message.id) {
      handleStopAudio();
      return;
    }
    setIsTtsLoading(message.id);
    setPlayingMessageId(null);
    try {
      const { audioData, mimeType } = await callGeminiTtsApi(
        message.content,
        userApiKey
      );
      if (!mimeType.includes("rate="))
        throw new Error("Invalid TTS response mimeType: " + mimeType);
      const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
      const pcmData = base64ToArrayBuffer(audioData);
      const pcm16 = new Int16Array(pcmData);
      const wavBlob = pcmToWav(pcm16, sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      setPlayingMessageId(message.id);
      audio.play();
      audio.onended = () => {
        setPlayingMessageId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
    } catch (e) {
      console.error("Error playing TTS:", e);
    } finally {
      setIsTtsLoading(null);
    }
  };

  const handleStopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null;
      if (currentAudio.src && currentAudio.src.startsWith("blob:"))
        URL.revokeObjectURL(currentAudio.src);
    }
    setPlayingMessageId(null);
    setCurrentAudio(null);
  };

  const handleTranslateMessage = async (message) => {
    if (isTranslatingId === message.id) return;
    if (translations[message.id]) {
      setTranslations((prev) => ({ ...prev, [message.id]: null }));
      return;
    }
    setIsTranslatingId(message.id);
    try {
      const isChinese = /[\u4e00-\u9fa5]/.test(message.content);
      const targetLanguage = isChinese ? "English" : "Chinese";
      const translation = await callGeminiForTranslation(
        message.content,
        targetLanguage,
        userApiKey
      );
      setTranslations((prev) => ({ ...prev, [message.id]: translation }));
    } catch (e) {
      setTranslations((prev) => ({ ...prev, [message.id]: "翻译失败。" }));
    } finally {
      setIsTranslatingId(null);
    }
  };

  const handleCopy = (text, msgId) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
    document.body.removeChild(textArea);
  };

  const handleRegenerate = async () => {
    const db = client;
    if (isLoading || !userId || !activeSessionId || !db) return;
    setIsLoading(true);
    setSuggestedReplies([]);
    try {
      const lastUserMessageIndex = [...messages].findLastIndex(
        (m) => m.role === "user"
      );
      if (lastUserMessageIndex === -1) {
        setIsLoading(false);
        return;
      }

      const historyForApi = messages
        .slice(0, lastUserMessageIndex + 1)
        .map((msg) => ({ role: msg.role, parts: [{ text: msg.content }] }));
      const messagesToDelete = messages.slice(lastUserMessageIndex + 1);
      await deleteMessages(
        db,
        appId,
        userId,
        activeSessionId,
        messagesToDelete.map((m) => m.id)
      );

      const modelToUse = selectedModel;
      const aiResponse = await callGeminiApi(
        historyForApi,
        modelToUse,
        isSearchMode,
        isThinkingMode,
        userApiKey
      );
      // 使用API返回的结构化数据，无需正则表达式解析
      const thinkingProcess = aiResponse.thinkingProcess;
      const finalAnswer = aiResponse.text;

      await addModelMessage(db, appId, userId, activeSessionId, {
        content: finalAnswer,
        thinkingProcess,
        sources: aiResponse.sources || [],
        generatedWithThinking: !!thinkingProcess,
        generatedWithSearch: isSearchMode,
      });

      const finalHistoryForReplies = [
        ...historyForApi,
        { role: "model", parts: [{ text: finalAnswer }] },
      ];
      fetchSuggestedReplies(finalHistoryForReplies);

      if (isAutoPlayTts && finalAnswer) {
        handleStopAudio();
        try {
          const { audioData, mimeType } = await callGeminiTtsApi(
            finalAnswer,
            userApiKey
          );
          if (!mimeType.includes("rate="))
            throw new Error("Invalid TTS mimeType");
          const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
          const pcmData = base64ToArrayBuffer(audioData);
          const pcm16 = new Int16Array(pcmData);
          const wavBlob = pcmToWav(pcm16, sampleRate);
          const audioUrl = URL.createObjectURL(wavBlob);
          const audio = new Audio(audioUrl);
          setCurrentAudio(audio);
          setPlayingMessageId("auto-play");
          audio.play();
          audio.onended = () => {
            setPlayingMessageId(null);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
          };
        } catch (ttsError) {
          console.error("Auto-play TTS failed:", ttsError);
          if (currentAudio) currentAudio.pause();
          setCurrentAudio(null);
          setPlayingMessageId(null);
        }
      }
    } catch (e) {
      console.error("Error regenerating message:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden text-[90%]">
      {/* 侧边栏 */}
      <div className="flex flex-col w-72 border-r border-gray-100 bg-white h-full">
        <div className="flex items-center p-4 h-18">
          <Bot size={28} className="text-indigo-600" />
          <span className="ml-3 font-bold text-xl text-gray-900">BeeBot</span>
        </div>

        <div className="p-4">
          <div className="relative flex items-center">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-3 pl-10 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-col space-y-2 p-4">
          <a
            href="#"
            className="flex items-center p-3 rounded-lg bg-gray-100 text-indigo-600 font-semibold"
          >
            <Home size={20} />
            <span className="ml-3">Home</span>
          </a>
          <a
            href="#"
            className="flex items-center p-3 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <LayoutGrid size={20} />
            <span className="ml-3">Explore</span>
          </a>
          <a
            href="#"
            className="flex items-center p-3 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Book size={20} />
            <span className="ml-3">Library</span>
          </a>
          <a
            href="#"
            className="flex items-center p-3 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <History size={20} />
            <span className="ml-3">History</span>
          </a>
        </nav>

        <nav className="flex-1 overflow-y-auto space-y-2 p-4">
          <button
            onClick={handleNewChat}
            className={`flex items-center justify-center w-full p-3 rounded-lg transition-all font-semibold ${
              !activeSessionId
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            <MessageSquarePlus size={20} />
            <span className="ml-3">开始新聊天</span>
          </button>

          {isConfigMissing && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              Supabase 配置缺失！请在设置中填写 Supabase 配置。
            </div>
          )}

          <span className="block text-xs text-gray-500 font-medium px-2 pt-4">
            聊天记录
          </span>
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`flex items-center w-full p-3 rounded-md transition-colors text-left text-gray-700 ${
                activeSessionId === session.id
                  ? "bg-gray-200"
                  : "hover:bg-gray-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeSessionId === session.id
                    ? "bg-indigo-600"
                    : "bg-transparent"
                }`}
              ></span>
              <span className="ml-3 truncate flex-1">{session.title}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-4 border-t border-gray-100 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User size={24} className="p-1 bg-gray-300 rounded-full" />
              {userId && (
                <span
                  className="ml-3 text-sm font-medium truncate text-gray-800"
                  title={userId}
                >
                  User: {userId.substring(0, 10)}...
                </span>
              )}
            </div>
            <ChevronsUpDown size={16} className="text-gray-400" />
          </div>
        </button>
      </div>

      {/* 主窗格 */}
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="flex items-center justify-between p-4 h-18 border-b border-gray-100">
          <h2 className="text-xl font-semibold">
            {activeSessionId
              ? sessions.find((s) => s.id === activeSessionId)?.title ||
                "聊天中..."
              : "新聊天"}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSummarizeChat}
              disabled={
                isLoading ||
                isSummaryLoading ||
                !activeSessionId ||
                messages.length === 0
              }
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} className="mr-1.5 text-yellow-500" />
              总结对话
            </button>
            <button className="p-2 rounded-full hover:bg-gray-200 text-gray-600">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="text-4xl">🔮</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Good Morning!</h1>
            <h2 className="text-3xl text-gray-600 mt-2">
              How Can I <span className="text-indigo-600">Assist You</span>{" "}
              Today?
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {(() => {
              const lastModelMessageIndex = [...messages].findLastIndex(
                (m) => m.role === "model"
              );
              return messages.map((msg, index) => (
                <MessageItem
                  key={msg.id || index}
                  msg={msg}
                  isTtsLoading={isTtsLoading}
                  playingMessageId={playingMessageId}
                  onPlayAudio={handlePlayAudio}
                  onStopAudio={handleStopAudio}
                  onTranslate={handleTranslateMessage}
                  isTranslating={isTranslatingId === msg.id}
                  translatedText={translations[msg.id] || ""}
                  expandedSourcesMessageId={expandedSourcesMessageId}
                  setExpandedSourcesMessageId={setExpandedSourcesMessageId}
                  isLastMessage={index === messages.length - 1}
                  onCopy={handleCopy}
                  copiedMessageId={copiedMessageId}
                  onRegenerate={handleRegenerate}
                  isLastModelMessage={
                    msg.role === "model" && index === lastModelMessageIndex
                  }
                />
              ));
            })()}

            {suggestedReplies.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="flex flex-col max-w-xl w-full">
                  <span className="text-sm font-semibold text-indigo-600 mb-2 px-1">
                    <Sparkles size={16} className="inline mr-1" />
                    延伸问题:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {suggestedReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedReplyClick(reply)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-sm hover:bg-indigo-100 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <button
                onClick={() => setIsUploadMenuOpen((p) => !p)}
                className="flex items-center p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                title="上传文件 (暂不可用)"
              >
                <Plus size={16} />
              </button>
              {isUploadMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    <File size={16} className="mr-2" /> Upload Document
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    <Image size={16} className="mr-2" /> Upload Image
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    <Video size={16} className="mr-2" /> Upload Video
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                    <Mic size={16} className="mr-2" /> Upload Audio
                  </button>
                </div>
              )}
            </div>

            {/* 模型选择器 */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
              <ChevronsUpDown
                size={14}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Thinking按钮 */}
            <button
              onClick={() => setIsThinkingMode((p) => !p)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isThinkingMode
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              title={isThinkingMode ? "思考模式: 开" : "思考模式: 关"}
            >
              <Brain size={14} className="mr-1.5" /> Thinking
            </button>

            {/* Search按钮 */}
            <button
              onClick={() => setIsSearchMode((p) => !p)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSearchMode
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              title={isSearchMode ? "联网搜索: 开" : "联网搜索: 关"}
            >
              <Globe size={14} className="mr-1.5" /> Search
            </button>

            {/* <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition-colors">
              Web Dev
            </button>
       
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition-colors">
              Deep Research
            </button> */}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center space-x-3"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  if (e.target.value.length > 0) {
                    setSuggestedReplies([]);
                    setIsUploadMenuOpen(false);
                  }
                }}
                placeholder={
                  isLoading ? "BeeBot 正在思考中..." : "输入你的问题或命令..."
                }
                disabled={isLoading}
                className="flex-1 w-full p-4 pl-6 pr-16 bg-gray-100 rounded-xl border-none shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !currentInput.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <ArrowUp size={24} />
              )}
            </button>
          </form>
        </div>
      </div>

      {isSummaryModalOpen && (
        <SummaryModal
          content={summaryContent}
          isLoading={isSummaryLoading}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentGeminiApiKey={userApiKey}
          currentSbConfig={localSbConfig}
          onSave={async (newGeminiKey, _ignored, newSbConfig) => {
            setUserApiKey(newGeminiKey);
            try {
              localStorage.setItem("userApiKey", newGeminiKey);
            } catch {}
            setLocalSbConfig(newSbConfig);
            try {
              localStorage.setItem(
                "supabaseConfig",
                JSON.stringify(newSbConfig)
              );
            } catch {}
            await initApp();
          }}
          isAutoPlayTts={isAutoPlayTts}
          onToggleAutoPlayTts={() => setIsAutoPlayTts((prev) => !prev)}
        />
      )}
      {needsSchemaInit && (
        <SchemaInitModal
          sql={schemaSql}
          onClose={() => {
            try {
              localStorage.setItem("sb_inited", "1");
            } catch {}
            setNeedsSchemaInit(false);
          }}
        />
      )}
    </div>
  );
}
