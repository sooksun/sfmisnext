'use client'
import { useEffect, useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'
import type { AreaDashboard, AreaSchoolRow } from '@/lib/types'
import { fmtDateTH } from '@/lib/utils'

const fmtBaht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ASSESS_LEVEL: Record<number, { label: string; color: string }> = {
  0: { label: '-', color: 'text-gray-400' },
  1: { label: 'ปรับปรุง', color: 'text-red-600' },
  2: { label: 'พอใช้', color: 'text-orange-500' },
  3: { label: 'ดี', color: 'text-blue-600' },
  4: { label: 'ดีมาก', color: 'text-green-600' },
}

const ASSESS_STATUS: Record<number, string> = {
  0: 'ยังไม่ประเมิน',
  1: 'ร่าง',
  2: 'ยืนยันแล้ว',
  3: 'ส่ง สพท.',
}

export default function AreaDashboardPage() {
  const { userType, areacode, budgetYear } = useAppContext()
  const [data, setData] = useState<AreaDashboard | null>(null)
  const [year, setYear] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setYear(budgetYear || new Date().getFullYear() + 543)
  }, [budgetYear])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    apiGet<AreaDashboard>(`area/dashboard?budget_year=${year}${userType === 1 && areacode ? `&areacode=${areacode}` : ''}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, userType, areacode])

  if (userType !== 1 && userType !== 9) {
    return <div className="p-6 text-red-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
  }

  const ag = data?.aggregate
  const schools = data?.schools ?? []

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ภาพรวมสำนักงานเขตพื้นที่ {data?.areacode ?? areacode}</h1>
          <p className="text-sm text-gray-500">ปีงบประมาณ {data?.budget_year ?? year} · {schools.length} โรงเรียน</p>
        </div>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2569, 2568, 2567, 2566].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {/* Aggregate cards */}
      {ag && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card label="รวมรายรับ" value={fmtBaht(ag.total_in)} color="text-green-600" />
          <Card label="รวมรายจ่าย" value={fmtBaht(ag.total_out)} color="text-red-600" />
          <Card label="คงเหลือสุทธิ" value={fmtBaht(ag.balance)} color={ag.balance >= 0 ? 'text-blue-700' : 'text-red-700'} />
          <Card label="จำนวนโรงเรียน" value={String(ag.total_schools)} color="text-gray-700" />
          <Card label="จำนวนนักเรียน" value={ag.total_students.toLocaleString()} color="text-gray-700" />
        </div>
      )}

      {/* School comparison table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">โรงเรียน</th>
              <th className="px-3 py-2 text-right">รายรับ</th>
              <th className="px-3 py-2 text-right">รายจ่าย</th>
              <th className="px-3 py-2 text-right">คงเหลือ</th>
              <th className="px-3 py-2 text-center">นักเรียน</th>
              <th className="px-3 py-2 text-center">โครงการ<br/><span className="text-xs">(ทั้งหมด/กำลังทำ/ปิด)</span></th>
              <th className="px-3 py-2 text-center">ประเมินตนเอง</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {schools.map((sc) => (
              <SchoolRow key={sc.sc_id} sc={sc} />
            ))}
            {!schools.length && !loading && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
          {ag && (
            <tfoot className="bg-gray-50 font-semibold text-sm">
              <tr>
                <td className="px-3 py-2">รวมทั้งหมด</td>
                <td className="px-3 py-2 text-right text-green-700">{fmtBaht(ag.total_in)}</td>
                <td className="px-3 py-2 text-right text-red-700">{fmtBaht(ag.total_out)}</td>
                <td className="px-3 py-2 text-right text-blue-700">{fmtBaht(ag.balance)}</td>
                <td className="px-3 py-2 text-center">{ag.total_students.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function SchoolRow({ sc }: { sc: AreaSchoolRow }) {
  const lvl = ASSESS_LEVEL[sc.assessment_level] ?? ASSESS_LEVEL[0]
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 font-medium">{sc.sc_name}</td>
      <td className="px-3 py-2 text-right text-green-700">{fmtBaht(sc.total_in)}</td>
      <td className="px-3 py-2 text-right text-red-600">{fmtBaht(sc.total_out)}</td>
      <td className={`px-3 py-2 text-right font-medium ${sc.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBaht(sc.balance)}</td>
      <td className="px-3 py-2 text-center">{sc.students.toLocaleString()}</td>
      <td className="px-3 py-2 text-center text-sm">
        <span>{sc.projects_total}</span>
        <span className="text-gray-400 mx-1">/</span>
        <span className="text-blue-600">{sc.projects_active}</span>
        <span className="text-gray-400 mx-1">/</span>
        <span className="text-green-600">{sc.projects_done}</span>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-semibold ${lvl.color}`}>{lvl.label}</span>
          <span className="text-xs text-gray-400">{ASSESS_STATUS[sc.assessment_status] ?? '-'}</span>
          {sc.assessment_percent > 0 && (
            <span className="text-xs text-gray-600">{sc.assessment_percent.toFixed(1)}%</span>
          )}
        </div>
      </td>
    </tr>
  )
}
