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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">初始化数据库</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-700">检测到首次使用或缺少表。请将以下 SQL 复制到 Supabase SQL Editor 执行（public 模式），然后返回点击关闭按钮。</p>
          <div className="relative">
            <button onClick={handleCopy} className="absolute right-2 top-2 p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"><Copy size={16} /></button>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-[60vh] text-xs whitespace-pre-wrap">{sql}</pre>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">我已完成初始化</button>
        </div>
      </div>
    </div>
  )
}

