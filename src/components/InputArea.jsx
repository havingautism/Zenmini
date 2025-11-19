import React from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon } from 'lucide-react';

export default function InputArea({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading, 
  suggestedReplies, 
  onSuggestionClick 
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Suggested Replies */}
      {suggestedReplies && suggestedReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {suggestedReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick && onSuggestionClick(reply)}
              className="text-xs md:text-sm px-4 py-2 bg-white border border-border rounded-full text-text-muted hover:text-primary hover:border-primary hover:bg-primary-light transition-all shadow-sm"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="relative bg-white border border-border rounded-3xl shadow-soft focus-within:shadow-glow focus-within:border-primary transition-all duration-300">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemini..."
          className="w-full bg-transparent border-none focus:ring-0 resize-none py-4 pl-5 pr-14 min-h-[60px] max-h-[200px] text-text-main placeholder:text-text-muted rounded-3xl"
          rows={1}
          style={{ height: 'auto', minHeight: '60px' }}
        />
        
        {/* Actions */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {/* Attachment Button (Visual Only for now) */}
          <button className="p-2 text-text-muted hover:text-primary hover:bg-surface-alt rounded-full transition-colors">
            <Paperclip size={20} />
          </button>
          
          {/* Send Button */}
          <button
            onClick={() => onSubmit(value)}
            disabled={!value.trim() || isLoading}
            className={`
              p-2 rounded-full transition-all duration-200
              ${value.trim() && !isLoading 
                ? 'bg-primary text-white shadow-lg hover:bg-primary-hover scale-100' 
                : 'bg-surface-alt text-text-muted cursor-not-allowed scale-95 opacity-70'
              }
            `}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      <div className="text-center text-xs text-text-muted">
        Gemini can make mistakes, so double-check it.
      </div>
    </div>
  );
}
