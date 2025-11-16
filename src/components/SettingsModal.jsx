import React, { useState } from 'react'
import { SlidersHorizontal, X, KeyRound, Link } from 'lucide-react'
import InputWithIcon from './InputWithIcon'

export default function SettingsModal({
  isOpen,
  onClose,
  currentGeminiApiKey,
  currentSbConfig,
  onSave,
  isAutoPlayTts,
  onToggleAutoPlayTts,
}) {
  const [localGeminiKey, setLocalGeminiKey] = useState(currentGeminiApiKey)
  const [sbConfig, setSbConfig] = useState(currentSbConfig || { url: '', anonKey: '' })

  const handleSave = () => {
    onSave(localGeminiKey, null, sbConfig)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold flex items-center text-gray-900">
            <SlidersHorizontal size={18} className="mr-2 text-indigo-600" />
            设置 (本地开发)
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="geminiApiKey"
                type="password"
                value={localGeminiKey}
                onChange={(e) => setLocalGeminiKey(e.target.value)}
                placeholder="g-..."
                className="w-full p-2 pl-10 bg-gray-100 rounded-md border-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">密钥将安全地存储在您浏览器的 localStorage 中。</p>
          </div>

          <div>
            <label htmlFor="autoPlayTts" className="flex justify-between items-center cursor-pointer">
              <span className="flex flex-col">
                <span className="block text-sm font-medium text-gray-700">自动播放语音 (TTS)</span>
                <span className="text-xs text-gray-500 mt-1">AI 回复后自动朗读</span>
              </span>
              <div className="relative inline-flex items-center h-6 rounded-full w-11">
                <input type="checkbox" id="autoPlayTts" className="sr-only" checked={isAutoPlayTts} onChange={onToggleAutoPlayTts} />
                <span className={`inline-block w-11 h-6 rounded-full transition-colors ${isAutoPlayTts ? 'bg-indigo-600' : 'bg-gray-300'}`}></span>
                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${isAutoPlayTts ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </div>
            </label>
          </div>

          <div className="space-y-3 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800">Supabase 配置</h4>
            <p className="text-xs text-gray-500 -mt-2">(使用 .env 的默认值，可在此覆盖本地值)</p>
            <InputWithIcon id="sb_url" name="url" label="Supabase URL" value={sbConfig.url} onChange={(e) => setSbConfig((p) => ({ ...p, url: e.target.value }))} icon={<Link size={16} />} />
            <InputWithIcon id="sb_anon" name="anonKey" label="Anon Key" value={sbConfig.anonKey} onChange={(e) => setSbConfig((p) => ({ ...p, anonKey: e.target.value }))} icon={<KeyRound size={16} />} isPassword />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 text-right space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">保存并重载</button>
        </div>
      </div>
    </div>
  )
}

