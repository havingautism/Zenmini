import React from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import Loader from "./Loader";
export default function SummaryModal({ content, isLoading, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full max-w-lg m-4 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center text-accent">
            {/* <Sparkles size={18} className="mr-2 text-yellow-500" /> */}
            对话总结
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-shell text-accent-subtle hover:text-accent transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-accent">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end bg-surface">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-accent text-surface shadow-lg shadow-black/20 hover:bg-accent/90 hover:shadow-xl hover:shadow-black/20 transition-all transform hover:-translate-y-0.5"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
