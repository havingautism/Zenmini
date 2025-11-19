import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, MoreVertical } from 'lucide-react';

export default function Sidebar({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession,
  onOpenSettings
}) {
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header / New Chat */}
      <div className="p-4 md:p-6">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-xl shadow-glow transition-all duration-200 font-medium"
        >
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">
          Recent
        </div>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`
              group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
              ${activeSessionId === session.id 
                ? 'bg-primary-light text-primary' 
                : 'hover:bg-surface-alt text-text-main'
              }
            `}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare size={18} className={activeSessionId === session.id ? 'text-primary' : 'text-text-muted'} />
            <div className="flex-1 truncate text-sm font-medium">
              {session.title || 'New Conversation'}
            </div>
            
            {/* Delete Action (visible on hover or active) */}
            <button
              onClick={(e) => onDeleteSession(e, session)}
              className={`
                p-1.5 rounded-lg hover:bg-red-100 hover:text-red-500 transition-colors
                ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0'}
              `}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        
        {sessions.length === 0 && (
          <div className="text-center text-text-muted text-sm py-8">
            No history yet
          </div>
        )}
      </div>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-border">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-surface-alt text-text-main transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">
            AI
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Settings</div>
            <div className="text-xs text-text-muted">Preferences</div>
          </div>
          <Settings size={18} className="text-text-muted" />
        </button>
      </div>
    </div>
  );
}
