'use client'
import { Bot, User } from 'lucide-react'
import type { ChatMessage } from '@/stores/ai-chat-store'

interface AiMessageProps {
  message: ChatMessage
}

export function AiMessage({ message }: AiMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-indigo-100' : 'bg-emerald-100'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-indigo-600" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-600" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {message.content || (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <span className="animate-pulse">กำลังคิด</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
            <span className="animate-bounce delay-300">.</span>
          </span>
        )}
      </div>
    </div>
  )
}
