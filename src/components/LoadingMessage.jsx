import React from 'react'

export default function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-xl p-4 rounded-xl shadow-md bg-white text-gray-800 rounded-bl-none border border-gray-200">
        <div className="flex items-center space-x-1 px-2">
          <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
        </div>
      </div>
    </div>
  )
}

