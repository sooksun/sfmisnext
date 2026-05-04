'use client'

import * as React from 'react'
import {
  FileText,
  CheckSquare,
  Receipt,
  HandCoins,
  Send,
  ThumbsUp,
  Shield,
  CreditCard,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDateTH } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineRefType = 'receipt' | 'check' | 'invoice' | 'loan'

interface TimelineEvent {
  event_type: string
  label: string
  date: string | null
  amount: number
  status: string
  detail: string
}

interface TimelineResult {
  ref_type: string
  ref_id: number
  events: TimelineEvent[]
}

export interface TransactionTimelineProps {
  open: boolean
  onClose: () => void
  refType: TimelineRefType
  refId: number
  docNo?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function EventIcon({ eventType }: { eventType: string }) {
  const cls = 'h-4 w-4'
  switch (eventType) {
    case 'created':       return <FileText className={cls} />
    case 'submitted':     return <Send className={cls} />
    case 'approved':      return <ThumbsUp className={cls} />
    case 'director_approved': return <Shield className={cls} />
    case 'check_issued':  return <CreditCard className={cls} />
    case 'cancelled':     return <XCircle className={cls} />
    case 'confirmed':     return <CheckCircle2 className={cls} />
    case 'due':           return <Clock className={cls} />
    case 'returned':      return <HandCoins className={cls} />
    default:              return <Info className={cls} />
  }
}

function eventDotColor(eventType: string) {
  switch (eventType) {
    case 'approved':
    case 'director_approved':
    case 'confirmed':
    case 'returned':
      return 'bg-green-500 text-white'
    case 'cancelled':
      return 'bg-red-400 text-white'
    case 'due':
      return 'bg-yellow-400 text-white'
    default:
      return 'bg-indigo-500 text-white'
  }
}

function statusBadgeColor(status: string) {
  if (status === 'ยกเลิก' || status === 'เกินกำหนด' || status === 'ไม่อนุมัติ')
    return 'bg-red-100 text-red-700'
  if (status === 'อนุมัติ' || status === 'ยืนยันแล้ว' || status === 'คืนแล้ว' || status === 'ออกเช็คแล้ว')
    return 'bg-green-100 text-green-700'
  if (status === 'เกินกำหนด')
    return 'bg-red-100 text-red-700'
  if (status === 'รอคืน' || status === 'ส่งแล้ว')
    return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

function refTypeLabel(refType: TimelineRefType) {
  switch (refType) {
    case 'receipt':  return 'ใบรับเงิน'
    case 'check':    return 'เช็ค'
    case 'invoice':  return 'ใบเบิก'
    case 'loan':     return 'สัญญายืมเงิน'
  }
}

function SkeletonEvent() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-6 flex-1 space-y-1.5">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="h-3 w-56 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export function TransactionTimeline({ open, onClose, refType, refId, docNo }: TransactionTimelineProps) {
  const { scId } = useAppContext()
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<TimelineResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setResult(null)
    setError(null)
    setLoading(true)

    apiGet<TimelineResult>(`DayCloseCheck/timeline/${scId}/${refType}/${refId}`)
      .then((data) => setResult(data))
      .catch(() => setError('โหลดข้อมูลไม่ได้ในขณะนี้'))
      .finally(() => setLoading(false))
  }, [open, refType, refId, scId])

  const title = docNo ? `ประวัติเอกสาร — ${docNo}` : `ประวัติ${refTypeLabel(refType)} #${refId}`

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[400px] bg-white shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-0.5">
              {refTypeLabel(refType)}
            </p>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-sm p-0.5 opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">ปิด</span>
          </button>
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-0">
              <SkeletonEvent />
              <SkeletonEvent />
              <SkeletonEvent />
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && !loading && result.events.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              ไม่พบข้อมูลเอกสารนี้
            </div>
          )}

          {result && !loading && result.events.length > 0 && (
            <ol className="relative">
              {result.events.map((ev, idx) => {
                const isLast = idx === result.events.length - 1
                return (
                  <li key={idx} className="flex gap-4">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                          eventDotColor(ev.event_type),
                        )}
                      >
                        <EventIcon eventType={ev.event_type} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>

                    {/* Content */}
                    <div className={cn('pb-6 flex-1 min-w-0', isLast && 'pb-0')}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">{ev.label}</p>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                            statusBadgeColor(ev.status),
                          )}
                        >
                          {ev.status}
                        </span>
                      </div>

                      {ev.date && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fmtDateTH(ev.date)}
                        </p>
                      )}

                      {ev.amount > 0 && (
                        <p className="text-xs text-gray-600 mt-0.5 font-medium">
                          {ev.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </p>
                      )}

                      {ev.detail && ev.detail !== '-' && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ev.detail}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            ปิด
          </button>
        </div>
      </aside>
    </>
  )
}
