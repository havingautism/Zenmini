import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Layout({ sidebar, chatArea }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-surface-alt overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Mobile Close Button */}
          <div className="md:hidden absolute top-4 right-4">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-text-muted hover:text-text-main"
            >
              <X size={24} />
            </button>
          </div>
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-border bg-surface/80 backdrop-blur-md z-30 absolute top-0 left-0 right-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-text-main"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-semibold text-lg">AI Chat</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 h-full pt-16 md:pt-0">
          {chatArea}
        </div>
      </main>
    </div>
  );
}
