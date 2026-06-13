'use client'
import { useEffect, useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'
import type { AreaFinanceSchool } from '@/lib/types'

const fmtBaht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TH_MONTH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function fmtYM(ym: string) {
  const [y, m] = ym.split('-')
  return `${TH_MONTH[Number(m) - 1]} ${Number(y) + 543}`
}

interface FinData { schools: AreaFinanceSchool[]; budget_year: number }

export default function AreaFinancePage() {
  const { userType, budgetYear } = useAppContext()
  const [data, setData] = useState<FinData | null>(null)
  const [year, setYear] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setYear(budgetYear || new Date().getFullYear() + 543) }, [budgetYear])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    apiGet<FinData>(`area/finance?budget_year=${year}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year])

  if (userType !== 1 && userType !== 9) return <div className="p-6 text-red-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>

  const schools = data?.schools ?? []

  // เดือนที่มีข้อมูล (union ทุกโรงเรียน)
  const allYM = Array.from(new Set(schools.flatMap((s) => s.monthly.map((m) => m.ym)))).sort()

  return (
    <div className="p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">การเงิน รายโรงเรียน</h1>
          <p className="text-sm text-gray-500">ปีงบประมาณ {year}</p>
        </div>
        <select className="border rounded px-3 py-1.5 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2569, 2568, 2567, 2566].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {/* เปรียบเทียบรายโรงเรียน */}
      <div className="grid md:grid-cols-2 gap-4">
        {schools.map((sc) => (
          <div key={sc.sc_id} className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
            <h2 className="font-semibold">{sc.sc_name}</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-green-50 p-2">
                <p className="text-xs text-gray-500">รายรับ</p>
                <p className="font-bold text-green-700 text-sm">{fmtBaht(sc.total_in)}</p>
              </div>
              <div className="rounded bg-red-50 p-2">
                <p className="text-xs text-gray-500">รายจ่าย</p>
                <p className="font-bold text-red-600 text-sm">{fmtBaht(sc.total_out)}</p>
              </div>
              <div className="rounded bg-blue-50 p-2">
                <p className="text-xs text-gray-500">คงเหลือ</p>
                <p className={`font-bold text-sm ${sc.total_in - sc.total_out >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {fmtBaht(sc.total_in - sc.total_out)}
                </p>
              </div>
            </div>
            {/* แยกตามประเภทเงิน */}
            {sc.by_type.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left py-1">ประเภทเงิน</th>
                    <th className="text-right py-1">รายรับ</th>
                    <th className="text-right py-1">รายจ่าย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sc.by_type.map((t) => (
                    <tr key={t.bg_type_id}>
                      <td className="py-1 text-gray-600 truncate max-w-[120px]">{t.bg_name}</td>
                      <td className="py-1 text-right text-green-700">{fmtBaht(t.total_in)}</td>
                      <td className="py-1 text-right text-red-600">{fmtBaht(t.total_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* ตารางรายเดือนเปรียบเทียบ */}
      {allYM.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
            รายรับ-จ่ายรายเดือน (เปรียบเทียบทุกโรงเรียน)
          </div>
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">เดือน</th>
                {schools.map((sc) => (
                  <th key={sc.sc_id} colSpan={2} className="px-2 py-2 text-center border-l">{sc.sc_name}</th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-1"></th>
                {schools.map((sc) => (
                  <>
                    <th key={`${sc.sc_id}-in`} className="px-2 py-1 text-right border-l text-green-600">รับ</th>
                    <th key={`${sc.sc_id}-out`} className="px-2 py-1 text-right text-red-500">จ่าย</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {allYM.map((ym) => (
                <tr key={ym} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium">{fmtYM(ym)}</td>
                  {schools.map((sc) => {
                    const m = sc.monthly.find((x) => x.ym === ym)
                    return (
                      <>
                        <td key={`${sc.sc_id}-in`} className="px-2 py-1.5 text-right border-l text-green-700">
                          {m ? fmtBaht(m.in) : '-'}
                        </td>
                        <td key={`${sc.sc_id}-out`} className="px-2 py-1.5 text-right text-red-600">
                          {m ? fmtBaht(m.out) : '-'}
                        </td>
                      </>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!schools.length && !loading && (
        <p className="text-center text-gray-400 py-12">ไม่พบข้อมูล</p>
      )}
    </div>
  )
}
