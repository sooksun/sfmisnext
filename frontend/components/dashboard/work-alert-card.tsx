'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { fmtDateTH, cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface WorkAlert {
  wa_id: number
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string | null
  link: string | null
  due_date: string | null
  status: number
}
interface LoadResp { data: WorkAlert[]; unread: number }

const ICON = {
  error: { Icon: AlertCircle, cls: 'text-red-500' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-500' },
  info: { Icon: Info, cls: 'text-blue-500' },
}

export function WorkAlertCard() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)

  const { data, isLoading } = useQuery<LoadResp>({
    queryKey: ['work-alerts', scId, budgetYear],
    queryFn: () => apiGet<LoadResp>(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
  })

  if (!scId || isLoading) return null
  const alerts = data?.data ?? []

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/70">
        <h2 className="font-bold text-gray-800">งานที่ต้องทำตามกำหนดเวลา</h2>
        <Link href="/sfmis/work-alerts" className="text-xs text-indigo-600 hover:underline inline-flex items-center">
          ดูทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          ไม่มีงานค้างตามกำหนด — เยี่ยมมาก
        </div>
      ) : (
        <ul className="divide-y">
          {alerts.slice(0, 5).map((a) => {
            const { Icon, cls } = ICON[a.severity] ?? ICON.info
            const inner = (
              <div className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50">
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cls)} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', a.status === 1 ? 'font-semibold text-gray-900' : 'text-gray-600')}>{a.title}</p>
                  {a.due_date && <p className="text-xs text-gray-400 mt-0.5">กำหนด {fmtDateTH(a.due_date)}</p>}
                </div>
                {a.link && <ChevronRight className="h-4 w-4 text-gray-300 mt-1" />}
              </div>
            )
            return a.link ? (
              <li key={a.wa_id}><Link href={a.link}>{inner}</Link></li>
            ) : (
              <li key={a.wa_id}>{inner}</li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
