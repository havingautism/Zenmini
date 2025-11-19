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
  Trash2,
  MoreVertical,
} from "lucide-react";
import MarkdownRenderer from "./components/MarkdownRenderer";
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
  deleteSession,
} from "./services/chat";
import GeminiLogo from "./svgs/Google-gemini-icon.svg";
import MessageItem from "./components/MessageItem";
import SummaryModal from "./components/SummaryModal";
import SettingsModal from "./components/SettingsModal";
import SchemaInitModal from "./components/SchemaInitModal";
import SuggestedReplyMarkdown from "./components/SuggestedReplyMarkdown";

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
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

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
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionMenuId, setSessionMenuId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetSession, setDeleteTargetSession] = useState(null);

  const messagesEndRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const modelMenuRef = useRef(null);

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
    if (!isUploadMenuOpen) return;
    const handleClickOutside = (event) => {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(event.target)
      ) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  useEffect(() => {
    if (!isModelMenuOpen) return;
    const handleClickOutside = (event) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target)
      ) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModelMenuOpen]);

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

      setIsSessionLoading(true);
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
      } finally {
        setIsSessionLoading(false);
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

  const handleNewChat = async () => {
    setSessionMenuId(null);
    setActiveSessionId(null);
    setMessages([]);
    setSuggestedReplies([]);
    setIsSessionActive(false);

    // Do not create session here; create on first message
    return;

    const db = client;
    if (!db || !userId) return;

    try {
      const createdAt = new Date().toISOString();
      const title = "新会话";
      const newSessionId = await createSession(db, appId, userId, title);
      setActiveSessionId(newSessionId);
      // 页面优先：本地先插入一条新会话，后续由订阅同步为准
      setSessions((prev) => {
        if (prev.some((s) => s.id === newSessionId)) return prev;
        return [
          {
            id: newSessionId,
            title,
            created_at: createdAt,
            app_id: appId,
            client_id: userId,
          },
          ...prev,
        ];
      });
    } catch (e) {
      console.error("Failed to create new chat session:", e);
    }
  };

  const openSessionMenu = (event, sessionId) => {
    event.stopPropagation();
    setSessionMenuId((prev) => (prev === sessionId ? null : sessionId));
  };

  const openDeleteModal = (session) => {
    setSessionMenuId(null);
    setDeleteTargetSession(session);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTargetSession(null);
  };

  const handleConfirmDeleteSession = async () => {
    if (!deleteTargetSession) return;
    const db = client;
    if (!db || !userId) return;
    const sessionId = deleteTargetSession.id;
    try {
      await deleteSession(db, appId, userId, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setSuggestedReplies([]);
        setIsSessionActive(false);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      closeDeleteModal();
    }
  };

  const formatSessionTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSelectSession = async (id) => {
    if (id !== activeSessionId) {
      // 切换会话时清空当前 UI，并展示加载态
      setIsSessionActive(false);
      setMessages([]);
      setSuggestedReplies([]);
      setIsSessionLoading(true);
      setActiveSessionId(id);
    }
  };

  const handleDeleteSession = (e, session) => {
    e.stopPropagation();
    openDeleteModal(session);
  };

  const submitMessage = async (messageContent, options = {}) => {
    const { suppressThinkingBubble = false } = options;
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

    let modelMessageId = null;
    let modelCreatedAt = null;

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const sessionTitle = trimmed.substring(0, 50);
        const createdAt = new Date().toISOString();
        currentSessionId = await createSession(db, appId, userId, sessionTitle);
        setActiveSessionId(currentSessionId);
        // 页面优先：本地先插入会话，后续由订阅同步为准
        setSessions((prev) => {
          if (prev.some((s) => s.id === currentSessionId)) return prev;
          return [
            {
              id: currentSessionId,
              title: sessionTitle || "新会话",
              created_at: createdAt,
              app_id: appId,
              client_id: userId,
            },
            ...prev,
          ];
        });
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

      modelMessageId = `model-${Date.now()}`;
      modelCreatedAt = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: modelMessageId,
          role: "model",
          content: "",
          isLoading: true,
          thinkingProcess: null,
          sources: [],
          generatedWithThinking: isThinkingMode && !suppressThinkingBubble,
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
        addUserMessage(
          db,
          appId,
          userId,
          currentSessionId,
          trimmed,
          userMessage.created_at
        ).catch((e) => console.error("Failed to save user message:", e));

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
      setMessages((prev) => {
        // 移除正在加载的模型占位气泡，保留用户消息
        const cleaned = prev.filter((msg) => msg.id !== modelMessageId);
        return [
          ...cleaned,
          {
            id: `error-${Date.now()}`,
            role: "model",
            content: "抱歉，发送消息时出错，请重试。",
            created_at: new Date().toISOString(),
          },
        ];
      });
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
          trimmed.substring(0, 50)
        );
        setActiveSessionId(currentSessionId);
      }

      // 后台异步保存用户消息到数据库（完全不阻塞UI）
      setTimeout(() => {
        addUserMessage(
          db,
          appId,
          userId,
          currentSessionId,
          trimmed,
          userMessage.created_at
        ).catch((e) => console.error("Failed to save user message:", e));
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
          createdAt: modelMessage.created_at,
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
    // 延伸问题：沿用当前思考模式设置，并显示对应的加载气泡
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
    setIsSessionActive(true);

    let modelMessageId = null;
    let modelCreatedAt = null;

    try {
      const lastUserMessageIndex = [...messages].findLastIndex(
        (m) => m.role === "user"
      );
      if (lastUserMessageIndex === -1) {
        setIsLoading(false);
        return;
      }

      // 仅保留最后一条用户消息之前的历史消息（包含该条用户消息）
      const baseMessages = messages.slice(0, lastUserMessageIndex + 1);

      // 删除本地 UI 中最后一条用户消息之后的所有模型回复
      modelMessageId = `model-${Date.now()}`;
      modelCreatedAt = new Date().toISOString();
      setMessages([
        ...baseMessages,
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

      const historyForApi = baseMessages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

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

      const finalSources = aiResponse.sources || [];

      // 更新本地占位气泡为最终结果
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMessageId
            ? {
                ...m,
                content: finalAnswer,
                thinkingProcess,
                sources: finalSources,
                generatedWithThinking: !!thinkingProcess,
                generatedWithSearch: isSearchMode,
                isLoading: false,
              }
            : m
        )
      );

      await addModelMessage(db, appId, userId, activeSessionId, {
        content: finalAnswer,
        thinkingProcess,
        sources: finalSources,
        generatedWithThinking: !!thinkingProcess,
        generatedWithSearch: isSearchMode,
        createdAt: modelCreatedAt,
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
      // 失败时移除加载气泡并给出错误提示
      setMessages((prev) => {
        const cleaned = prev.filter((msg) => msg.id !== modelMessageId);
        return [
          ...cleaned,
          {
            id: `error-${Date.now()}`,
            role: "model",
            content: "抱歉，重新生成回答时出错，请重试。",
            created_at: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden text-[90%]">
      {/* 侧边栏 */}
      <div className="flex flex-col w-72 border-r border-gray-100 bg-white text-gray-900 h-full">
        {/* 顶部 Logo + 标题 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 h-18">
          <div className="flex items-center">
            <Bot size={26} className="text-indigo-500" />
            <span className="ml-2 font-semibold text-base tracking-wide">
              BeeBot
            </span>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-5 pb-4">
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-400 transition-colors"
          >
            <MessageSquarePlus size={20} className="mr-2" />
            新建对话
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-5 pb-4">
          <div className="relative flex items-center">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
            />
            <input
              type="text"
              placeholder="搜索聊天"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500   
  focus:border-transparent"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* 会话列表 */}
        <nav className="flex-1 overflow-y-auto space-y-2 px-4 pb-4">
          {isConfigMissing && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Supabase 配置缺失！请在设置中填写 Supabase 配置。
            </div>
          )}

          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              所有对话
            </span>
            {sessions.length > 0 && (
              <span className="text-xs text-gray-400">
                共 {sessions.length} 条
              </span>
            )}
          </div>

          {(() => {
            if (!sessions || sessions.length === 0) return null;

            const now = new Date();
            const msPerDay = 1000 * 60 * 60 * 24;
            const groupsMap = new Map();

            sessions.forEach((s) => {
              const created = s.created_at ? new Date(s.created_at) : null;
              let key = "other";
              let label = "更早";
              let order = 100;
              let sortDate = created ? created.getTime() : 0;

              if (created) {
                const diffDays = (now - created) / msPerDay;
                if (diffDays <= 7) {
                  key = "prev7";
                  label = "过去7天";
                  order = 0;
                } else if (diffDays <= 30) {
                  key = "prev30";
                  label = "过去30天";
                  order = 1;
                } else {
                  const year = created.getFullYear();
                  const month = created.getMonth() + 1;
                  key = `month-${year}-${month}`;
                  label = `${year} 年 ${month.toString().padStart(2, "0")} 月`;
                  sortDate = new Date(year, month - 1, 1).getTime();
                  order = 10;
                }
              }

              if (!groupsMap.has(key)) {
                groupsMap.set(key, {
                  key,
                  label,
                  order,
                  sortDate,
                  items: [],
                });
              }
              groupsMap.get(key).items.push(s);
            });

            const groups = Array.from(groupsMap.values()).sort((a, b) => {
              if (a.order !== b.order) return a.order - b.order;
              return b.sortDate - a.sortDate;
            });

            return groups.map((group) => (
              <div key={group.label} className="mt-2">
                <div className="px-2 text-xs font-medium text-gray-500">
                  {group.label}
                </div>
                <div className="mt-1 space-y-1">
                  {group.items.map((session) => {
                    const isActive = activeSessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-gray-900"
                            : "text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${
                              isActive ? "bg-indigo-500" : "bg-gray-300"
                            }`}
                          ></span>
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-medium"
                              title={session.title}
                            >
                              {session.title}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-400">
                              {formatSessionTime(session.created_at)}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, session)}
                          className="ml-2 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500    
  group-hover:opacity-100"
                          title="删除此聊天记录"
                        >
                          <Trash2 size={14} />
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>

        {/* 底部用户信息 */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-4 border-t border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User
                size={24}
                className="p-1 bg-gray-200 text-gray-700 rounded-full"
              />
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
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {isSessionLoading && activeSessionId && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center shadow-sm">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
            </div>
            <p className="mt-4 text-sm text-gray-600">正在切换会话…</p>
            <p className="mt-1 text-xs text-gray-400">为你载入历史对话</p>
          </div>
        )}
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
              const orderedMessages = [...messages].sort((a, b) => {
                const at = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
                return at - bt;
              });
              return orderedMessages.map((msg, index) => (
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
                  isLastMessage={index === orderedMessages.length - 1}
                  onCopy={handleCopy}
                  copiedMessageId={copiedMessageId}
                  onRegenerate={handleRegenerate}
                  isLastModelMessage={
                    msg.role === "model" && index === lastModelMessageIndex
                  }
                />
              ));
            })()}

            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-white">
          {suggestedReplies.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 flex items-center">
                <Sparkles size={14} className="mr-1" />
                延伸问题
              </span>
              <div className="flex flex-wrap gap-2 flex-1">
                {suggestedReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedReplyClick(reply)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs hover:bg-indigo-100 hover:border-indigo-200 transition-colors max-w-full"
                  >
                    <SuggestedReplyMarkdown content={reply} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative" ref={uploadMenuRef}>
              <button
                onClick={() => setIsUploadMenuOpen((p) => !p)}
                className="flex items-center p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors shadow-sm"
                title="上传文件 (暂不可用)"
              >
                <Plus size={16} className="text-gray-700" />
              </button>
              {isUploadMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                  <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    上传（开发中）
                  </div>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <File size={16} className="mr-2 text-indigo-500" /> 上传文档
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Image size={16} className="mr-2 text-indigo-500" />{" "}
                    上传图片
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Video size={16} className="mr-2 text-indigo-500" />{" "}
                    上传视频
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-b-xl">
                    <Mic size={16} className="mr-2 text-indigo-500" /> 上传音频
                  </button>
                </div>
              )}
            </div>

            {/* 模型选择器 */}
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setIsModelMenuOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-800 shadow-sm border border-gray-200 transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full ">
                  <img
                    src={GeminiLogo}
                    alt="Google Gemini"
                    className="w-4 h-4"
                  />
                </span>
                <span className="whitespace-nowrap">
                  {selectedModel === "gemini-2.5-flash"
                    ? "Gemini 2.5 Flash"
                    : "Gemini 2.5 Pro"}
                </span>
                <ChevronsUpDown size={14} className="text-gray-400" />
              </button>
              {isModelMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full ">
                      <img
                        src={GeminiLogo}
                        alt="Google Gemini"
                        className="w-4 h-4"
                      />
                    </span>
                    <span className="text-xs font-semibold text-gray-600">
                      Gemini 模型
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModel("gemini-2.5-flash");
                      setIsModelMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-indigo-50 transition-colors ${
                      selectedModel === "gemini-2.5-flash"
                        ? "text-indigo-700 bg-indigo-50"
                        : "text-gray-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium">Gemini 2.5 Flash</div>
                      <div className="text-xs text-gray-400">
                        快速响应，适合日常对话
                      </div>
                    </div>
                    {selectedModel === "gemini-2.5-flash" && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                        当前
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModel("gemini-2.5-pro");
                      setIsModelMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-indigo-50 transition-colors rounded-b-xl ${
                      selectedModel === "gemini-2.5-pro"
                        ? "text-indigo-700 bg-indigo-50"
                        : "text-gray-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium">Gemini 2.5 Pro</div>
                      <div className="text-xs text-gray-400">
                        更强推理，适合复杂任务
                      </div>
                    </div>
                    {selectedModel === "gemini-2.5-pro" && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                        当前
                      </span>
                    )}
                  </button>
                </div>
              )}
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
      {isDeleteModalOpen && deleteTargetSession && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-500 mr-3">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  确认删除聊天
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  此操作无法撤销，将删除该会话下的所有消息。
                </p>
              </div>
            </div>
            <div className="mb-5 text-sm text-gray-700">
              确定要删除「
              <span className="font-medium">
                {deleteTargetSession.title || "此聊天"}
              </span>
              」的聊天记录吗？
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
