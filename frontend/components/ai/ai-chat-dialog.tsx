'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  BellOff,
  BellRing,
  GripHorizontal,
  Info,
  MessageCircle,
  Mic,
  MicOff,
  Navigation,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAiChat } from './use-ai-chat'
import { AiMessage } from './ai-message'
import { useAiChatStore } from '@/stores/ai-chat-store'
import { apiGet, apiPost } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AI_DRAFT_STORAGE_KEY, type AiFormDraftPacket } from './ai-form-draft-bridge'

interface AiChatDialogProps {
  scId: number
  budgetYear: string
  scName?: string
}

interface WorkAlert {
  wa_id: number
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string | null
  link: string | null
}

interface TermSuggestion {
  canonical: string
  abbr?: string
  meaning: string
  category: string
  relatedTask?: string
  score: number
  matched: string
}

interface CommandData {
  phase: 'clarify' | 'navigate' | 'prepare'
  message: string
  task_key: string | null
  task_label: string | null
  route: string | null
  open_button: string | null
  draft: Record<string, unknown>
  field_labels: Record<string, string>
  missing_fields: { field: string; label: string; question: string }[]
  suggested_terms: TermSuggestion[]
  safety: { can_save: false; requires_user_review: true }
}

interface BriefingAction {
  label: string
  message: string
  mode: 'command' | 'chat'
}

interface BriefingData {
  greeting: string
  headline: string
  highlights: { severity: 'success' | 'info' | 'warning' | 'error'; icon: string; text: string; link?: string | null }[]
  suggested_actions: BriefingAction[]
  alert_count: number
  generated_at: string
}

interface SpeechResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechResultLike>
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives?: number
  start: () => void
  stop: () => void
  abort?: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const QUICK_ACTIONS = [
  { label: 'ยอดคงเหลือ', message: 'ยอดเงินคงเหลือแยกตามประเภทเงินตอนนี้เท่าไร' },
  { label: 'งานค้าง', message: 'วันนี้มีงานค้างหรือความเสี่ยงอะไรที่ต้องทำก่อน' },
  { label: 'จัดซื้อค้าง', message: 'งานจัดซื้อจัดจ้างค้างอยู่ที่สถานะไหนบ้าง' },
  { label: 'เงินยืมค้าง', message: 'มีสัญญายืมเงินค้างคืนหรือเกินกำหนดกี่รายการ' },
]

const COMMAND_ACTIONS = [
  'เพิ่มโครงการ',
  'รับเงินและออกใบเสร็จ',
  'สร้างใบสำคัญจ่าย',
  'เพิ่มสัญญายืมเงิน',
]

