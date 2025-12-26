
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { sendMessageToPortal } from '../services/claudeService';
import ProjectCard from './ProjectCard';

const STORAGE_HISTORY_PREFIX = 'portal_history_';

interface ChatInterfaceProps {
  userId?: string;
  onConnectIdentity: (name: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId, onConnectIdentity }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
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
          const parsed: ChatMessage[] = JSON.parse(saved);
          setMessages(parsed);
          if (parsed.length > 0) {
            setActiveMessageId(parsed[parsed.length - 1].id);
          }
        } catch (e) {
          console.error("Failed to restore history", e);
        }
      } else {
        const initialId = 'initial';
        const initialMsg: ChatMessage = {
          id: initialId,
          role: 'assistant',
          text: "The connection is established. You are present."
        };
        setMessages([initialMsg]);
        setActiveMessageId(initialId);
      }
    } else {
      setMessages([]);
      setActiveMessageId(null);
    }
  }, [userId]);

  // Persist message state
  useEffect(() => {
    if (userId && messages.length > 0) {
      localStorage.setItem(`${STORAGE_HISTORY_PREFIX}${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  // Compute the active path from root to current anchor
  const activePathIds = useMemo(() => {
    if (!activeMessageId) return new Set<string>();
    const path = new Set<string>();
    let currentId: string | undefined = activeMessageId;
    while (currentId) {
      path.add(currentId);
      const msg = messages.find(m => m.id === currentId);
      currentId = msg?.parentId;
    }
    return path;
  }, [activeMessageId, messages]);

  // Construct conversation context for Gemini based on the active path
  const getContextHistory = (currentActiveId: string | null) => {
    if (!currentActiveId) return [];
    const path: ChatMessage[] = [];
    let currentId: string | undefined = currentActiveId;
    while (currentId) {
      const msg = messages.find(m => m.id === currentId);
      if (msg) path.unshift(msg);
      currentId = msg?.parentId;
    }
    return path.map(m => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: m.text }]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeMessageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!userId) {
      onConnectIdentity('');
      return;
    }

    const userMsgId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: input.trim(),
      parentId: activeMessageId || undefined
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setActiveMessageId(userMsgId);
    setInput('');
    setIsLoading(true);

    try {
      const history = getContextHistory(userMsgId);
      const response = await sendMessageToPortal(userMessage.text, history);
      
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: response.text || '',
        cards: response.cards || [],
        parentId: userMsgId
      };

      setMessages(prev => [...prev, assistantMessage]);
      setActiveMessageId(assistantMsgId);
    } catch (error) {
      console.error("Portal flicker:", error);
      const errorMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: errorMsgId,
        role: 'assistant',
        text: "The connection is tenuous. Your signal is weak.",
        parentId: userMsgId
      }]);
      setActiveMessageId(errorMsgId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-6">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-48 md:pt-64 pb-12 no-scrollbar"
      >
        <div className="space-y-12">
          {messages.map((m) => {
            const isActive = activePathIds.has(m.id);
            return (
              <div 
                key={m.id} 
                onClick={() => setActiveMessageId(m.id)}
                className={`flex flex-col transition-all duration-700 cursor-pointer group 
                  ${m.role === 'user' ? 'items-end' : 'items-start'}
                  ${isActive ? 'opacity-100' : 'opacity-10 hover:opacity-30'}
                `}
              >
                <div className={`max-w-[90%] md:max-w-[80%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className="prose prose-invert prose-sm font-light leading-relaxed text-white/80 selection:bg-white/10">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                  
                  {isActive && m.cards && m.cards.length > 0 && (
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
            );
          })}
          
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
