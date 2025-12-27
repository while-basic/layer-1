'use client'

import ReactMarkdown from 'react-markdown'
import type { Message as MessageType } from '@/types'

interface MessageProps {
  message: MessageType
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-3xl ${
          isUser ? 'bg-white/10 text-white' : 'bg-transparent text-white/90'
        } rounded-lg px-6 py-4`}
      >
        <div className="prose">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Source citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-white/50 text-xs mb-2">Sources:</div>
            <div className="space-y-1">
              {message.sources.map((source, i) => (
                <div key={i} className="text-white/30 text-xs">
                  [{i + 1}] {source.source} - {source.section}
                  <span className="ml-2 text-white/20">
                    ({(source.score * 100).toFixed(0)}% relevant)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-white/50 text-xs mb-2">Tools Used:</div>
            {message.toolResults.map((result, i) => (
              <div key={i} className="text-white/40 text-xs mb-1">
                • {result.tool}
                {!result.success && (
                  <span className="text-red-400 ml-2">(failed)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
