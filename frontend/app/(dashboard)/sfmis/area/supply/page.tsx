'use client'
import { useEffect, useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'
import type { AreaSupplySchool, AreaSupplyOrder } from '@/lib/types'

const fmtBaht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const ORDER_STATUS: Record<number, { label: string; color: string }> = {
  100: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600' },
  101: { label: 'รอผอ.อนุมัติ', color: 'bg-yellow-100 text-yellow-700' },
  102: { label: 'รออนุมัติ', color: 'bg-orange-100 text-orange-700' },
  200: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700' },
  201: { label: 'รับของแล้ว', color: 'bg-blue-100 text-blue-700' },
  299: { label: 'ยกเลิก', color: 'bg-red-100 text-red-500' },
}

interface SupplyData { schools: AreaSupplySchool[]; budget_year: number }

export default function AreaSupplyPage() {
  const { userType, budgetYear } = useAppContext()
  const [data, setData] = useState<SupplyData | null>(null)
  const [year, setYear] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setYear(budgetYear || new Date().getFullYear() + 543) }, [budgetYear])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    apiGet<SupplyData>(`area/supply?budget_year=${year}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year])

  if (userType !== 1 && userType !== 9) return <div className="p-6 text-red-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>

  const schools = data?.schools ?? []

  return (
    <div className="p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">พัสดุ/จัดซื้อ รายโรงเรียน</h1>
          <p className="text-sm text-gray-500">ปีงบประมาณ {year}</p>
        </div>
        <select className="border rounded px-3 py-1.5 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2569, 2568, 2567, 2566].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {/* สรุปรวม */}
      {schools.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SumCard label="ใบจัดซื้อรวม" value={String(schools.reduce((a, s) => a + s.orders.length, 0))} />
          <SumCard label="วงเงินรวม" value={`${fmtBaht(schools.reduce((a, s) => a + s.total_budget, 0))} บ.`} />
          <SumCard label="อนุมัติแล้ว" value={`${fmtBaht(schools.reduce((a, s) => a + s.approved_budget, 0))} บ.`} color="text-green-700" />
          <SumCard label="รอดำเนินการ" value={`${fmtBaht(schools.reduce((a, s) => a + (s.total_budget - s.approved_budget), 0))} บ.`} color="text-orange-600" />
        </div>
      )}

      {schools.map((sc) => (
        <div key={sc.sc_id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800">{sc.sc_name}</h2>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>วงเงิน: <strong className="text-blue-700">{fmtBaht(sc.total_budget)}</strong> บาท</span>
              <span>อนุมัติ: <strong className="text-green-700">{fmtBaht(sc.approved_budget)}</strong> บาท</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">เลขที่เอกสาร</th>
                  <th className="px-3 py-2 text-left">รายการ</th>
                  <th className="px-3 py-2 text-center">สถานะ</th>
                  <th className="px-3 py-2 text-right">วงเงิน (บาท)</th>
                  <th className="px-3 py-2 text-center">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sc.orders.map((o) => <OrderRow key={o.order_id} o={o} />)}
                {!sc.orders.length && (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-400">ไม่มีข้อมูลใบจัดซื้อ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!schools.length && !loading && (
        <p className="text-center text-gray-400 py-12">ไม่พบข้อมูล</p>
      )}
    </div>
  )
}

function SumCard({ label, value, color = 'text-gray-800' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-sm mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

function OrderRow({ o }: { o: AreaSupplyOrder }) {
  const st = ORDER_STATUS[o.order_status] ?? { label: String(o.order_status), color: 'bg-gray-100 text-gray-500' }
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-xs text-gray-500">{o.doc_no || '-'}</td>
      <td className="px-3 py-2 max-w-xs">
        <p className="truncate">{o.details || '-'}</p>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
      </td>
      <td className="px-3 py-2 text-right font-medium">{fmtBaht(o.budgets)}</td>
      <td className="px-3 py-2 text-center text-xs text-gray-500">
        {o.order_date ? new Date(o.order_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
      </td>
    </tr>
  )
}
