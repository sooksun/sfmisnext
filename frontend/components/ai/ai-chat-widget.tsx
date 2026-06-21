'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, Sparkles, X } from 'lucide-react'
import { useAiChatStore } from '@/stores/ai-chat-store'
import { AiChatDialog } from './ai-chat-dialog'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/utils'

interface WorkAlert {
  wa_id: number
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string | null
  link: string | null
}

const SEVERITY = {
  error: { Icon: AlertCircle, dot: 'bg-red-500', card: 'border-red-200 bg-red-50 text-red-800', rank: 3 },
  warning: { Icon: AlertTriangle, dot: 'bg-amber-500', card: 'border-amber-200 bg-amber-50 text-amber-800', rank: 2 },
  info: { Icon: Info, dot: 'bg-blue-500', card: 'border-blue-200 bg-blue-50 text-blue-800', rank: 1 },
} as const

/**
 * Floating AI Chat Widget — แสดงทุกหน้าใน dashboard
 * - ปุ่มดาวลอยมุมขวาบน + badge จำนวนงานค้าง
 * - การ์ดคำแนะนำเชิงรุก (peek) เด้งเองเมื่อมีงานค้าง/เร่งด่วน ตั้งแต่ก่อนเปิดแชท
 * - เคารพสวิตช์ "เปิด-ปิดคำแนะนำ" (suggestionsEnabled) และปิดการ์ดรายหน้าได้
 */
export function AiChatWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, toggle, setOpen, suggestionsEnabled } = useAiChatStore()
  const { scId, scName, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)

  // ปิดการ์ดเชิงรุก — รีเซ็ตทุกครั้งที่เปลี่ยนหน้า เพื่อ surface คำแนะนำ "ทุกหน้า"
  const [peekDismissed, setPeekDismissed] = useState(false)
  useEffect(() => setPeekDismissed(false), [pathname])

  // ใช้ query key เดียวกับใน dialog → React Query dedupe ไม่ยิงซ้ำ
  const { data } = useQuery<{ data: WorkAlert[] }>({
    queryKey: ['ai-assistant-alerts', scId, budgetYear],
    queryFn: () => apiGet(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: suggestionsEnabled && scId > 0 && budgetYearRaw > 0,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

  const alerts = data?.data ?? []
  const unread = alerts.length
  const topSeverity = alerts.reduce<'info' | 'warning' | 'error'>(
    (acc, a) => (SEVERITY[a.severity]?.rank > SEVERITY[acc].rank ? a.severity : acc),
    'info',
  )
  // เด้งเองเฉพาะงานเตือน/เร่งด่วน — งาน info ไม่รบกวน
  const peekAlerts = alerts.filter((a) => a.severity !== 'info').slice(0, 2)
  const showPeek = !isOpen && suggestionsEnabled && !peekDismissed && peekAlerts.length > 0

  // ไม่แสดงถ้าไม่มี context
  if (!scId) return null

  return (
    <>
      {/* Chat Dialog */}
      <AiChatDialog scId={scId} budgetYear={budgetYear} scName={scName} />

      {/* การ์ดคำแนะนำเชิงรุก — เด้งเองมุมขวาบนก่อนเปิดแชท */}
      {showPeek && (
        <div className="fixed top-20 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-xl border border-emerald-200 bg-white/95 p-2.5 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              คำแนะนำก่อนเริ่มงาน
            </div>
            <button
              onClick={() => setPeekDismissed(true)}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="ปิดคำแนะนำหน้านี้"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {peekAlerts.map((alert) => {
            const meta = SEVERITY[alert.severity] ?? SEVERITY.info
            return (
              <button
                key={alert.wa_id}
                onClick={() => (alert.link ? router.push(alert.link) : setOpen(true))}
                className={cn('flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-xs', meta.card)}
              >
                <meta.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{alert.title}</span>
              </button>
            )
          })}
          {unread > peekAlerts.length && (
            <button
              onClick={() => setOpen(true)}
              className="w-full rounded-lg px-2 py-1 text-center text-xs text-emerald-700 hover:bg-emerald-50"
            >
              + อีก {unread - peekAlerts.length} รายการ — เปิดผู้ช่วย
            </button>
          )}
        </div>
      )}

      {/* Floating Button + badge */}
      {!isOpen && (
        <button
          onClick={toggle}
          className="fixed top-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-teal-600"
          style={{ marginTop: showPeek ? peekAlerts.length * 52 + 56 : 0 }}
          title="เปิด AI ผู้ช่วยอัจฉริยะ"
        >
          <Sparkles className="h-6 w-6 text-white" />
          {suggestionsEnabled && unread > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-white',
                SEVERITY[topSeverity].dot,
              )}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}
    </>
  )
}
