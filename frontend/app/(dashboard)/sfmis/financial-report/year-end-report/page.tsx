'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { showNumber } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptUsageReport {
  budget_year: string
  total_count: number
  by_type: { type_name: string; count: number; amount_total: number }[]
  deadline: string
  days_remaining: number
}

interface SchoolRevenueReport {
  budget_year: string
  total_income: number
  total_expense: number
  net: number
  by_category: { category: string; income: number; expense: number }[]
  deadline: string
  days_remaining: number
}

// ─── Countdown Badge ──────────────────────────────────────────────────────────

function CountdownBadge({ days }: { days: number }) {
  if (days > 7) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-5 py-4">
        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
        <div>
          <p className="text-3xl font-bold text-green-700">อีก {days} วัน</p>
          <p className="text-xs text-green-600 mt-0.5">ยังไม่ถึงกำหนดส่ง</p>
        </div>
      </div>
    )
  }
  if (days >= 1) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-300 px-5 py-4">
        <Clock className="h-6 w-6 text-yellow-500 shrink-0 animate-pulse" />
        <div>
          <p className="text-3xl font-bold text-yellow-700">อีก {days} วัน</p>
          <p className="text-xs text-yellow-600 mt-0.5">ใกล้ถึงกำหนดส่งแล้ว</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-300 px-5 py-4">
      <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
      <div>
        <p className="text-3xl font-bold text-red-700">เกินกำหนด {Math.abs(days)} วัน</p>
        <p className="text-xs text-red-600 mt-0.5">เกินกำหนดส่งแล้ว</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YearEndReportPage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const [budgetYear, setBudgetYear] = useState(() =>
    String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  )
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const [queryKey, setQueryKey] = useState(0)

  const enabled = scId > 0 && syId > 0 && apiYear !== ''

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: receiptReport, isLoading: loadingReceipt, refetch: refetchReceipt } = useQuery({
    queryKey: ['year-end-receipt', scId, syId, apiYear, queryKey],
    queryFn: () =>
      apiGet<ReceiptUsageReport>(`YearEndReport/receiptUsage/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  const { data: revenueReport, isLoading: loadingRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ['year-end-revenue', scId, syId, apiYear, queryKey],
    queryFn: () =>
      apiGet<SchoolRevenueReport>(`YearEndReport/schoolRevenue/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  // BE year สำหรับแสดงในกำหนดส่ง
  const byNum = parseInt(budgetYear, 10) || 0
  const deadlineYear = byNum >= 2400 ? byNum + 1 : byNum + 543 + 1

  function handleRefresh() {
    setQueryKey((k) => k + 1)
    void refetchReceipt()
    void refetchRevenue()
  }

  const isLoading = loadingReceipt || loadingRevenue

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงานสิ้นปีงบประมาณ" />

      <div className="p-4 space-y-4">
        {/* ── Top bar: year + refresh ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">ปีงบประมาณ</label>
            <input
              type="text"
              value={budgetYear}
              onChange={(e) => setBudgetYear(e.target.value)}
              className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="เช่น 2568"
            />
          </div>
          <Button
            onClick={handleRefresh}
            disabled={!enabled || isLoading}
            className="gap-1.5"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            โหลดข้อมูล
          </Button>
          {budgetYear && (
            <span className="text-sm text-gray-500">
              ปีงบประมาณ พ.ศ. {budgetYear}
            </span>
          )}
        </div>

        {/* ── Two report cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* ── Card 1: รายงานการใช้ใบเสร็จรับเงิน ────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-blue-700 px-5 py-3">
              <h2 className="text-sm font-semibold text-white">
                รายงานการใช้ใบเสร็จรับเงิน
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">ส่ง สพป. ภายใน 15 ต.ค.</p>
            </div>

            <div className="p-5 space-y-4">
              {/* countdown */}
              {receiptReport ? (
                <CountdownBadge days={receiptReport.days_remaining} />
              ) : (
                <div className="h-20 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
              )}

              {/* summary table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  สรุปการออกใบเสร็จ
                </h3>
                {loadingReceipt ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="pb-1.5 text-left font-medium">ประเภท</th>
                        <th className="pb-1.5 text-right font-medium">จำนวนใบ</th>
                        <th className="pb-1.5 text-right font-medium">ยอดรวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptReport && receiptReport.by_type.length > 0 ? (
                        receiptReport.by_type.map((row) => (
                          <tr key={row.type_name} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 text-gray-800">{row.type_name}</td>
                            <td className="py-2 text-right font-medium text-gray-900">{row.count.toLocaleString('th-TH')}</td>
                            <td className="py-2 text-right text-gray-700">{showNumber(row.amount_total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-sm text-gray-400">
                            ยังไม่มีข้อมูลใบเสร็จในปีนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {receiptReport && receiptReport.total_count > 0 && (
                      <tfoot>
                        <tr className="border-t border-gray-300 bg-gray-50">
                          <td className="pt-2 font-semibold text-gray-700">รวมทั้งหมด</td>
                          <td className="pt-2 text-right font-bold text-blue-700">
                            {receiptReport.total_count.toLocaleString('th-TH')} ใบ
                          </td>
                          <td className="pt-2 text-right font-bold text-gray-800">
                            {showNumber(receiptReport.by_type.reduce((s, r) => s + r.amount_total, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* footer deadline */}
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                กำหนดส่ง: 15 ตุลาคม {deadlineYear} (พ.ศ.)
              </p>
            </div>
          </div>

          {/* ── Card 2: รายงานรายรับ-รายจ่ายของโรงเรียน ──────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-emerald-700 px-5 py-3">
              <h2 className="text-sm font-semibold text-white">
                รายงานรายรับ-รายจ่ายของโรงเรียน
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">ส่ง สพป. ภายใน 30 ต.ค.</p>
            </div>

            <div className="p-5 space-y-4">
              {/* countdown */}
              {revenueReport ? (
                <CountdownBadge days={revenueReport.days_remaining} />
              ) : (
                <div className="h-20 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
              )}

              {/* summary table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  สรุปรายรับ-รายจ่ายตามหมวด
                </h3>
                {loadingRevenue ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="pb-1.5 text-left font-medium">หมวด</th>
                        <th className="pb-1.5 text-right font-medium">รายรับ (บาท)</th>
                        <th className="pb-1.5 text-right font-medium">รายจ่าย (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueReport && revenueReport.by_category.length > 0 ? (
                        revenueReport.by_category.map((row) => (
                          <tr key={row.category} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 text-gray-800">{row.category}</td>
                            <td className="py-2 text-right text-green-700">{showNumber(row.income)}</td>
                            <td className="py-2 text-right text-red-600">{showNumber(row.expense)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-sm text-gray-400">
                            ยังไม่มีข้อมูลรายรับในปีนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {revenueReport && revenueReport.by_category.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-gray-300 bg-gray-50 font-semibold">
                          <td className="pt-2 text-gray-700">รวมทั้งหมด</td>
                          <td className="pt-2 text-right text-green-700">
                            {showNumber(revenueReport.total_income)}
                          </td>
                          <td className="pt-2 text-right text-red-600">
                            {showNumber(revenueReport.total_expense)}
                          </td>
                        </tr>
                        <tr className="bg-gray-100">
                          <td className="pt-1.5 pb-2 font-bold text-gray-800">คงเหลือสุทธิ</td>
                          <td className="pt-1.5 pb-2 text-right" />
                          <td
                            className={`pt-1.5 pb-2 text-right font-bold text-base ${
                              revenueReport.net < 0 ? 'text-red-700' : 'text-gray-900'
                            }`}
                          >
                            {showNumber(revenueReport.net)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* footer deadline */}
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                กำหนดส่ง: 30 ตุลาคม {deadlineYear} (พ.ศ.)
              </p>
            </div>
          </div>
        </div>

        {/* ── Note ──────────────────────────────────────────────────────────── */}
        {!enabled && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            <AlertTriangle className="inline h-4 w-4 mr-1.5 mb-0.5" />
            กรุณาตรวจสอบว่าได้เลือกปีงบประมาณเรียบร้อยแล้ว
          </div>
        )}
      </div>
    </div>
  )
}
