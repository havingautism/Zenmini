import React from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

export default function SummaryModal({ content, isLoading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center text-gray-900">
            <Sparkles size={18} className="mr-2 text-yellow-500" />
            对话总结
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-700">正在生成总结...</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-gray-800">{content}</p>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

