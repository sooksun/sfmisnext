'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertOctagon, ChevronRight } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface WorkAlert {
  wa_id: number
  source: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string | null
  link: string | null
}
interface LoadResp { data: WorkAlert[] }

/** แถบเตือนเด่น (สีแดง) เมื่อมีงานปิดยอดประจำวันค้าง — โผล่ตอนเช้า/login */
export function DailyCheckBanner() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)

  const { data } = useQuery<LoadResp>({
    queryKey: ['work-alerts', scId, budgetYear],
    queryFn: () => apiGet<LoadResp>(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
  })

  const dailies = (data?.data ?? []).filter((a) => a.source === 'daily_check')
  if (dailies.length === 0) return null
  const hasError = dailies.some((a) => a.severity === 'error')

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        hasError ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50',
      )}
    >
      <AlertOctagon className={cn('h-6 w-6 mt-0.5 shrink-0', hasError ? 'text-red-500' : 'text-amber-500')} />
      <div className="flex-1 min-w-0">
        <h3 className={cn('font-bold', hasError ? 'text-red-800' : 'text-amber-800')}>
          ตรวจสอบการบันทึกประจำวัน
        </h3>
        <ul className="mt-1 space-y-0.5">
          {dailies.map((a) => (
            <li key={a.wa_id} className={cn('text-sm', hasError ? 'text-red-700' : 'text-amber-700')}>
              • {a.title}
              {a.detail && <span className="text-xs opacity-80"> — {a.detail}</span>}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/sfmis/report/daily-balance"
        className={cn(
          'shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-white',
          hasError ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700',
        )}
      >
        ไปปิดยอด <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
