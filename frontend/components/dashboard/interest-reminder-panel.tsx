'use client'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, AlertTriangle, BellRing, Info } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH, showNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ByType {
  revenue_type: number
  revenue_type_name: string
  received: number
  remitted: number
  outstanding: number
}
interface InterestReminder {
  today: string
  next_interest_date: string
  days_to_next: number
  last_interest_date: string
  by_type: ByType[]
  total_outstanding: number
  alerts: { level: 'info' | 'warning' | 'urgent'; message: string }[]
  need_action: boolean
}

const ICON = { urgent: AlertTriangle, warning: BellRing, info: Info } as const
const COLOR = {
  urgent: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
} as const

export function InterestReminderPanel() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const enabled = scId > 0 && syId > 0

  const { data } = useQuery({
    queryKey: ['interest-reminder', scId, syId, apiYear],
    queryFn: () => apiGet<InterestReminder>(`GovRevenue/interestReminder/${scId}/${syId}/${apiYear}`),
    enabled,
    refetchInterval: 5 * 60 * 1000,
  })

  if (!enabled || !data) return null

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-indigo-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">รอบดอกเบี้ยเงินฝาก → นำส่งรายได้แผ่นดิน</h3>
        </div>
        <span className="text-xs text-gray-600">
          รอบถัดไป: <b>{fmtDateTH(data.next_interest_date)}</b> (อีก {data.days_to_next} วัน)
        </span>
        {data.total_outstanding > 0 && (
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            ค้างนำส่ง {showNumber(data.total_outstanding)} บาท
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {data.alerts.length > 0 ? (
          <ul className="space-y-2">
            {data.alerts.map((a, i) => {
              const Icon = ICON[a.level]
              return (
                <li key={i} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', COLOR[a.level])}>
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{a.message}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-green-700">✓ ไม่มีรายการดอกเบี้ยค้างนำส่งในขณะนี้</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1 font-medium">ประเภทดอกเบี้ย</th>
                <th className="text-right py-1 font-medium">รับ</th>
                <th className="text-right py-1 font-medium">นำส่งแล้ว</th>
                <th className="text-right py-1 font-medium">คงค้าง</th>
              </tr>
            </thead>
            <tbody>
              {data.by_type.map((t) => (
                <tr key={t.revenue_type} className="border-b last:border-0">
                  <td className="py-1">{t.revenue_type_name}</td>
                  <td className="py-1 text-right">{showNumber(t.received)}</td>
                  <td className="py-1 text-right">{showNumber(t.remitted)}</td>
                  <td className={cn('py-1 text-right font-medium', t.outstanding > 0 ? 'text-red-600' : 'text-gray-700')}>
                    {showNumber(t.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
