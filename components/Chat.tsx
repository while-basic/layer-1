'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { useCommands } from '@/hooks/useCommands'
import Message from './Message'
import CommandPalette from './CommandPalette'

export default function Chat() {
  const { messages, input, setInput, isLoading, sendMessage } = useChat()
  const { showCommands, filteredCommands, selectedIndex, handleCommandSelect } =
    useCommands(input)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Handle arrow navigation in CommandPalette
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Handle arrow navigation in CommandPalette
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        handleCommandSelect(filteredCommands[selectedIndex])
      } else if (e.key === 'Escape') {
        setInput('')
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="p-8 border-b border-white/10">
        <h1 className="text-white text-3xl font-bold">Christopher Celaya</h1>
        <p className="text-white/50 text-sm mt-2">
          AI Research Platform • Conversational Knowledge Gateway
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-white/30 text-center mt-20">
            <p className="text-lg mb-4">
              Ask anything about my research, projects, or expertise.
            </p>
            <p className="text-sm">
              Type <span className="text-white/50">/</span> for commands
            </p>
          </div>
        )}

        {messages.map(message => (
          <Message key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 py-4">
            <div className="flex space-x-1.5">
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-8 border-t border-white/10">
        <div className="relative max-w-4xl mx-auto">
          {showCommands && (
            <CommandPalette
              commands={filteredCommands}
              selectedIndex={selectedIndex}
              onSelect={handleCommandSelect}
            />
          )}

          <form onSubmit={handleSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask anything..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
            />

            <div className="mt-2 text-white/30 text-xs flex justify-between">
              <span>Type / for commands • Shift+Enter for new line</span>
              <span>{messages.length} messages</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
