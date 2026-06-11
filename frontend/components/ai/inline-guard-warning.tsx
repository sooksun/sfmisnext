'use client'
import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { apiPost } from '@/lib/api'

/**
 * InlineGuardWarning — เตือนสด (rule-based) ที่จุดกรอกข้อมูล ก่อนกดบันทึก
 * เรียก /ai/validate/entry แบบ debounced — ไม่บล็อกการกรอก แค่เตือนล่วงหน้า
 *
 * ใช้ใน 2 บริบท:
 *   context="order"   → { projectId, amount, excludeOrderId? } : G1 โครงการเกินงบ
 *   context="invoice" → { orderId }                            : G3 เบิกก่อนตรวจรับ
 */
export interface GuardAlert {
  type: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string
}

interface Props {
  context: 'order' | 'invoice'
  scId: number
  projectId?: number | null
  amount?: number | null
  excludeOrderId?: number
  orderId?: number | null
  /** หน่วง (ms) ก่อนเรียก API — กันยิงถี่ขณะพิมพ์ */
  debounceMs?: number
}

export function InlineGuardWarning({
  context,
  scId,
  projectId,
  amount,
  excludeOrderId,
  orderId,
  debounceMs = 500,
}: Props) {
  const [alerts, setAlerts] = useState<GuardAlert[]>([])

  // ตรวจเงื่อนไขขั้นต่ำก่อนเรียก API
  const ready =
    scId > 0 &&
    (context === 'order'
      ? !!projectId && projectId > 0 && !!amount && amount > 0
      : !!orderId && orderId > 0)

  useEffect(() => {
    if (!ready) {
      setAlerts([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await apiPost<{ data: GuardAlert[] }>('ai/validate/entry', {
          context,
          sc_id: scId,
          project_id: projectId ?? undefined,
          amount: amount ?? undefined,
          exclude_order_id: excludeOrderId,
          order_id: orderId ?? undefined,
        })
        if (!cancelled) setAlerts(res?.data ?? [])
      } catch {
        if (!cancelled) setAlerts([])
      }
    }, debounceMs)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [context, scId, projectId, amount, excludeOrderId, orderId, debounceMs, ready])

  if (alerts.length === 0) return null

  return (
    <div className="space-y-1.5">
      {alerts.map((a, i) => {
        const isError = a.severity === 'error'
        const Icon = isError ? AlertCircle : AlertTriangle
        return (
          <div
            key={`${a.type}-${i}`}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              isError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{a.detail}</span>
          </div>
        )
      })}
    </div>
  )
}