const SEVERITY = {
  error: { Icon: AlertCircle, className: 'border-red-200 bg-red-50 text-red-700' },
  warning: { Icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-700' },
  info: { Icon: Info, className: 'border-blue-200 bg-blue-50 text-blue-700' },
}

export function AiChatDialog({ scId, budgetYear, scName }: AiChatDialogProps) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    isOpen,
    setOpen,
    suggestionsEnabled,
    setSuggestionsEnabled,
    position,
    setPosition,
    addMessage,
    setLoading,
  } = useAiChatStore()
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages } =
    useAiChat({ scId, budgetYear, scName, context: pathname })
  const [mode, setMode] = useState<'chat' | 'command'>('command')
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [commandState, setCommandState] = useState<{ taskKey: string | null; draft: Record<string, unknown> }>({
    taskKey: null,
    draft: {},
  })
  const [suggestedTerms, setSuggestedTerms] = useState<TermSuggestion[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const manualStopRef = useRef(false)
  const baseInputRef = useRef('')
  const finalTranscriptRef = useRef('')
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const { data: alertData } = useQuery<{ data: WorkAlert[] }>({
    queryKey: ['ai-assistant-alerts', scId, budgetYear],
    queryFn: () => apiGet(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: isOpen && suggestionsEnabled && scId > 0,
    refetchInterval: 5 * 60 * 1000,
  })
  const alerts = alertData?.data?.slice(0, 3) ?? []

  // บทสรุปสถานการณ์เชิงรุก — ทักทาย + headline + ปุ่มลัดตามบริบท (rule-based, เบา)
  const { data: briefingData } = useQuery<{ data: BriefingData }>({
    queryKey: ['ai-assistant-briefing', scId, budgetYear, pathname],
    queryFn: () => apiGet(`ai/assistant/briefing/${scId}/${budgetYear}?path=${encodeURIComponent(pathname)}`),
    enabled: isOpen && scId > 0,
    staleTime: 60 * 1000,
  })
  const briefing = briefingData?.data

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // scroll to bottom เมื่อเปิด dialog
  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 50)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
    if (!position) {
      setPosition({ x: Math.max(8, window.innerWidth - 416), y: 72 })
    }
  }, [isOpen, position, setPosition])

  // auto-resize textarea ตามความยาวข้อความ
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  useEffect(() => () => {
    manualStopRef.current = true
    recognitionRef.current?.stop()
  }, [])

  if (!isOpen) return null

  const runCommand = async (text: string) => {
    addMessage({ role: 'user', content: text })
    setLoading(true)
    setSuggestedTerms([])
    try {
      const response = await apiPost<{ flag: boolean; data: CommandData }>('ai/assistant/command', {
        message: text,
        sc_id: scId,
        budget_year: budgetYear,
        current_path: pathname,
        task_key: commandState.taskKey,
        draft: commandState.draft,
      })
      const result = response.data
      addMessage({ role: 'assistant', content: result.message })
      setCommandState({ taskKey: result.task_key, draft: result.draft })
      setSuggestedTerms(result.suggested_terms ?? [])

      if ((result.phase === 'prepare' || result.phase === 'navigate') && result.route) {
        if (result.phase === 'prepare') {
          const packet: AiFormDraftPacket = {
            route: result.route,
            task_label: result.task_label ?? 'งานที่ AI เตรียมให้',
            open_button: result.open_button,
            fields: result.draft,
            field_labels: result.field_labels,
            missing_fields: result.missing_fields,
            created_at: Date.now(),
          }
          sessionStorage.setItem(AI_DRAFT_STORAGE_KEY, JSON.stringify(packet))
        }
        setCommandState({ taskKey: null, draft: {} })
        setOpen(false) // ปิด dialog ก่อน reload (store ไม่ persist isOpen)
        window.location.assign(result.route)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถวิเคราะห์คำสั่งได้'
      addMessage({ role: 'assistant', content: `ขออภัย ${message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    if (mode === 'command') void runCommand(text)
    else sendMessage(text)
  }

  // ปุ่มลัดจาก briefing — รู้โหมดของตัวเอง สลับโหมดให้อัตโนมัติแล้วลงมือ
  const runSuggestedAction = (action: BriefingAction) => {
    if (isLoading) return
    if (action.mode === 'command') {
      setMode('command')
      void runCommand(action.message)
    } else {
      setMode('chat')
      setSuggestedTerms([])
      sendMessage(action.message)
    }
  }

  const toggleSpeech = () => {
    // กำลังอัด → ผู้ใช้กดหยุดเอง: ปิดการ์อัด ข้อความค้างในช่องพิมพ์รอกดส่ง
    if (listening) {
      manualStopRef.current = true
      recognitionRef.current?.stop()
      setListening(false)
      inputRef.current?.focus()
      return
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Constructor) {
      toast.error('เบราว์เซอร์นี้ยังไม่รองรับการพิมพ์ด้วยเสียง')
      return
    }

    // เก็บข้อความเดิมเป็นฐาน แล้วต่อท้ายด้วยเสียงที่พูด
    baseInputRef.current = input.trim()
    finalTranscriptRef.current = ''
    manualStopRef.current = false

    const recognition = new Constructor()
    recognition.lang = 'th-TH'
    recognition.interimResults = true
    recognition.continuous = true // อัดต่อเนื่อง ไม่หยุดเองตอนเงียบ

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const text = res[0]?.transcript ?? ''
        if (res.isFinal) finalTranscriptRef.current += text
        else interim += text
      }
      const base = baseInputRef.current
      const spoken = `${finalTranscriptRef.current}${interim}`
      setInput(`${base}${base && spoken ? ' ' : ''}${spoken}`)
    }

    recognition.onerror = (event) => {
      const err = event?.error
      // no-speech/aborted = เงียบหรือ restart ปกติ → ปล่อยให้ onend ฟังต่อ
      if (err === 'no-speech' || err === 'aborted') return
      manualStopRef.current = true
      setListening(false)
      toast.error('รับเสียงไม่สำเร็จ กรุณาลองอีกครั้ง')
    }

    recognition.onend = () => {
      // เบราว์เซอร์ตัดเองตอนเงียบ แต่ผู้ใช้ยังไม่กดหยุด → ฟังต่อทันที
      if (!manualStopRef.current) {
        try {
          recognition.start()
          return
        } catch {
          /* เริ่มซ้ำไม่ได้ → ถือว่าจบ */
        }
      }
      setListening(false)
    }

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = position ?? { x: Math.max(8, window.innerWidth - 416), y: 72 }
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    const x = dragRef.current.originX + event.clientX - dragRef.current.startX
    const y = dragRef.current.originY + event.clientY - dragRef.current.startY
    setPosition({
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - 408)),
      y: Math.min(Math.max(56, y), Math.max(56, window.innerHeight - 180)),
    })
  }

  return (
    <div
      className="fixed z-50 flex w-[400px] max-w-[calc(100vw-16px)] flex-col rounded-xl border bg-white shadow-2xl"
      style={{
        left: position?.x ?? undefined,
        top: position?.y ?? 72,
        right: position ? undefined : 16,
        maxHeight: 'calc(100vh - 88px)',
      }}
    >
      <div className="rounded-t-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
        <div
          className="flex cursor-move items-center justify-between px-3 py-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { dragRef.current.active = false }}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 text-white/70" />
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">AI ผู้ช่วยอัจฉริยะ</span>
          </div>
          <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
            <button
              onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
              className="rounded p-1 text-white/80 hover:bg-white/20"
              title={suggestionsEnabled ? 'ปิดคำแนะนำ' : 'เปิดคำแนะนำ'}
            >
              {suggestionsEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button onClick={() => { clearMessages(); setSuggestedTerms([]); setCommandState({ taskKey: null, draft: {} }) }} className="rounded p-1 text-white/80 hover:bg-white/20" title="ล้างประวัติ">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-white/80 hover:bg-white/20" title="ปิด">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 px-3 pb-2">
          <button
            onClick={() => setMode('command')}
            className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs', mode === 'command' ? 'bg-white text-emerald-700' : 'bg-white/15')}
          >
            <WandSparkles className="h-3.5 w-3.5" /> สั่งเตรียมงาน
          </button>
          <button
            onClick={() => { setMode('chat'); setSuggestedTerms([]) }}
            className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs', mode === 'chat' ? 'bg-white text-emerald-700' : 'bg-white/15')}
          >
            <MessageCircle className="h-3.5 w-3.5" /> ถามข้อมูล
          </button>
        </div>
      </div>

      {suggestionsEnabled && alerts.length > 0 && (
        <div className="space-y-1.5 border-b bg-slate-50 p-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>คำแนะนำก่อนเริ่มงาน</span>
            <button onClick={() => router.push('/sfmis/work-alerts')} className="text-emerald-700 hover:underline">ดูทั้งหมด</button>
          </div>
          {alerts.map((alert) => {
            const meta = SEVERITY[alert.severity] ?? SEVERITY.info
            return (
              <button
                key={alert.wa_id}
                onClick={() => alert.link && router.push(alert.link)}
                className={cn('flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs', meta.className)}
              >
                <meta.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{alert.title}</span>
              </button>
            )
          })}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3" style={{ minHeight: 180, maxHeight: 340 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            {mode === 'command' ? <Navigation className="h-9 w-9 text-emerald-300" /> : <Sparkles className="h-9 w-9 text-emerald-300" />}
            {briefing ? (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-700">{briefing.greeting} 👋</p>
                <p className="text-xs text-gray-500">{briefing.headline}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {mode === 'command'
                  ? 'บอกงานที่ต้องการพร้อมรายละเอียด ผมจะถามข้อมูลที่ขาด แล้วพาไปเตรียมแบบฟอร์มให้ตรวจสอบ'
                  : 'ถามข้อมูลจริงในระบบ งานค้าง ความเสี่ยง หรือขอคำปรึกษาตามระเบียบ'}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-1.5">
              {briefing?.suggested_actions?.length ? (
                briefing.suggested_actions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => runSuggestedAction(action)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
                      action.mode === 'command'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
                    )}
                  >
                    {action.mode === 'command' ? <WandSparkles className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                    {action.label}
                  </button>
                ))
              ) : (
                (mode === 'command' ? COMMAND_ACTIONS.map((label) => ({ label, message: label })) : QUICK_ACTIONS).map((action) => (
                  <button
                    key={action.label}
                    onClick={() => mode === 'command' ? void runCommand(action.message) : sendMessage(action.message)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                  >
                    {action.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        {messages.map((message) => <AiMessage key={message.id} message={message} />)}
      </div>

      {mode === 'command' && suggestedTerms.length > 0 && (
        <div className="border-t bg-amber-50/60 px-3 py-2">
          <div className="mb-1 text-[11px] font-medium text-amber-700">คุณหมายถึงคำใด — กดเพื่อเลือก</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTerms.map((term) => (
              <button
                key={term.canonical}
                onClick={() => { setSuggestedTerms([]); void runCommand(term.canonical) }}
                title={term.meaning}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
              >
                {term.canonical}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t p-3">
        {mode === 'command' && (
          <p className="mb-2 text-[11px] text-amber-700">AI จะเตรียมและเติมข้อมูลเท่านั้น ผู้ใช้ต้องตรวจสอบและกดบันทึกเองเสมอ</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            rows={3}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder={listening ? 'กำลังฟัง… พูดได้เลย แล้วกดไมค์เพื่อหยุด' : mode === 'command' ? 'เช่น เพิ่มโครงการอบรมครู วงเงิน 20,000 บาท...' : 'ถามข้อมูลในระบบ...'}
            className="flex-1 resize-none overflow-y-auto rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            style={{ minHeight: '72px', maxHeight: '180px' }}
            disabled={isLoading}
          />
          <button
            onClick={toggleSpeech}
            className={cn(
              'rounded-lg border p-2 transition-colors',
              listening ? 'animate-pulse border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
            )}
            title={listening ? 'กำลังอัดเสียง — กดเพื่อหยุดแล้วกดส่ง' : 'กรอกด้วยเสียง (พูดต่อเนื่องได้ กดอีกครั้งเพื่อหยุด)'}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {isLoading ? (
            <button onClick={stopGeneration} className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600" title="หยุด">
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:bg-gray-300">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
