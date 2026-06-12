'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  ExternalLink,
  CalendarClock,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const SEV = {
  error: { Icon: AlertCircle, ring: 'border-red-200 bg-red-50', cls: 'text-red-600', label: 'เร่งด่วน' },
  warning: { Icon: AlertTriangle, ring: 'border-amber-200 bg-amber-50', cls: 'text-amber-600', label: 'เตือน' },
  info: { Icon: Info, ring: 'border-blue-200 bg-blue-50', cls: 'text-blue-600', label: 'ข้อมูล' },
}

function daysTo(due: string | null): number | null {
  if (!due) return null
  const d = new Date(due + 'T23:59:59')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export default function WorkAlertsPage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const queryKey = ['work-alerts-page', scId, budgetYear]
  const { data, isLoading } = useQuery<LoadResp>({
    queryKey,
    queryFn: () => apiGet<LoadResp>(`Work_alert/load/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
  })

  const ackAll = useMutation({
    mutationFn: () => apiPost(`Work_alert/acknowledgeAll/${scId}`, {}),
    onSuccess: (r: unknown) => {
      toast.success((r as { ms: string }).ms)
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: ['work-alerts', scId, budgetYear] })
    },
  })

  const alerts = data?.data ?? []
  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 }
    for (const a of alerts) c[a.severity]++
    return c
  }, [alerts])
  const shown = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  if (!scId || !budgetYearRaw)
    return <div className="p-6 text-gray-500">กรุณาเลือกปีงบประมาณก่อน</div>

  return (
    <div className="pb-16">
      <PageHeader
        title="งานที่ต้องทำ / การเตือนตามปฏิทินการเงิน"
        subtitle={`ระบบเตือนงานตามกำหนดเวลา · ปีงบประมาณ ${budgetYear}`}
        actions={
          data && data.unread > 0 ? (
            <Button variant="outline" onClick={() => ackAll.mutate()} className="gap-1.5">
              <CheckCheck className="h-4 w-4" /> รับทราบทั้งหมด ({data.unread})
            </Button>
          ) : undefined
        }
      />

      <div className="px-3 sm:px-5 space-y-4">
        {/* filter chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} label={`ทั้งหมด ${alerts.length}`} />
          <Chip active={filter === 'error'} onClick={() => setFilter('error')} label={`เร่งด่วน ${counts.error}`} cls="text-red-600" />
          <Chip active={filter === 'warning'} onClick={() => setFilter('warning')} label={`เตือน ${counts.warning}`} cls="text-amber-600" />
          <Chip active={filter === 'info'} onClick={() => setFilter('info')} label={`ข้อมูล ${counts.info}`} cls="text-blue-600" />
        </div>

        {isLoading ? (
          <div className="text-gray-400 py-10 text-center">กำลังโหลด…</div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <CalendarClock className="h-12 w-12 mb-3 text-gray-300" />
            ไม่มีงานค้างในหมวดนี้
          </div>
        ) : (
          <div className="space-y-2.5">
            {shown.map((a) => {
              const s = SEV[a.severity] ?? SEV.info
              const dleft = daysTo(a.due_date)
              return (
                <div key={a.wa_id} className={cn('rounded-xl border p-3.5 flex gap-3', s.ring)}>
                  <s.Icon className={cn('h-5 w-5 mt-0.5 shrink-0', s.cls)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn('font-semibold', a.status === 1 ? 'text-gray-900' : 'text-gray-600')}>{a.title}</h3>
                      {a.status === 1 && <Badge variant="default" className="bg-indigo-100 text-indigo-700">ใหม่</Badge>}
                    </div>
                    {a.detail && <p className="text-sm text-gray-600 mt-1">{a.detail}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {a.due_date && (
                        <span className={cn('font-medium', (dleft ?? 99) < 0 ? 'text-red-600' : (dleft ?? 99) <= 3 ? 'text-amber-600' : 'text-gray-500')}>
                          กำหนด {fmtDateTH(a.due_date)}
                          {dleft !== null && (dleft < 0 ? ` · เกิน ${-dleft} วัน` : ` · อีก ${dleft} วัน`)}
                        </span>
                      )}
                      {a.link && (
                        <Link href={a.link} className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                          ไปทำงาน <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ active, onClick, label, cls }: { active: boolean; onClick: () => void; label: string; cls?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium border transition',
        active ? 'bg-gray-900 text-white border-gray-900' : cn('bg-white border-gray-200 hover:bg-gray-50', cls),
      )}
    >
      {label}
    </button>
  )
}
