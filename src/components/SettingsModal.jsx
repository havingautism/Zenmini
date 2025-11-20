import React, { useState } from "react";
import {
  X,
  Settings,
  Monitor,
  Cpu,
  MessageSquare,
  Palette,
  User,
  Info,
  KeyRound,
  Link,
  Volume2,
} from "lucide-react";
import InputWithIcon from "./InputWithIcon";

export default function SettingsModal({
  isOpen,
  onClose,
  currentGeminiApiKey,
  currentSbConfig,
  onSave,
  isAutoPlayTts,
  onToggleAutoPlayTts,
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [localGeminiKey, setLocalGeminiKey] = useState(currentGeminiApiKey);
  const [sbConfig, setSbConfig] = useState(
    currentSbConfig || { url: "", anonKey: "" }
  );

  const handleSave = () => {
    onSave(localGeminiKey, null, sbConfig);
    onClose();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "general", label: "通用", icon: Settings },
    { id: "interface", label: "界面", icon: Monitor },
    { id: "model", label: "模型", icon: Cpu },
    { id: "chat", label: "对话", icon: MessageSquare },
    { id: "personalization", label: "个性化", icon: Palette },
    { id: "account", label: "账号", icon: User },
    { id: "about", label: "关于", icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl h-[600px] rounded-3xl shadow-2xl flex overflow-hidden m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50/50 border-r border-gray-100 flex flex-col">
          <div className="p-6 pb-4">
            <h2 className="text-xl font-bold text-gray-900">设置</h2>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`mr-3 ${
                      isActive ? "text-black" : "text-gray-400"
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeTab === "general" && (
              <div className="space-y-8 max-w-2xl">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Gemini API Key
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      用于访问 Google Gemini 模型的密钥。
                    </p>
                    <div className="relative">
                      <KeyRound
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="password"
                        value={localGeminiKey}
                        onChange={(e) => setLocalGeminiKey(e.target.value)}
                        placeholder="g-..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 transition-all"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-gray-100">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      Supabase 配置
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      用于同步和存储聊天记录。
                    </p>
                    {(() => {
                      const envUrl = import.meta.env.VITE_SUPABASE_URL;
                      const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                      const isEnvConfigured = envUrl && envKey;

                      if (isEnvConfigured) {
                        return (
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-xs text-gray-600">
                              ✓ Supabase 已通过环境变量配置
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              配置来源：.env
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <InputWithIcon
                            id="sb_url"
                            name="url"
                            label="Supabase URL"
                            value={sbConfig.url}
                            onChange={(e) =>
                              setSbConfig((p) => ({ ...p, url: e.target.value }))
                            }
                            icon={<Link size={16} />}
                          />
                          <InputWithIcon
                            id="sb_anon"
                            name="anonKey"
                            label="Anon Key"
                            value={sbConfig.anonKey}
                            onChange={(e) =>
                              setSbConfig((p) => ({
                                ...p,
                                anonKey: e.target.value,
                              }))
                            }
                            icon={<KeyRound size={16} />}
                            isPassword
                          />
                        </div>
                      );
                    })()}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="space-y-8 max-w-2xl">
                <section className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          自动播放语音 (TTS)
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          AI 回复完成后自动朗读内容
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onToggleAutoPlayTts}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isAutoPlayTts ? "bg-black" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`${
                          isAutoPlayTts ? "translate-x-6" : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>
                </section>
              </div>
            )}

            {["interface", "model", "personalization", "account", "about"].includes(
              activeTab
            ) && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  {React.createElement(
                    tabs.find((t) => t.id === activeTab)?.icon,
                    { size: 32, className: "opacity-20" }
                  )}
                </div>
                <p className="text-sm">此模块正在开发中</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-5 border-t border-gray-50 flex justify-end space-x-3 bg-white">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-black text-white shadow-lg shadow-black/20 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/20 transition-all transform hover:-translate-y-0.5"
            >
              保存更改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

