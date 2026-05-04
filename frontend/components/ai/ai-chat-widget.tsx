'use client'
import { Sparkles } from 'lucide-react'
import { useAiChatStore } from '@/stores/ai-chat-store'
import { AiChatDialog } from './ai-chat-dialog'
import { useAppContext } from '@/hooks/use-app-context'

/**
 * Floating AI Chat Widget — แสดงทุกหน้าใน dashboard
 * ดึง scId, budgetYear จาก Zustand store ผ่าน useAppContext
 */
export function AiChatWidget() {
  const { isOpen, toggle } = useAiChatStore()
  const { scId, scName, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543) // CE

  // ไม่แสดงถ้าไม่มี context
  if (!scId) return null

  return (
    <>
      {/* Chat Dialog */}
      <AiChatDialog scId={scId} budgetYear={budgetYear} scName={scName} />

      {/* Floating Button */}
      <button
        onClick={toggle}
        className={`fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800 scale-90'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 scale-100'
        }`}
        title={isOpen ? 'ปิด AI Chat' : 'เปิด AI Chat'}
      >
        <Sparkles className={`h-6 w-6 text-white transition-transform ${isOpen ? 'rotate-45' : ''}`} />
      </button>
    </>
  )
}
