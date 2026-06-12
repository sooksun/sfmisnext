'use client'
import { useState, useCallback } from 'react'
import { apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

export interface AnomalyWarning {
  code: string
  field?: string
  message: string
  severity: 'warning' | 'info'
}

/**
 * ตรวจค่าผิดปกติก่อนบันทึก (L2) — เรียก backend /Anomaly/precheck
 * คืน warnings ให้ฟอร์มแสดงเตือน (ยังบันทึกได้ ไม่ block)
 *
 * วิธีใช้:
 *   const { warnings, check, clear, loading } = useAnomalyPrecheck('budget-request')
 *   const ws = await check({ amount, action_date })   // ก่อน submit
 *   if (ws.length) { ...แสดงเตือน + ให้ผู้ใช้ยืนยันอีกครั้ง... }
 */
export function useAnomalyPrecheck(module: string) {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const [warnings, setWarnings] = useState<AnomalyWarning[]>([])
  const [loading, setLoading] = useState(false)

  const check = useCallback(
    async (payload: Record<string, unknown>): Promise<AnomalyWarning[]> => {
      if (!scId) return []
      setLoading(true)
      try {
        const res = await apiPost<{ warnings: AnomalyWarning[] }>('Anomaly/precheck', {
          sc_id: scId,
          budget_year: budgetYear,
          module,
          payload,
        })
        const ws = res.warnings ?? []
        setWarnings(ws)
        return ws
      } catch {
        return [] // เตือนล้มเหลวต้องไม่ขวางการบันทึก
      } finally {
        setLoading(false)
      }
    },
    [scId, budgetYear, module],
  )

  const clear = useCallback(() => setWarnings([]), [])

  return { warnings, check, clear, loading }
}
