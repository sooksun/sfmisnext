'use client'
import { useEffect, useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'
import type { AreaPlanSchool, AreaPlanProject } from '@/lib/types'

const fmtBaht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const PROJ_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600' },
  1: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'กำลังดำเนินการ', color: 'bg-indigo-100 text-indigo-700' },
  4: { label: 'รอตรวจสรุป', color: 'bg-purple-100 text-purple-700' },
  5: { label: 'ปิดโครงการ', color: 'bg-green-100 text-green-700' },
  6: { label: 'ติดขัด', color: 'bg-red-100 text-red-600' },
  9: { label: 'ยกเลิก', color: 'bg-gray-200 text-gray-500' },
}

interface PlanData {
  schools: AreaPlanSchool[]
  budget_year: number
}

export default function AreaPlanPage() {
  const { userType, areacode, budgetYear } = useAppContext()
  const [data, setData] = useState<PlanData | null>(null)
  const [year, setYear] = useState<number>(0)
  const [filterSchool, setFilterSchool] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setYear(budgetYear || new Date().getFullYear() + 543) }, [budgetYear])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    apiGet<PlanData>(`area/plan?budget_year=${year}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year])

  if (userType !== 1 && userType !== 9) return <div className="p-6 text-red-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>

  const schools = data?.schools ?? []
  const filtered = filterSchool ? schools.filter((s) => s.sc_id === filterSchool) : schools

  return (
    <div className="p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">แผนงาน/โครงการ รายโรงเรียน</h1>
          <p className="text-sm text-gray-500">ปีงบประมาณ {year}</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-1.5 text-sm" value={filterSchool} onChange={(e) => setFilterSchool(Number(e.target.value))}>
            <option value={0}>ทุกโรงเรียน</option>
            {schools.map((s) => <option key={s.sc_id} value={s.sc_id}>{s.sc_name}</option>)}
          </select>
          <select className="border rounded px-3 py-1.5 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2569, 2568, 2567, 2566].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {filtered.map((sc) => (
        <div key={sc.sc_id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
          {/* school header */}
          <div className="px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800">{sc.sc_name}</h2>
            {sc.procurement && (
              <div className="flex gap-4 text-sm text-gray-600">
                <span>จัดซื้อ: <strong>{sc.procurement.cnt}</strong> รายการ</span>
                <span>วงเงิน: <strong className="text-blue-700">{fmtBaht(Number(sc.procurement.total_budget))}</strong> บาท</span>
                <span>อนุมัติแล้ว: <strong className="text-green-700">{fmtBaht(Number(sc.procurement.approved_budget))}</strong> บาท</span>
              </div>
            )}
          </div>
          {/* projects table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">ชื่อโครงการ</th>
                  <th className="px-3 py-2 text-center">สถานะ</th>
                  <th className="px-3 py-2 text-right">งบประมาณ</th>
                  <th className="px-3 py-2 text-center">ความคืบหน้า</th>
                  <th className="px-3 py-2 text-center">วันสิ้นสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sc.projects.map((p) => <ProjectRow key={p.proj_id} p={p} />)}
                {!sc.projects.length && (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-sm">ไม่มีโครงการ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!filtered.length && !loading && (
        <p className="text-center text-gray-400 py-12">ไม่พบข้อมูล</p>
      )}
    </div>
  )
}

function ProjectRow({ p }: { p: AreaPlanProject }) {
  const st = PROJ_STATUS[p.proj_status] ?? PROJ_STATUS[0]
  const pct = Number(p.progress_percent ?? 0)
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 max-w-xs">
        <p className="truncate font-medium">{p.proj_name}</p>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
      </td>
      <td className="px-3 py-2 text-right">
        {Number(p.proj_budget ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{pct.toFixed(0)}%</span>
        </div>
      </td>
      <td className="px-3 py-2 text-center text-gray-500 text-xs">
        {p.end_date ? new Date(p.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
      </td>
    </tr>
  )
}
