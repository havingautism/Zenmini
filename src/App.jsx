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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedModel");
      return saved || "gemini-2.5-flash";
    } catch {
      return "gemini-2.5-flash";
    }
  });
  const [isThinkingMode, setIsThinkingMode] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [localSbConfig, setLocalSbConfig] = useState(EMPTY_SB_CONFIG);
  const [needsSchemaInit, setNeedsSchemaInit] = useState(false);
  const [schemaSql, setSchemaSql] = useState("");

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
    
    // Add a small delay before enabling click-outside-to-close
    // to prevent immediate closing when opening the menu
    const timeoutId = setTimeout(() => {
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
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isModelMenuOpen]);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("userApiKey");
      if (storedKey) {
        setUserApiKey(storedKey);
      } else {
        // Fallback to env variable if no localStorage key
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envKey) setUserApiKey(envKey);
      }
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

  // 保存选中的模型到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("selectedModel", selectedModel);
    } catch {}
  }, [selectedModel]);

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

  const getGroupedSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups = {
      "今天": [],
      "昨天": [],
      "过去 7 天": [],
      "过去 30 天": [],
      "更早": [],
    };

    const filteredSessions = sessions.filter((s) =>
      (s.title || "未命名对话").toLowerCase().includes(searchQuery.toLowerCase())
    );

    filteredSessions.forEach((session) => {
      const date = new Date(session.created_at || session.createdAt);
      if (date >= today) {
        groups["今天"].push(session);
      } else if (date >= yesterday) {
        groups["昨天"].push(session);
      } else if (date >= sevenDaysAgo) {
        groups["过去 7 天"].push(session);
      } else if (date >= thirtyDaysAgo) {
        groups["过去 30 天"].push(session);
      } else {
        groups["更早"].push(session);
      }
    });

    return groups;
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
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

      modelMessageId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `model-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        if (groundingMetadata) {
          // Try groundingChunks first (new API format)
          if (Array.isArray(groundingMetadata.groundingChunks)) {
            sources = groundingMetadata.groundingChunks
              .map((chunk) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
              }))
              .filter((s) => s.uri && s.title);
          }
          // Fallback to groundingAttributions (old API format)
          else if (Array.isArray(groundingMetadata.groundingAttributions)) {
            sources = groundingMetadata.groundingAttributions
              .map((attribution) => ({
                uri: attribution.web?.uri,
                title: attribution.web?.title,
              }))
              .filter((s) => s.uri && s.title);
          }
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

      setTimeout(async () => {
        // 在完成整个流式响应后，再统一持久化用户消息和模型消息
        // 先保存用户消息，再保存模型消息，确保顺序正确
        try {
          await addUserMessage(
            db,
            appId,
            userId,
            currentSessionId,
            trimmed,
            userMessage.created_at
          );

          const messageData = {
            content: fullText,
            thinkingProcess,
            sources: sources || [],
            suggestedReplies,
            generatedWithThinking: !!thinkingProcess,
            generatedWithSearch: isSearchMode,
            createdAt: modelCreatedAt,
          };

          await addModelMessage(db, appId, userId, currentSessionId, messageData);
        } catch (e) {
          console.error("Failed to save messages:", e);
        }
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
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      modelMessageId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `model-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
      // 只删除有效UUID格式的消息（过滤掉临时错误消息等）
      const validMessageIds = messagesToDelete
        .map((m) => m.id)
        .filter((id) => {
          // 检查是否为UUID格式（简单检查：包含连字符且不以error-/user-/model-开头）
          // 或者是新格式的UUID（crypto.randomUUID生成的）
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidPattern.test(id);
        });
      
      if (validMessageIds.length > 0) {
        await deleteMessages(
          db,
          appId,
          userId,
          activeSessionId,
          validMessageIds
        );
      }

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
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    <div className="h-screen w-full bg-gray-100 flex items-center justify-center p-2 text-gray-900">
      <div className="relative flex w-full  h-full  bg-white rounded-4xl shadow-soft-card border border-gray-200 overflow-hidden">
        {/* 左侧竖向图标栏（桌面端可见） */}
        <div className="hidden sm:flex flex-col justify-between py-6 px-8 w-12">
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={handleNewChat}
              className="w-9 h-9 rounded-2xl bg-black text-white flex items-center justify-center shadow-soft-card"
              title="新建对话"
            >
              <MessageSquarePlus size={18} />
            </button>
            {/* <button className="w-9 h-9 rounded-2xl bg-white/80 text-gray-400 border border-[#e2d8cd] flex items-center justify-center">
              <Bot size={16} />
            </button> */}
            <button
              className="w-9 h-9 rounded-2xl bg-white/40 text-gray-300 border border-[#efe5da] flex items-center justify-center"
              title="会话历史"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <History size={15} />
            </button>
          </div>
        </div>

        {/* 会话侧边栏（移动端，仅会话历史） */}
        {isSidebarOpen && (
          <div className="sm:hidden absolute inset-y-3 left-3 right-3 max-w-[90vw] mx-auto rounded-3xl bg-white border border-gray-200 shadow-soft-card z-30 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  所有对话
                </span>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-black text-white"
                >
                  <MessageSquarePlus size={12} className="mr-1" />
                  新建
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 text-sm">
              {isConfigMissing && (
                <div className="mb-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  Supabase 配置缺失，请在设置中填写。
                </div>
              )}

              {sessions.length === 0 && (
                <div className="text-xs text-gray-400 px-1 py-2">
                  暂无会话，发送第一条消息开始聊天。
                </div>
              )}

              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      handleSelectSession(session.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`group flex w-full items-center rounded-2xl px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-white hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {session.title || "未命名对话"}
                      </span>
                      <span
                        className={`mt-0.5 text-[11px] ${
                          isActive ? "text-gray-300" : "text-gray-400"
                        }`}
                      >
                        {formatSessionTime(
                          session.created_at || session.createdAt
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session)}
                      className={`ml-2 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs transition-colors ${
                        isActive
                          ? "text-gray-300 hover:bg-red-50 hover:text-red-500"
                          : "text-gray-400 hover:bg-red-50 hover:text-red-500"
                      }`}
                      title="删除会话"
                    >
                      <Trash2 size={14} />
                    </button>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400 flex items-center justify-between">
              <span>会话数：{sessions.length}</span>
            </div>
          </div>
        )}

        {/* 会话侧边栏（桌面端，仅会话历史） */}
        {isSidebarOpen && (
          <div className="hidden sm:flex absolute inset-y-3 left-3 w-72 rounded-3xl bg-white border border-gray-100 shadow-2xl z-30 flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                所有对话
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="px-3 py-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="搜索对话..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 border-none py-2 pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:ring-1 focus:ring-black/5 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-4 text-sm">
              {sessions.length === 0 && (
                <div className="text-xs text-gray-400 px-1 py-2">
                  暂无会话，发送第一条消息开始聊天。
                </div>
              )}

              {Object.entries(getGroupedSessions()).map(([groupName, groupSessions]) => {
                if (groupSessions.length === 0) return null;
                return (
                  <div key={groupName}>
                    <div className="px-2 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      {groupName}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {groupSessions.map((session) => {
                        const isActive = activeSessionId === session.id;
                        return (
                          <button
                            key={session.id}
                            onClick={() => handleSelectSession(session.id)}
                            className={`group flex w-full items-center rounded-xl px-2 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-black text-white"
                                : "bg-white hover:bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium">
                                {session.title || "未命名对话"}
                              </span>
                            </div>
                            {isActive && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(e, session)}
                                className="ml-2 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                                title="删除会话"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            {!isActive && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(e, session)}
                                className="ml-2 hidden group-hover:inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="删除会话"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400 flex items-center justify-between">
              <span>会话数：{sessions.length}</span>
            </div>
          </div>
        )}

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 顶部栏：左侧小图标 + 右侧 Get Pro */}
          <header className="flex items-center justify-between px-4 sm:px-8 pt-5 sm:pt-6">
            {/* 仅移动端显示的会话按钮 */}
            <button
              type="button"
              className="w-8 h-8 rounded-2xl border border-[#e4d9ce] flex items-center justify-center text-gray-400 bg-white/80 sm:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <LayoutGrid size={15} />
            </button>

            <button
              type="button"
              className="ml-auto inline-flex items-center rounded-full bg-black text-white text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 shadow-soft-card"
              onClick={() => setIsSettingsModalOpen(true)}
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 via-gray-50 to-gray-400" />
            </button>
          </header>

          {/* 中心聊天区域 */}
          <main className="flex-1 flex flex-col items-center justify-between px-3 sm:px-10 pb-4 sm:pb-2 pt-4 sm:pt-2 min-h-0">
            {/* 中间：标题 + 消息列表 */}
            <div className="flex-1 w-full flex flex-col items-center min-h-0 overflow-auto">
              <div className="w-full max-w-3xl flex-1 flex flex-col items-center">
                {/* 首屏标题 */}
                {messages.length === 0 && !isSessionLoading && (
                  <div className="pt-16 pb-10 text-center">
                    <h1 className="text-3xl sm:text-4xl font-semibold text-black mb-4">
                      What can I help with?
                    </h1>
                  </div>
                )}

                {/* 消息列表 */}
                <div className="flex-1 w-full overflow-y-auto flex flex-col space-y-2 pb-4">
                  {isSessionLoading && (
                    <div className="flex justify-center pt-10">
                      <div className="inline-flex items-center rounded-full bg-black text-white px-4 py-2 text-xs shadow-soft-card">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        正在加载会话…
                      </div>
                    </div>
                  )}

                  {messages.map((msg, index) => (
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
                        msg.role === "model" &&
                        messages
                          .slice(index + 1)
                          .every((m) => m.role !== "model")
                      }
                    />
                  ))}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* 底部提示条（首屏时显示） */}
            {messages.length === 0 && (
              <div className="w-full max-w-xl mb-4">
                <div className="mx-auto rounded-full bg-[#f2ebe2] px-5 py-3 text-[11px] text-gray-600 text-center shadow-sm">
                  You’ve hit the Free plan limit for BeeBot.
                  <span className="block text-gray-500 mt-0.5">
                    Responses may be slower until your limit resets.
                  </span>
                </div>
              </div>
            )}

            {/* 建议问句 + 输入区域 */}
            <div className="w-full max-w-3xl">
              {suggestedReplies.length > 0 && (
                <div className="mb-2 p-2 flex flex-wrap gap-2 rounded-[26px] border border-gray-200 shadow-soft-card">
                  {suggestedReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedReplyClick(reply)}
                      className="px-3 py-2 rounded-3xl bg-bubble-hint text-[13px] text-gray-800 hover:bg-[#f1e5d6] transition-colors max-w-full text-
  left"
                    >
                      <SuggestedReplyMarkdown content={reply} />
                    </button>
                  ))}
                </div>
              )}

              {/* 输入卡片 */}
              <form onSubmit={handleSendMessage} className="relative w-full">
                <div className="flex items-center rounded-[26px] bg-white shadow-soft-card border border-[#efe4d7] px-4 py-2 sm:py-3">
                  {/* 左侧工具按钮：上传 / Search / Thinking */}
                  <div
                    className="flex items-center space-x-2 mr-3 text-gray-400"
                    ref={uploadMenuRef}
                  >
                    <button
                      type="button"
                      onClick={() => setIsUploadMenuOpen((p) => !p)}
                      className="w-6 h-6 rounded-full border border-[#e4d7c8] flex items-center justify-center hover:bg-bubble-hint/60 transition-   
  colors"
                      title="上传文件 (暂不可用)"
                    >
                      <Plus size={14} />
                    </button>
                   
                    <button
                      type="button"
                      onClick={() => setIsThinkingMode((p) => !p)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] border ${
                        isThinkingMode
                          ? "bg-black text-white border-black"
                          : "border-[#e4d7c8] text-gray-500 bg-white"
                      }`}
                    >
                      <Brain size={13} />
                    </button>
                     <button
                      type="button"
                      onClick={() => setIsSearchMode((p) => !p)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] border ${
                        isSearchMode
                          ? "bg-black text-white border-black"
                          : "border-[#e4d7c8] text-gray-500 bg-white"
                      }`}
                    >
                      <Globe size={13} />
                    </button>
                  </div>

                  {/* 输入框本体 */}
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
                      isLoading ? "正在思考中..." : "Ask anything"
                    }
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] sm:text-[15px] placeholder:text-gray-400"
                  />

                  {/* 模型小标签（桌面显示） */}
                  <div
                    className="ml-3 hidden sm:flex items-center"
                    ref={modelMenuRef}
                  >
                    <button
                      type="button"
                      onClick={() => setIsModelMenuOpen((p) => !p)}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-bubble-hint text-[11px] text-gray-700 hover:bg-[#f1e5d6] border
  border-[#e6d9ca]"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded-full mr-1.5">
                        <img
                          src={GeminiLogo}
                          alt="Google Gemini"
                          className="w-3 h-3"
                        />
                      </span>
                      {selectedModel === "gemini-2.5-flash"
                        ? "2.5 Flash"
                        : "2.5 Pro"}
                      <ChevronsUpDown size={12} className="ml-1" />
                    </button>
                  </div>

                  {/* 发送按钮 */}
                  <button
                    type="submit"
                    disabled={isLoading || !currentInput.trim()}
                    className="ml-3 w-8 h-8 rounded-2xl bg-black text-white flex items-center justify-center shadow-soft-card disabled:opacity-40    
  disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </button>
                </div>

                {/* 上传菜单 */}
                {isUploadMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-white border border-gray-200 rounded-2xl shadow-soft-card z-20">
                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
                      上传（开发中）
                    </div>
                    <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <File size={16} className="mr-2 text-gray-500" /> 上传文档
                    </button>
                    <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Image size={16} className="mr-2 text-gray-500" />{" "}
                      上传图片
                    </button>
                    <button className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Video size={16} className="mr-2 text-gray-500" />{" "}
                      上传视频
                    </button>
                    <button
                      className="flex items-center w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-
  b-2xl"
                    >
                      <Mic size={16} className="mr-2 text-gray-500" /> 上传音频
                    </button>
                  </div>
                )}

                {/* 模型选择弹层 */}
                {isModelMenuOpen && (
                  <div 
                    className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-soft-card z-50"
                  >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel("gemini-2.5-flash");
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-bubble-hint transition-colors ${
                        selectedModel === "gemini-2.5-flash"
                          ? "text-gray-900 bg-bubble-hint"
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
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-black text-white">
                          当前
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel("gemini-2.5-pro");
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-bubble-hint transition-colors        
  rounded-b-2xl ${
    selectedModel === "gemini-2.5-pro"
      ? "text-gray-900 bg-bubble-hint"
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
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-black text-white">
                          当前
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </form>

              {/* Summarize 入口（为了保留功能，可以弱化为小文字按钮） */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSummarizeChat}
                  disabled={
                    isLoading || isSummaryLoading || messages.length === 0
                  }
                  className="text-[11px] text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center">
                    <Sparkles size={12} className="mr-1" />
                    总结当前对话
                  </span>
                </button>
              </div>

              <p className="mt-1 text-center text-[11px] text-gray-400">
                AI can make mistakes. Please double-check responses.
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* 移动端底部小横条（纯装饰） */}
      <div className="sm:hidden fixed bottom-2 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-24 h-1.5 rounded-full bg-black/10" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md m-4 rounded-3xl shadow-2xl overflow-hidden p-6">
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
            <div className="mb-6 text-sm text-gray-700">
              确定要删除「
              <span className="font-medium">
                {deleteTargetSession.title || "此聊天"}
              </span>
              」的聊天记录吗？
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30 transition-all transform hover:-translate-y-0.5"
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
