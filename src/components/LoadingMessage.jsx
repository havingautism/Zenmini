import React, { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import Loader from "./Loader";

const THINKING_PHASES = [
  "正在深度思考你的问题…",
  "正在梳理思路和计划…",
  "正在检索和比对相关信息…",
  "正在组织清晰易懂的回答…",
];

export default function LoadingMessage({ isThinking = false }) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) return;

    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % THINKING_PHASES.length);
    }, 1600);

    return () => clearInterval(timer);
  }, [isThinking]);

  if (isThinking) {
    const text = THINKING_PHASES[phaseIndex];
    return (
      <div className="flex justify-start">
        <div className="flex max-w-xl p-4 rounded-2xl shadow-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-bl-none border border-indigo-200/40">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm">
              <Brain className="animate-pulse" size={20} />
            </div>
            <div className="flex flex-col">
              
              <span className="text-sm font-medium">{text}</span>
              <div>
          <Loader />
        </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-xs px-4 py-2 rounded-xl shadow-sm bg-white text-gray-700 rounded-bl-none border border-gray-200">
        <div className="flex items-center justify-center min-w-[60px]">
          <Loader />
        </div>
      </div>
    </div>
  );
}
