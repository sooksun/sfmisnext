'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { FolderKanban, AlertTriangle, Ban, Clock, CheckCircle2, FileEdit } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'
import type { ProjectDashboard, ProjectDashboardRow } from '@/lib/types'

const DEPT_NAME: Record<number, string> = {
  1: 'วิชาการ', 2: 'บริหารทั่วไป', 3: 'แผน/งบ', 4: 'บุคคล',
  5: 'งบประจำ', 6: 'ปฐมวัย', 7: 'อบต.', 8: 'อื่น',
}

const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

type View = 'all' | 'mine' | 'follow' | 'closed'

const VIEW_TABS: { key: View; label: string }[] = [
  { key: 'all', label: 'ทุกโครงการ' },
  { key: 'mine', label: 'โครงการของฉัน' },
  { key: 'follow', label: 'ต้องติดตาม' },
  { key: 'closed', label: 'ปิดแล้ว' },
]

function SummaryCard({
  label, value, icon, color,
}: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function Bar({ percent, color }: { percent: number; color: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  )
}

export default function ProjectsListPage() {
  const { scId, syId, adminId } = useAppContext()
  const router = useRouter()
  const [view, setView] = useState<View>('all')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['projects-dashboard', scId, syId],
    queryFn: () =>
      apiGet<ProjectDashboard>(`projects/dashboard/${scId}/${syId}`),
    enabled: scId > 0,
  })

  const summary = data?.summary
  const allRows = data?.data ?? []

  const rows = useMemo(() => {
    let r = allRows
    if (view === 'mine') r = r.filter((x) => x.owner_admin_id === adminId)
    else if (view === 'follow') r = r.filter((x) => x.overdue || x.blocked || x.at_risk || x.stale)
    else if (view === 'closed') r = r.filter((x) => x.execution_status === 5)
    else r = r.filter((x) => x.execution_status !== 5)
    if (dept !== 'all') r = r.filter((x) => String(x.department ?? '') === dept)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter(
        (x) =>
          x.proj_name.toLowerCase().includes(q) ||
          String(x.proj_id).includes(q) ||
          (x.owner_name ?? '').toLowerCase().includes(q),
      )
    }
    return r
  }, [allRows, view, dept, search, adminId])

  function riskBadge(row: ProjectDashboardRow) {
    if (row.overdue) return <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">เกินกำหนด</span>
    if (row.blocked) return <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">ติดขัด</span>
    if (row.at_risk) return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">เสี่ยงล่าช้า</span>
    if (row.stale) return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">ไม่อัปเดต &gt;14 วัน</span>
    return null
  }

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="พื้นที่ทำงานโครงการ"
        subtitle="ติดตามโครงการ งานย่อย งบประมาณ และหลักฐานในที่เดียว"
      />

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="ทั้งหมด" value={summary?.total ?? 0} icon={<FolderKanban className="h-5 w-5 text-indigo-600" />} color="bg-indigo-50" />
          <SummaryCard label="กำลังทำ" value={summary?.running ?? 0} icon={<Clock className="h-5 w-5 text-blue-600" />} color="bg-blue-50" />
          <SummaryCard label="เกินกำหนด" value={summary?.overdue ?? 0} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} color="bg-red-50" />
          <SummaryCard label="ติดขัด" value={summary?.blocked ?? 0} icon={<Ban className="h-5 w-5 text-orange-600" />} color="bg-orange-50" />
          <SummaryCard label="รอรับทราบ" value={summary?.waiting_ack ?? 0} icon={<FileEdit className="h-5 w-5 text-amber-600" />} color="bg-amber-50" />
          <SummaryCard label="ปิดแล้ว" value={summary?.closed ?? 0} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} color="bg-green-50" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-white p-1">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`rounded px-3 py-1 text-sm ${view === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ/รหัส/เจ้าของ"
            className="w-56"
          />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-40"><SelectValue placeholder="ทุกฝ่ายงาน" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกฝ่ายงาน</SelectItem>
              {Object.entries(DEPT_NAME).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project cards */}
        {isLoading ? (
          <p className="py-8 text-center text-gray-500">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-gray-400">ไม่พบโครงการ</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((row) => {
              return (
                <button
                  key={row.proj_id}
                  onClick={() => router.push(`/sfmis/plan-menu/projects/${row.proj_id}`)}
                  className="rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{row.proj_name}</p>
                      <p className="text-xs text-gray-500">
                        {DEPT_NAME[row.department ?? 0] ?? '-'}
                        {row.owner_name ? ` · ${row.owner_name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {row.execution_status_name}
                      </span>
                      {riskBadge(row)}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="mb-0.5 flex justify-between text-xs text-gray-500">
                        <span>ความก้าวหน้า</span>
                        <span>{row.progress_percent}%</span>
                      </div>
                      <Bar percent={row.progress_percent} color={row.progress_percent >= 100 ? 'bg-green-500' : 'bg-indigo-500'} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>งบ {fmt(row.proj_budget)} บาท</span>
                      {row.end_date && (
                        <span className={row.overdue ? 'font-medium text-red-600' : ''}>
                          สิ้นสุด {fmtDateTH(row.end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
