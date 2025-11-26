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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface w-full max-w-3xl m-4 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-accent">初始化数据库</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-shell text-accent-subtle hover:text-accent transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-accent-subtle">检测到首次使用或缺少表。请将以下 SQL 复制到 Supabase SQL Editor 执行（public 模式），然后返回点击关闭按钮。</p>
          <div className="relative">
            <button onClick={handleCopy} className="absolute right-2 top-2 p-1.5 rounded-lg bg-surface/10 hover:bg-surface/20 text-accent-subtle hover:text-accent transition-colors"><Copy size={16} /></button>
            <pre className="bg-shell text-accent p-4 rounded-xl overflow-auto max-h-[400px] text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-inner border border-border">{sql}</pre>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end bg-surface">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-accent text-surface shadow-lg shadow-black/20 hover:bg-accent/90 hover:shadow-xl hover:shadow-black/20 transition-all transform hover:-translate-y-0.5">我已完成初始化</button>
        </div>
      </div>
    </div>
  )
}

