import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AiChatState {
  messages: ChatMessage[]
  isOpen: boolean
  isLoading: boolean
  suggestionsEnabled: boolean
  position: { x: number; y: number } | null
  setOpen: (open: boolean) => void
  toggle: () => void
  setSuggestionsEnabled: (enabled: boolean) => void
  setPosition: (position: { x: number; y: number }) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  appendToMessage: (id: string, chunk: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

let msgCounter = 0

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      suggestionsEnabled: true,
      position: null,

      setOpen: (open) => set({ isOpen: open }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setSuggestionsEnabled: (enabled) => set({ suggestionsEnabled: enabled }),
      setPosition: (position) => set({ position }),

      addMessage: (msg) => {
        const id = `msg-${Date.now()}-${++msgCounter}`
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id, timestamp: Date.now() },
          ],
        }))
        return id
      },

      updateMessage: (id, content) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, content } : m,
          ),
        })),

      appendToMessage: (id, chunk) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, content: m.content + chunk } : m,
          ),
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'sfmis-ai-chat',
      partialize: (s) => ({
        messages: s.messages.slice(-50),
        suggestionsEnabled: s.suggestionsEnabled,
        position: s.position,
      }), // เก็บแค่ 50 ข้อความล่าสุด + ตำแหน่ง/การเปิดคำแนะนำ
    },
  ),
)
