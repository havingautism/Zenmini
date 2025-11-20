import React from 'react'
import { Copy, X } from 'lucide-react'

export default function SchemaInitModal({ sql, onClose }) {
  const handleCopy = () => {
    const ta = document.createElement('textarea')
    ta.value = sql
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl m-4 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">初始化数据库</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-700">检测到首次使用或缺少表。请将以下 SQL 复制到 Supabase SQL Editor 执行（public 模式），然后返回点击关闭按钮。</p>
          <div className="relative">
            <button onClick={handleCopy} className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"><Copy size={16} /></button>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-auto max-h-[400px] text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-inner">{sql}</pre>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-50 flex justify-end bg-white">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-black text-white shadow-lg shadow-black/20 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/20 transition-all transform hover:-translate-y-0.5">我已完成初始化</button>
        </div>
      </div>
    </div>
  )
}

