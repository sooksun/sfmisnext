'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDateTH } from '@/lib/utils'
import { apiGet } from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

type DayCloseStatus = 'pass' | 'fail' | 'warn' | 'info'

interface DayCloseItem {
  id: string
  label: string
  status: DayCloseStatus
  detail: string
}

interface DayCloseResult {
  check_date: string
  items: DayCloseItem[]
  all_passed: boolean
}

export interface DayCloseCheckDialogProps {
  open: boolean
  onClose: () => void
  scId: number
  syId: number
  checkDate?: string // YYYY-MM-DD, defaults to today
}

// ── Icon mapping ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: DayCloseStatus }) {
  if (status === 'pass')
    return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
  if (status === 'fail')
    return <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
  if (status === 'warn')
    return <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
  return <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
}

function statusRowBg(status: DayCloseStatus) {
  if (status === 'pass') return 'bg-green-50 border-green-100'
  if (status === 'fail') return 'bg-red-50 border-red-100'
  if (status === 'warn') return 'bg-yellow-50 border-yellow-100'
  return 'bg-blue-50 border-blue-100'
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 animate-pulse bg-gray-50">
      <div className="h-5 w-5 rounded-full bg-gray-200 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-3 w-64 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function DayCloseCheckDialog({ open, onClose, scId, syId, checkDate }: DayCloseCheckDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const targetDate = checkDate ?? today

  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<DayCloseResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // auto-fetch when dialog opens
  React.useEffect(() => {
    if (!open) return
    setResult(null)
    setError(null)
    setLoading(true)

    apiGet<DayCloseResult>(`DayCloseCheck/runCheck/${scId}/${syId}/${targetDate}`)
      .then((data) => setResult(data))
      .catch(() => setError('ไม่สามารถโหลดข้อมูลได้ในขณะนี้'))
      .finally(() => setLoading(false))
  }, [open, scId, syId, targetDate])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'bg-white rounded-xl shadow-xl p-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900">
                ตรวจสอบก่อนปิดวัน
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-gray-500 mt-0.5">
                {fmtDateTH(targetDate)}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">ปิด</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {error && !loading && (
              <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {result && !loading && result.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3',
                  statusRowBg(item.status),
                )}
              >
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + Footer */}
          <div className="px-6 pb-5 pt-3 border-t border-gray-100 space-y-3">
            {result && !loading && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium',
                  result.all_passed
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200',
                )}
              >
                {result.all_passed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    พร้อมปิดวัน — รายการตรวจสอบครบถ้วน
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    มีรายการที่ต้องดำเนินการก่อนปิดวัน
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                ปิด
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
