'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Printer } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { ExportButton } from '@/components/ui/export-button'
import { exportToXlsx } from '@/lib/export-xlsx'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow, makeHeader, fmtBaht, makeSignatures } from '@/lib/print-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BalanceByType {
  bgTypeId: number
  bgTypeName: string
  carryForward: number
  income: number
  expense: number
  balance: number
  cashBalance: number
  bankBalance: number
}

interface DailyBalanceResult {
  date: string
  balanceByType: BalanceByType[]
  totalCashBalance: number
  totalBankBalance: number
  totalBalance: number
  cashLimitAmount: number
  cashLimitExceeded: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyBalancePage() {
  const { scId, syId, budgetYear, scName } = useAppContext()
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [searchDate, setSearchDate] = useState(today)

  const { data, isLoading, isFetching } = useQuery<DailyBalanceResult>({
    queryKey: ['daily-balance', scId, syId, searchDate],
    queryFn: () => apiGet<DailyBalanceResult>(`ReportDailyBalance/loadDailyBalance/${scId}/${searchDate}/${syId}`),
    enabled: scId > 0 && !!searchDate,
  })

  function handleSearch() { setSearchDate(selectedDate) }

  function handlePrint() {
    if (!data) return
    const rows = (data.balanceByType ?? []).map((r, i) =>
      `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${r.bgTypeName}</td>
        <td style="text-align:right">${fmtBaht(r.carryForward)}</td>
        <td style="text-align:right">${fmtBaht(r.income)}</td>
        <td style="text-align:right">${fmtBaht(r.expense)}</td>
        <td style="text-align:right">${fmtBaht(r.cashBalance)}</td>
        <td style="text-align:right">${fmtBaht(r.bankBalance)}</td>
        <td style="text-align:right">${fmtBaht(r.balance)}</td>
      </tr>`,
    ).join('')

    const header = makeHeader({ title: 'รายงานเงินคงเหลือประจำวัน', subtitle: `วันที่ ${fmtDateTH(searchDate)}`, scName })
    const table = `<table border="1" style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f0f0f0;font-weight:bold;text-align:center">
        <th>ที่</th><th>ประเภทเงิน</th><th>ยอดยกมา</th><th>รายรับ</th><th>รายจ่าย</th>
        <th>เงินสดคงเหลือ</th><th>ธนาคารคงเหลือ</th><th>คงเหลือรวม</th>
      </tr></thead><tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:bold;background:#e8f4fd">
        <td colspan="5" style="text-align:right">รวมทั้งสิ้น</td>
        <td style="text-align:right">${fmtBaht(data.totalCashBalance)}</td>
        <td style="text-align:right">${fmtBaht(data.totalBankBalance)}</td>
        <td style="text-align:right">${fmtBaht(data.totalBalance)}</td>
      </tr></tfoot>
    </table>`
    openPrintWindow({ title: `คงเหลือ_${searchDate}`, body: header + table + makeSignatures(['เจ้าหน้าที่การเงิน', 'ผู้อำนวยการ']) })
  }

  const balanceItems: BalanceByType[] = data?.balanceByType ?? []
  const hasData = balanceItems.length > 0

  return (
    <div className="space-y-4">
      <PageHeader title="รายงานเงินคงเหลือประจำวัน" subtitle={`ปีงบประมาณ ${budgetYear}`} />

      <div className="flex items-end gap-3 rounded-lg border bg-gray-50 p-4">
        <div className="space-y-1.5">
          <Label>เลือกวันที่</Label>
          <ThaiDatePicker value={selectedDate} onChange={(v) => setSelectedDate(v)} />
        </div>
        <Button onClick={handleSearch} disabled={isLoading || isFetching}>
          <Search className="h-4 w-4 mr-1" />ดูรายงาน
        </Button>
      </div>

      {hasData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-yellow-50 p-4 text-center">
            <p className="text-xs text-gray-500">เงินสดคงเหลือ</p>
            <p className="text-xl font-bold text-yellow-700">{data!.totalCashBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            {data!.cashLimitExceeded && <p className="text-xs text-red-600 mt-1">⚠️ เกินวงเงินสำรองจ่าย {data!.cashLimitAmount.toLocaleString('th-TH')} บาท</p>}
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 text-center">
            <p className="text-xs text-gray-500">เงินฝากธนาคาร</p>
            <p className="text-xl font-bold text-blue-700">{data!.totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-green-50 p-4 text-center">
            <p className="text-xs text-gray-500">คงเหลือรวมทั้งสิ้น</p>
            <p className="text-xl font-bold text-green-700">{data!.totalBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {hasData && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />พิมพ์รายงาน
          </Button>
          <ExportButton onExport={() => exportToXlsx(
            balanceItems.map((r, i) => ({ 'ที่': i + 1, 'ประเภทเงิน': r.bgTypeName, 'ยอดยกมา': r.carryForward, 'รายรับ': r.income, 'รายจ่าย': r.expense, 'เงินสดคงเหลือ': r.cashBalance, 'ธนาคารคงเหลือ': r.bankBalance, 'คงเหลือรวม': r.balance })),
            `คงเหลือ ${fmtDateTH(searchDate)}`,
            `daily-balance-${searchDate}`,
          )} />
        </div>
      )}

      {isLoading || isFetching ? (
        <div className="py-10 text-center text-sm text-gray-400">กำลังโหลดข้อมูล...</div>
      ) : !hasData ? (
        <div className="py-10 text-center text-sm text-gray-400">ไม่พบข้อมูลในวันที่เลือก</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 font-medium">
              <tr>
                <th className="px-3 py-2 text-center w-10">ที่</th>
                <th className="px-3 py-2 text-left">ประเภทเงิน</th>
                <th className="px-3 py-2 text-right">ยอดยกมา</th>
                <th className="px-3 py-2 text-right">รายรับ</th>
                <th className="px-3 py-2 text-right">รายจ่าย</th>
                <th className="px-3 py-2 text-right">เงินสดคงเหลือ</th>
                <th className="px-3 py-2 text-right">ธนาคารคงเหลือ</th>
                <th className="px-3 py-2 text-right">คงเหลือรวม</th>
              </tr>
            </thead>
            <tbody>
              {balanceItems.map((r, i) => (
                <tr key={r.bgTypeId} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 text-center">{i + 1}</td>
                  <td className="px-3 py-2">{r.bgTypeName}</td>
                  <td className="px-3 py-2 text-right">{r.carryForward.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right text-green-700">{r.income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right text-red-700">{r.expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">{r.cashBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">{r.bankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 font-bold">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right">รวมทั้งสิ้น</td>
                <td className="px-3 py-2 text-right">{data!.totalCashBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right">{data!.totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right text-blue-700">{data!.totalBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
