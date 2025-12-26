
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToPortal } from '../services/geminiService';
import ProjectCard from './ProjectCard';

const STORAGE_KEY = 'portal_chat_history';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on initial mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Robust auto-scroll to bottom behavior
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.text }]
    }));

    try {
      const response = await sendMessageToPortal(userMessage.text, history);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text,
        cards: response.cards
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm("End session and clear portal history?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-6 relative">
      {/* Reset Session Control */}
      {messages.length > 0 && (
        <button 
          onClick={clearHistory}
          className="fixed top-[18vh] right-8 md:right-12 z-20 text-[9px] uppercase tracking-[0.3em] text-white/20 hover:text-white/50 transition-colors font-bold"
        >
          Reset
        </button>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-48 pt-[35vh]"
      >
        <div className="space-y-16">
          {messages.length === 0 && (
            <div className="animate-in fade-in duration-1000">
               <div className="text-white/20 text-sm font-light italic pl-8 border-l border-white/5 tracking-tight">
                Portal is open. Silence waiting for inquiry.
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className={`text-base leading-relaxed ${
                message.role === 'user' 
                  ? 'text-white/90 font-medium' 
                  : 'text-white/75 pl-8 border-l border-white/5 italic'
              }`}>
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-light tracking-wide">
                  {message.text}
                </div>
              </div>

              {message.cards && message.cards.length > 0 && (
                <div className="w-full">
                  {message.cards.map((card, i) => {
                    if (card.type === 'project') {
                      return <ProjectCard key={i} project={card.content} />;
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-1.5 pl-8 py-2 opacity-30">
              <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Input Area */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent">
        <div className="max-w-2xl mx-auto px-6 h-full flex items-center justify-center">
          <form 
            onSubmit={handleSubmit}
            className="w-full flex items-center pointer-events-auto"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something real."
              autoFocus
              className="w-full bg-transparent border-none py-6 text-lg font-light focus:outline-none focus:ring-0 text-white placeholder-white/10 caret-white"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
