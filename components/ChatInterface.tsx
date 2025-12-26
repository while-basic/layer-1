
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { sendMessageToPortal } from '../services/geminiService';
import ProjectCard from './ProjectCard';

const STORAGE_HISTORY_PREFIX = 'portal_history_';

interface ChatInterfaceProps {
  userId?: string;
  onConnectIdentity: (name: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId, onConnectIdentity }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore session history
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`${STORAGE_HISTORY_PREFIX}${userId}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to restore history", e);
        }
      } else {
        setMessages([{
          id: 'initial',
          role: 'assistant',
          text: "The connection is established. You are present."
        }]);
      }
    } else {
      setMessages([]);
    }
  }, [userId]);

  // Persist message state
  useEffect(() => {
    if (userId && messages.length > 0) {
      localStorage.setItem(`${STORAGE_HISTORY_PREFIX}${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  // Reliable scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!userId) {
      onConnectIdentity('');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = newMessages.map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

      const response = await sendMessageToPortal(userMessage.text, history);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text || '',
        cards: response.cards || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Portal flicker:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: "The connection is tenuous. Your signal is weak."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-6">
      {/* Dialogue Layer */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-48 md:pt-64 pb-12 no-scrollbar"
      >
        <div className="space-y-12">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex flex-col animate-in fade-in duration-700 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[90%] md:max-w-[80%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className="prose prose-invert prose-sm font-light leading-relaxed text-white/80 selection:bg-white/10">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                
                {m.cards && m.cards.length > 0 && (
                  <div className="mt-8 space-y-4 w-full md:w-80">
                    {m.cards.map((card, i) => (
                      card.type === 'project' ? (
                        <ProjectCard key={i} project={card.content} />
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 animate-pulse py-4">
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="w-1 h-1 bg-white/20 rounded-full" />
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Bridge */}
      <div className="bg-[#0A0A0A] pb-12 pt-4 relative z-10 border-t border-white/[0.03]">
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={userId ? "Reflect..." : "Connect identity to engage..."}
            className="w-full bg-transparent border-none py-4 text-sm font-light tracking-wide text-white focus:outline-none transition-all placeholder:text-white/[0.05] disabled:opacity-50"
          />
          <div className={`absolute right-0 bottom-4 transition-opacity duration-500 ${input.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-bold">
              Return
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
