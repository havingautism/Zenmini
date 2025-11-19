import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import "./styles/markdown.css";
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
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
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

  const [suggestedReplies, setSuggestedReplies] = useState([]);

  const [isTtsLoading, setIsTtsLoading] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isThinkingMode, setIsThinkingMode] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(true);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [localSbConfig, setLocalSbConfig] = useState(EMPTY_SB_CONFIG);
  const [needsSchemaInit, setNeedsSchemaInit] = useState(false);
  const [schemaSql, setSchemaSql] = useState("");

  const [isAutoPlayTts, setIsAutoPlayTts] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [deleteTargetSession, setDeleteTargetSession] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  // 消息加载
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

        if (fetched && messages.length === 0 && !isSessionActive) {
          const mappedMessages = fetched.map((msg) => ({
            ...msg,
            thinkingProcess: msg.thinkingProcess || msg.thinking_process,
            generatedWithThinking:
              msg.generatedWithThinking || msg.generated_with_thinking,
            generatedWithSearch:
              msg.generatedWithSearch || msg.generated_with_search,
          }));

          setMessages(mappedMessages || []);

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

  useEffect(() => {
    if (activeSessionId && !isSessionActive) {
      loadHistoryMessages(activeSessionId);
      setIsSessionActive(true);
    }
  }, [activeSessionId, loadHistoryMessages, isSessionActive]);

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
    setActiveSessionId(null);
    setMessages([]);
    setSuggestedReplies([]);
    setIsSessionActive(false);
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
      setIsDeleteModalOpen(false);
      setDeleteTargetSession(null);
    }
  };

  const handleSelectSession = async (id) => {
    if (id !== activeSessionId) {
      setIsSessionActive(false);
      setMessages([]);
      setSuggestedReplies([]);
      setIsSessionLoading(true);
      setActiveSessionId(id);
    }
  };

  const handleDeleteSession = (e, session) => {
    e.stopPropagation();
    setDeleteTargetSession(session);
    setIsDeleteModalOpen(true);
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

  const handleStopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setPlayingMessageId(null);
    }
  };

  return (
    <>
      <Layout
        sidebar={
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        }
        chatArea={
          <ChatArea
            messages={messages}
            currentInput={currentInput}
            setCurrentInput={setCurrentInput}
            onSubmit={submitMessage}
            isLoading={isLoading}
            suggestedReplies={suggestedReplies}
            isThinkingMode={isThinkingMode}
            isSearchMode={isSearchMode}
            onSuggestionClick={(reply) => submitMessage(reply)}
            messagesEndRef={messagesEndRef}
          />
        }
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiKey={userApiKey}
        setApiKey={setUserApiKey}
        isAutoPlayTts={isAutoPlayTts}
        setIsAutoPlayTts={setIsAutoPlayTts}
      />

      {needsSchemaInit && (
        <SchemaInitModal
          onClose={() => setNeedsSchemaInit(false)}
          sql={schemaSql}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 transform transition-all scale-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Delete Chat
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
