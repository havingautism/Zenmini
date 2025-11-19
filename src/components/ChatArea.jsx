import React from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { Sparkles } from 'lucide-react';

export default function ChatArea({
  messages,
  currentInput,
  setCurrentInput,
  onSubmit,
  isLoading,
  suggestedReplies,
  isThinkingMode,
  isSearchMode,
  onSuggestionClick,
  messagesEndRef
}) {
  return (
    <div className="flex flex-col h-full w-full bg-surface-alt relative">
      {/* Header (optional, maybe just a title or model selector) */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={20} />
          <span className="font-semibold text-text-main">Gemini Chat</span>
          <span className="text-xs px-2 py-1 rounded-full bg-primary-light text-primary font-medium">
            {isThinkingMode ? 'Thinking' : 'Fast'}
          </span>
        </div>
        {/* Placeholders for other header actions if needed */}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-light to-white rounded-full flex items-center justify-center mb-6 shadow-glow">
              <Sparkles size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-2">How can I help you today?</h2>
            <p className="text-text-muted max-w-md">
              Ask me anything about coding, creative writing, or general knowledge.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} messagesEndRef={messagesEndRef} />
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 w-full max-w-4xl mx-auto">
        <InputArea 
          value={currentInput}
          onChange={setCurrentInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
          suggestedReplies={suggestedReplies}
          onSuggestionClick={onSuggestionClick}
        />
      </div>
    </div>
  );
}
