import React from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
export default function SummaryModal({ content, isLoading, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg m-4 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
          <h3 className="text-lg font-semibold flex items-center text-gray-900">
            <Sparkles size={18} className="mr-2 text-yellow-500" />
            对话总结
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-700">正在生成总结...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-gray-800">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-50 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-black text-white shadow-lg shadow-black/20 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/20 transition-all transform hover:-translate-y-0.5"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
