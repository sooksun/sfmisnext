'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'
import type { ProjectDashboard, ProjectDashboardRow } from '@/lib/types'

const DEPT_NAME: Record<number, string> = {
  1: 'วิชาการ', 2: 'บริหารทั่วไป', 3: 'แผน/งบ', 4: 'บุคคล',
  5: 'งบประจำ', 6: 'ปฐมวัย', 7: 'อบต.', 8: 'อื่น',
}
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const DAY = 86400000

function barColor(r: ProjectDashboardRow): string {
  if (r.execution_status === 5) return 'bg-green-500'
  if (r.overdue) return 'bg-red-500'
  if (r.blocked) return 'bg-orange-500'
  if (r.at_risk) return 'bg-amber-500'
  return 'bg-indigo-500'
}

export default function ProjectGanttPage() {
  const { scId, syId } = useAppContext()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['projects-dashboard', scId, syId],
    queryFn: () => apiGet<ProjectDashboard>(`projects/dashboard/${scId}/${syId}`),
    enabled: scId > 0,
  })
  const all = data?.data ?? []

  const filtered = useMemo(() => {
    let r = all
    if (dept !== 'all') r = r.filter((x) => String(x.department ?? '') === dept)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter((x) => x.proj_name.toLowerCase().includes(q) || (x.owner_name ?? '').toLowerCase().includes(q))
    }
    return r
  }, [all, dept, search])

  const dated = filtered.filter((p) => p.start_date && p.end_date)
  const undated = filtered.filter((p) => !p.start_date || !p.end_date)

  // ── คำนวณช่วงเวลา (ขอบเดือน) + คอลัมน์เดือนตามจำนวนวัน ──
  const timeline = useMemo(() => {
    if (dated.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const p of dated) {
      const s = new Date(p.start_date as string).getTime()
      const e = new Date(p.end_date as string).getTime()
      if (s < min) min = s
      if (e > max) max = e
    }
    const startD = new Date(min)
    const rangeStart = new Date(startD.getFullYear(), startD.getMonth(), 1)
    const endD = new Date(max)
    const rangeEnd = new Date(endD.getFullYear(), endD.getMonth() + 1, 1) // วันแรกเดือนถัดไป
    const totalMs = rangeEnd.getTime() - rangeStart.getTime()
    const months: { label: string; widthPct: number }[] = []
    const cur = new Date(rangeStart)
    while (cur < rangeEnd) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
      const w = ((next.getTime() - cur.getTime()) / totalMs) * 100
      months.push({
        label: `${TH_MON[cur.getMonth()]} ${String((cur.getFullYear() + 543) % 100).padStart(2, '0')}`,
        widthPct: w,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    const pct = (ms: number) => ((ms - rangeStart.getTime()) / totalMs) * 100
    const todayMs = Date.now()
    const todayPct = todayMs >= rangeStart.getTime() && todayMs <= rangeEnd.getTime() ? pct(todayMs) : null
    return { rangeStart, rangeEnd, totalMs, months, pct, todayPct }
  }, [dated])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงาน Gantt Chart โครงการ" subtitle="ไทม์ไลน์โครงการตามช่วงเริ่ม–สิ้นสุด พร้อมความก้าวหน้าและความเสี่ยง" />

      <div className="p-4 space-y-4">
        {/* Filters + legend */}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ/เจ้าของ" className="w-56" />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-40"><SelectValue placeholder="ทุกฝ่ายงาน" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกฝ่ายงาน</SelectItem>
              {Object.entries(DEPT_NAME).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <Legend color="bg-indigo-500" label="ปกติ" />
            <Legend color="bg-amber-500" label="เสี่ยงล่าช้า" />
            <Legend color="bg-orange-500" label="ติดขัด" />
            <Legend color="bg-red-500" label="เกินกำหนด" />
            <Legend color="bg-green-500" label="ปิดแล้ว" />
          </div>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-gray-500">กำลังโหลด...</p>
        ) : !timeline ? (
          <p className="py-8 text-center text-gray-400">ยังไม่มีโครงการที่กำหนดวันเริ่ม–สิ้นสุด</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <div className="min-w-[760px]">
              {/* Header: เดือน */}
              <div className="flex border-b bg-gray-50 text-xs font-medium text-gray-600">
                <div className="w-56 shrink-0 border-r px-3 py-2">โครงการ</div>
                <div className="relative flex flex-1">
                  {timeline.months.map((m, i) => (
                    <div key={i} className="border-r py-2 text-center last:border-r-0" style={{ width: `${m.widthPct}%` }}>
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {dated.map((p) => {
                const s = new Date(p.start_date as string).getTime()
                const e = new Date(p.end_date as string).getTime()
                const left = timeline.pct(s)
                const width = Math.max(((e - s + DAY) / timeline.totalMs) * 100, 1.2)
                return (
                  <div key={p.proj_id} className="flex items-center border-b last:border-b-0 hover:bg-gray-50">
                    <button
                      onClick={() => router.push(`/sfmis/plan-menu/projects/${p.proj_id}`)}
                      className="w-56 shrink-0 truncate border-r px-3 py-2 text-left text-sm"
                      title={p.proj_name}
                    >
                      <span className="text-gray-800">{p.proj_name}</span>
                      {p.owner_name && <span className="block text-xs text-gray-400">{p.owner_name}</span>}
                    </button>
                    <div className="relative h-9 flex-1">
                      {/* month gridlines */}
                      <div className="absolute inset-0 flex">
                        {timeline.months.map((m, i) => (
                          <div key={i} className="border-r border-gray-100 last:border-r-0" style={{ width: `${m.widthPct}%` }} />
                        ))}
                      </div>
                      {/* today marker */}
                      {timeline.todayPct !== null && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-400/70" style={{ left: `${timeline.todayPct}%` }} />
                      )}
                      {/* bar */}
                      <button
                        onClick={() => router.push(`/sfmis/plan-menu/projects/${p.proj_id}`)}
                        className={`absolute top-1.5 h-6 overflow-hidden rounded ${barColor(p)} shadow-sm`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${p.proj_name}\n${fmtDateTH(p.start_date)} – ${fmtDateTH(p.end_date)}\nก้าวหน้า ${p.progress_percent}%`}
                      >
                        {/* progress overlay */}
                        <div className="absolute inset-y-0 left-0 bg-black/25" style={{ width: `${p.progress_percent}%` }} />
                        <span className="relative px-1 text-[10px] leading-6 text-white">{p.progress_percent}%</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* today legend */}
        {timeline?.todayPct !== null && timeline && (
          <p className="text-xs text-gray-400">เส้นแดงแนวตั้ง = วันนี้ ({fmtDateTH(new Date().toISOString().slice(0, 10))})</p>
        )}

        {/* projects without dates */}
        {undated.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 text-sm font-medium text-amber-700">
              ยังไม่กำหนดช่วงเวลา ({undated.length} โครงการ) — กำหนดวันเริ่ม/สิ้นสุดในหน้าโครงการเพื่อแสดงบน Gantt
            </p>
            <div className="flex flex-wrap gap-2">
              {undated.map((p) => (
                <button
                  key={p.proj_id}
                  onClick={() => router.push(`/sfmis/plan-menu/projects/${p.proj_id}`)}
                  className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-amber-100"
                >
                  {p.proj_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  )
}
