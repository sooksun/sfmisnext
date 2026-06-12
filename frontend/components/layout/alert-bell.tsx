'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertCircle, AlertTriangle, Info, CheckCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH, cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface WorkAlert {
  wa_id: number
  source: string
  rule_code: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string | null
  link: string | null
  due_date: string | null
  status: number
}
interface LoadResp {
  data: WorkAlert[]
  count: number
  unread: number
}

const sevIcon = {
  error: { Icon: AlertCircle, cls: 'text-red-500' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-500' },
  info: { Icon: Info, cls: 'text-blue-500' },
}

export function AlertBell() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const queryKey = ['work-alerts', scId, budgetYear]
  const { data } = useQuery<LoadResp>({
    queryKey,
    queryFn: () => apiGet<LoadResp>(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
    refetchInterval: 5 * 60 * 1000, // รีเฟรชทุก 5 นาที
  })

  const ackAll = useMutation({
    mutationFn: () => apiPost(`Work_alert/acknowledgeAll/${scId}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })
  const ackOne = useMutation({
    mutationFn: (waId: number) => apiPost(`Work_alert/acknowledge/${waId}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const unread = data?.unread ?? 0
  const alerts = data?.data ?? []

  if (!scId) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 transition-colors" aria-label="การเตือนงาน">
          <Bell className="h-5 w-5 text-gray-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold text-gray-800">
            งานที่ต้องทำ {alerts.length > 0 && `(${alerts.length})`}
          </span>
          {unread > 0 && (
            <button
              onClick={() => ackAll.mutate()}
              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> รับทราบทั้งหมด
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              ไม่มีงานค้าง — เยี่ยมมาก 🎉
            </div>
          ) : (
            alerts.slice(0, 12).map((a) => {
              const { Icon, cls } = sevIcon[a.severity] ?? sevIcon.info
              const body = (
                <div className="flex gap-2.5 px-3 py-2.5 hover:bg-gray-50">
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cls)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm leading-snug', a.status === 1 ? 'font-semibold text-gray-900' : 'text-gray-600')}>
                      {a.title}
                    </p>
                    {a.detail && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.detail}</p>}
                    {a.due_date && (
                      <p className="text-[11px] text-gray-400 mt-0.5">กำหนด: {fmtDateTH(a.due_date)}</p>
                    )}
                  </div>
                  {a.status === 1 && <span className="h-2 w-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />}
                </div>
              )
              return a.link ? (
                <Link
                  key={a.wa_id}
                  href={a.link}
                  onClick={() => {
                    ackOne.mutate(a.wa_id)
                    setOpen(false)
                  }}
                  className="block border-b last:border-0"
                >
                  {body}
                </Link>
              ) : (
                <div key={a.wa_id} className="border-b last:border-0">{body}</div>
              )
            })
          )}
        </div>
        <Link
          href="/sfmis/work-alerts"
          onClick={() => setOpen(false)}
          className="block px-3 py-2 text-center text-xs font-medium text-indigo-600 hover:bg-gray-50 border-t"
        >
          ดูทั้งหมด
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
