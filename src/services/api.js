// API utilities for Gemini

async function fetchWithBackoff(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise((res) => setTimeout(res, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function callGeminiApi(
  history,
  modelToUse,
  isSearchEnabled,
  isThinkingEnabled,
  userApiKey
) {
  const apiKey = userApiKey || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

  const payload = { contents: history };
  const systemInstructions = [];

  systemInstructions.push(
    "Respond *only* with the plain text answer. Do not include pinyin, romanization, or automatic translations unless the user explicitly asks for them."
  );

  // 统一思考模式配置，适用于支持思考模式的模型
  if (isThinkingEnabled) {
    payload.generationConfig = {
      thinkingConfig: {
        thinkingBudget: -1, // 使用动态思考预算
        includeThoughts: true,
      },
    };
  }

  if (isSearchEnabled) {
    payload.tools = [{ google_search: {} }];
  }

  if (systemInstructions.length > 0) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructions.join(" ") }],
    };
  }

  try {
    const response = await fetchWithBackoff(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (candidate && candidate.content?.parts) {
      let thinkingProcess = null;
      let finalAnswer = "";
      let sources = [];

      // 处理思考模式的响应
      if (isThinkingEnabled) {
        // 统一处理思考模式响应
        const parts = candidate.content.parts;
        const thoughtParts = [];
        const answerParts = [];

        parts.forEach((part) => {
          if (part.thought) {
            thoughtParts.push(part.text);
          } else if (part.text) {
            answerParts.push(part.text);
          }
        });

        thinkingProcess = thoughtParts.join("").trim();
        finalAnswer = answerParts.join("").trim();

        // 如果没有思考内容，说明模型不支持思考模式，使用普通响应
        if (!thinkingProcess && !finalAnswer) {
          finalAnswer = candidate.content.parts
            .map((part) => part.text || "")
            .join("")
            .trim();
        }
      } else {
        // 非思考模式的普通响应
        finalAnswer = candidate.content.parts
          .map((part) => part.text || "")
          .join("")
          .trim();
      }

      // 处理 grounding metadata
      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata) {
        // Try groundingChunks first (new API format)
        if (Array.isArray(groundingMetadata.groundingChunks)) {
          sources = groundingMetadata.groundingChunks
            .map((chunk) => ({
              uri: chunk.web?.uri,
              title: chunk.web?.title,
            }))
            .filter((source) => source.uri && source.title);
        }
        // Fallback to groundingAttributions (old API format)
        else if (Array.isArray(groundingMetadata.groundingAttributions)) {
          sources = groundingMetadata.groundingAttributions
            .map((attribution) => ({
              uri: attribution.web?.uri,
              title: attribution.web?.title,
            }))
            .filter((source) => source.uri && source.title);
        }
      }

      return {
        text: finalAnswer,
        thinkingProcess: thinkingProcess || undefined,
        sources,
      };
    } else {
      return {
        text: "抱歉，我暂时无法回答。(API 响应格式错误)",
        sources: [],
        thinkingProcess: null,
      };
    }
  } catch (error) {
    return {
      text: "抱歉，连接 AI 时出错，请稍后再试。😥",
      sources: [],
      thinkingProcess: null,
    };
  }
}

async function callGeminiForStructuredJson(
  history,
  systemPrompt,
  responseSchema,
  userApiKey
) {
  const apiKey = userApiKey || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: history,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json", responseSchema },
  };

  const response = await fetchWithBackoff(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  const candidate = result.candidates?.[0];
  if (candidate && candidate.content?.parts?.[0]?.text) {
    const jsonText = candidate.content.parts[0].text;
    return JSON.parse(jsonText);
  }
  throw new Error("API response format error (JSON)");
}

async function callGeminiTtsApi(textToSpeak, userApiKey) {
  const apiKey = userApiKey || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: textToSpeak }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };

  const response = await fetchWithBackoff(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;
  if (audioData && mimeType && mimeType.startsWith("audio/")) {
    return { audioData, mimeType };
  }
  throw new Error("API response format error (TTS)");
}

async function callGeminiForTranslation(
  textToTranslate,
  targetLanguage,
  userApiKey
) {
  const apiKey = userApiKey || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: textToTranslate }] }],
    systemInstruction: {
      parts: [
        {
          text: `Translate the following text to ${targetLanguage}. Respond ONLY with the translated text, and nothing else.`,
        },
      ],
    },
  };

  try {
    const response = await fetchWithBackoff(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate && candidate.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }
    throw new Error("Invalid translation response format.");
  } catch (e) {
    return "翻译失败。";
  }
}

export {
  fetchWithBackoff,
  callGeminiApi,
  callGeminiForStructuredJson,
  callGeminiTtsApi,
  callGeminiForTranslation,
};
