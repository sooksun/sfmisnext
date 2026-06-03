'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { BellRing, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { cn } from '@/lib/utils'

interface DashboardAlert {
  category: 'interest' | 'tax' | 'loan' | 'cash'
  level: 'urgent' | 'warning' | 'info'
  title: string
  message: string
  link: string
}
interface AlertsResponse {
  alerts: DashboardAlert[]
  total: number
  urgent: number
  warning: number
}

const LEVEL_STYLE: Record<string, { box: string; badge: string; label: string; Icon: React.ElementType }> = {
  urgent: { box: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700', label: 'ด่วน', Icon: AlertTriangle },
  warning: { box: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'เตือน', Icon: BellRing },
  info: { box: 'border-blue-200 bg-blue-50', badge: 'bg-blue-100 text-blue-700', label: 'ทราบ', Icon: Info },
}

export function AlertsWidget() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const enabled = scId > 0 && syId > 0

  const { data } = useQuery({
    queryKey: ['dashboard-alerts', scId, syId, apiYear],
    queryFn: () => apiGet<AlertsResponse>(`Dashboard/alerts/${scId}/${syId}/${apiYear}`),
    enabled,
    refetchInterval: 5 * 60 * 1000, // refresh ทุก 5 นาที
  })

  if (!enabled || !data || data.total === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-3">
        <BellRing className="h-5 w-5 text-amber-600" />
        <h2 className="text-base font-semibold text-gray-900">แจ้งเตือนการเงิน</h2>
        {data.urgent > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            ด่วน {data.urgent}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-500">ทั้งหมด {data.total} รายการ</span>
      </div>
      <ul className="divide-y">
        {data.alerts.map((a, i) => {
          const s = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info
          return (
            <li key={i}>
              <Link
                href={a.link}
                className={cn('flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors')}
              >
                <span className={cn('mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0', s.box)}>
                  <s.Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', s.badge)}>{s.label}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{a.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{a.message}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
