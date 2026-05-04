'use client'
import { useCallback, useRef } from 'react'
import { useAiChatStore } from '@/stores/ai-chat-store'
import { getAccessToken, setAuthToken } from '@/lib/auth-token'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

interface UseChatOptions {
  scId: number
  budgetYear: string
  scName?: string
  context?: string
}

/**
 * Custom hook สำหรับ AI Chat — รองรับ streaming
 */
export function useAiChat(opts: UseChatOptions) {
  const {
    messages,
    isLoading,
    addMessage,
    appendToMessage,
    setLoading,
    clearMessages,
  } = useAiChatStore()
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      // เพิ่ม user message
      addMessage({ role: 'user', content: text.trim() })

      // สร้าง assistant placeholder
      const assistantId = addMessage({ role: 'assistant', content: '' })
      setLoading(true)

      // สร้าง history จาก messages ก่อนหน้า (ไม่รวม placeholder)
      const history = messages
        .filter((m) => m.content.length > 0)
        .slice(-10) // ส่ง 10 ข้อความล่าสุด
        .map((m) => ({ role: m.role, content: m.content }))

      // ดึง token จาก auth-token store (in-memory + sessionStorage fallback)
      let token = getAccessToken() || ''
      if (!token) {
        // NextAuth session fallback
        try {
          const { getSession } = await import('next-auth/react')
          const session = await getSession()
          const sessionToken = (session as unknown as Record<string, unknown>)?.access_token as string | undefined
          if (sessionToken) {
            const user = session?.user as Record<string, unknown> | undefined
            setAuthToken(sessionToken, Number(user?.id ?? 0), Number(user?.sc_id ?? 0))
            token = sessionToken
          }
        } catch { /* ignore */ }
      }

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        const res = await fetch(`${BASE_URL}ai/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text.trim(),
            sc_id: opts.scId,
            budget_year: opts.budgetYear,
            sc_name: opts.scName,
            context: opts.context,
            history,
          }),
          signal: abortController.signal,
        })

        if (!res.ok) {
          // fallback ไป non-streaming
          const errText = await res.text()
          appendToMessage(
            assistantId,
            `ขออภัย ไม่สามารถเชื่อมต่อ AI ได้ (${res.status}): ${errText.substring(0, 100)}`,
          )
          setLoading(false)
          return
        }

        // อ่าน SSE stream
        const reader = res.body?.getReader()
        if (!reader) {
          appendToMessage(assistantId, 'ไม่สามารถอ่าน stream ได้')
          setLoading(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                appendToMessage(assistantId, parsed.content)
              }
              if (parsed.error) {
                appendToMessage(assistantId, `\n\n❌ ${parsed.error}`)
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          appendToMessage(assistantId, 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
        }
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [messages, isLoading, opts, addMessage, appendToMessage, setLoading],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [setLoading])

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    clearMessages,
  }
}
