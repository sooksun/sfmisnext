'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Trash2, StopCircle, Sparkles } from 'lucide-react'
import { useAiChat } from './use-ai-chat'
import { AiMessage } from './ai-message'
import { useAiChatStore } from '@/stores/ai-chat-store'

interface AiChatDialogProps {
  scId: number
  budgetYear: string
  scName?: string
}

const QUICK_ACTIONS = [
  { label: 'สรุปงบประมาณ', message: 'สรุปงบประมาณปีนี้ให้หน่อย' },
  { label: 'ยอดคงเหลือ', message: 'ยอดคงเหลือปัจจุบันเท่าไร' },
  { label: 'สัญญายืมเงิน', message: 'สถานะสัญญายืมเงินตอนนี้เป็นอย่างไร' },
  { label: 'รายจ่ายเดือนนี้', message: 'สรุปรายจ่ายเดือนนี้' },
]

export function AiChatDialog({ scId, budgetYear, scName }: AiChatDialogProps) {
  const { isOpen, setOpen } = useAiChatStore()
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages } =
    useAiChat({ scId, budgetYear, scName, context: 'dashboard' })
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex w-[400px] flex-col rounded-xl border bg-white shadow-2xl"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <span className="font-semibold text-white text-sm">AI Assistant</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
            Gemini
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="rounded p-1 text-white/70 hover:bg-white/20 hover:text-white"
            title="ล้างประวัติ"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3" style={{ minHeight: 200, maxHeight: 400 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles className="h-10 w-10 text-emerald-300" />
            <p className="text-sm text-gray-500">
              สวัสดีครับ! ผมเป็น AI ผู้ช่วยระบบ SFMIS
              <br />
              ถามเกี่ยวกับการเงินได้เลยครับ
            </p>
            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.message)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <AiMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ถามเกี่ยวกับการเงิน..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600 transition-colors"
              title="หยุดสร้างคำตอบ"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
