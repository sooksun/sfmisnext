'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, TrendingDown, Wallet, Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { fmtDateTH, showNumber, cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow } from '@/lib/print-utils'
import { officialNonBudgetRegisterForm, officialSchoolRevenueReport } from '@/lib/official-forms'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryItem {
  bg_type_id: number
  budget_type: string
  revenue: number
  expenses: number
  balance: number
  entry_count: number
}

interface TransactionRow {
  ft_id: number
  type: number
  amount: number
  create_date: string | null
  doc_no: string | null
  detail: string | null
  balance: number
  receive_money_type: number | null
}

interface DetailResponse {
  bg_type_id: number
  budget_type: string
  carry_forward: number
  revenue: number
  expenses: number
  balance: number
  transactions: TransactionRow[]
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {[40, 120, 120, 200, 100, 100, 100].map((w, j) => (
            <td key={j} className="px-4 py-2">
              <div className="h-4 rounded bg-gray-200" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UnifiedRegisterPage() {
  const { scId, syId, budgetYear: budgetYearRaw, scName } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  // ── localStorage state ────────────────────────────────────────────────────

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  // ── Summary query ─────────────────────────────────────────────────────────
  const enabled = scId > 0 && syId > 0 && apiYear !== ''

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['unified-register-summary', scId, syId, apiYear],
    queryFn: () =>
      apiGet<SummaryItem[]>(`UnifiedRegister/summary/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  // Auto-select first tab when summary loads
  useEffect(() => {
    if (summaryData && summaryData.length > 0 && activeTab === null) {
      setActiveTab(summaryData[0].bg_type_id)
    }
  }, [summaryData, activeTab])

  // ── Detail query (lazy — only when tab selected) ──────────────────────────
  const detailPath = activeTab !== null
    ? `UnifiedRegister/detail/${scId}/${syId}/${apiYear}/${activeTab}${
        appliedFrom || appliedTo
          ? `?from_date=${appliedFrom}&to_date=${appliedTo}`
          : ''
      }`
    : null

  const {
    data: detailData,
    isLoading: detailLoading,
    isFetching: detailFetching,
  } = useQuery({
    queryKey: ['unified-register-detail', scId, syId, apiYear, activeTab, appliedFrom, appliedTo],
    queryFn: () => apiGet<DetailResponse>(detailPath!),
    enabled: enabled && activeTab !== null,
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSearch() {
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
  }

  function handleClear() {
    setFromDate('')
    setToDate('')
    setAppliedFrom('')
    setAppliedTo('')
  }

  // พิมพ์แบบฟอร์ม "ทะเบียนคุมเงินนอกงบประมาณ" (คู่มือ ตย.8 / ตย.15)
  function handlePrint() {
    if (!detailData) return
    const isSR = (detailData.budget_type ?? '').includes('รายได้สถานศึกษา')
    const rows = (detailData.transactions ?? []).map((t) => {
      const doc = t.doc_no ?? ''
      // ที่เก็บเงินที่ยอดเปลี่ยน: เงินสด (รับเงินสด / จ่าย บค.) ที่เหลือเป็นธนาคาร
      const storage: 'cash' | 'bank' | 'smp' =
        (t.type === 1 && t.receive_money_type === 2) || /^บค/.test(doc) ? 'cash' : 'bank'
      if (isSR) {
        // เงินรายได้สถานศึกษา — แยกหมวด รายรับ/รายจ่าย จากข้อความรายการ (heuristic)
        const d = t.detail ?? ''
        const isIn = t.type === 1
        const isOut = t.type === -1
        return {
          date: t.create_date ?? '', docNo: t.doc_no, detail: t.detail, storage, note: null,
          inLgo: isIn && /อปท|เทศบาล|ท้องถิ่น/.test(d) ? t.amount : null,
          inDonation: isIn && /บริจาค|มอบให้|ผ้าป่า|กฐิน/.test(d) ? t.amount : null,
          inOther: isIn && !/อปท|เทศบาล|ท้องถิ่น|บริจาค|มอบให้|ผ้าป่า|กฐิน/.test(d) ? t.amount : null,
          outTeacher: isOut && /จ้าง.*ครู|ค่าจ้างครู|ค่าตอบแทนครู/.test(d) ? t.amount : null,
          outUtility: isOut && /ไฟฟ้า|น้ำประปา|ค่าน้ำ|โทรศัพท์|อินเทอร์เน็ต|สาธารณูปโภค/.test(d) ? t.amount : null,
          outOperate:
            isOut && !/จ้าง.*ครู|ค่าจ้างครู|ค่าตอบแทนครู|ไฟฟ้า|น้ำประปา|ค่าน้ำ|โทรศัพท์|อินเทอร์เน็ต|สาธารณูปโภค/.test(d)
              ? t.amount : null,
        }
      }
      // มาตรฐาน — จ่าย: บย.=ลูกหนี้(เงินยืม) อื่น ๆ=ใบสำคัญ
      const isLoan = /^บย/.test(doc)
      return {
        date: t.create_date ?? '', docNo: t.doc_no, detail: t.detail, storage, note: null,
        receive: t.type === 1 ? t.amount : null,
        payDebtor: t.type === -1 && isLoan ? t.amount : null,
        payVoucher: t.type === -1 && !isLoan ? t.amount : null,
      }
    })
    const body = officialNonBudgetRegisterForm({
      scName,
      fundTypeName: detailData.budget_type,
      budgetYear,
      variant: isSR ? 'school_revenue' : 'standard',
      opening: { bank: Number(detailData.carry_forward || 0) },
      rows,
    })
    openPrintWindow({ title: `ทะเบียนคุมเงิน_${detailData.budget_type}`, body })
  }

  // พิมพ์ "รายงานการรับ-จ่ายเงินรายได้สถานศึกษา" (form-030) — เฉพาะกองทุนเงินรายได้สถานศึกษา
  const isSchoolRevenue = (detailData?.budget_type ?? '').includes('รายได้สถานศึกษา')
  async function handlePrintRevenueReport() {
    if (!detailData || activeTab === null) return
    try {
      const rep = await apiGet<{
        opening: number
        income: Record<string, number>
        expense: Record<string, number>
        total_receive: number
        total_pay: number
        carry_forward: number
      }>(`UnifiedRegister/schoolRevenueReport/${scId}/${syId}/${apiYear}/${activeTab}`)
      const body = officialSchoolRevenueReport({
        scName,
        fiscalYear: budgetYear,
        opening: rep.opening,
        income: rep.income,
        expense: rep.expense,
        totalReceive: rep.total_receive,
        totalPay: rep.total_pay,
        carryForward: rep.carry_forward,
      })
      openPrintWindow({ title: `รายงานรับจ่ายรายได้สถานศึกษา_${budgetYear}`, body })
    } catch {
      // fallback: ยอดรวมอย่างเดียว
      const body = officialSchoolRevenueReport({
        scName,
        fiscalYear: budgetYear,
        totalReceive: Number(detailData.revenue || 0),
        totalPay: Number(detailData.expenses || 0),
        carryForward: Number(detailData.balance || 0),
      })
      openPrintWindow({ title: `รายงานรับจ่ายรายได้สถานศึกษา_${budgetYear}`, body })
    }
  }

  // ── Aggregate summary totals ───────────────────────────────────────────────
  const totalRevenue = summaryData?.reduce((s, r) => s + r.revenue, 0) ?? 0
  const totalExpenses = summaryData?.reduce((s, r) => s + r.expenses, 0) ?? 0
  const totalBalance = totalRevenue - totalExpenses

  const transactions: TransactionRow[] = detailData?.transactions ?? []
  const activeDetail = detailData

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ทะเบียนคุมเงินทุกประเภท" subtitle={budgetYear ? `ปีงบประมาณ พ.ศ. ${budgetYear}` : undefined} />
      <ProcessFlow flow="receive" />

      <div className="p-4 space-y-4">
        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        {summaryLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg border bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <TrendingUp className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-700">รวมรายรับทั้งหมด</p>
                <p className="text-lg font-bold text-green-800">{showNumber(totalRevenue)}</p>
                <p className="text-xs text-green-600">บาท</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <TrendingDown className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <p className="text-xs text-red-700">รวมรายจ่ายทั้งหมด</p>
                <p className="text-lg font-bold text-red-800">{showNumber(totalExpenses)}</p>
                <p className="text-xs text-red-600">บาท</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Wallet className="h-8 w-8 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-blue-700">คงเหลือสุทธิ</p>
                <p className={cn('text-lg font-bold', totalBalance < 0 ? 'text-red-700' : 'text-blue-800')}>
                  {showNumber(totalBalance)}
                </p>
                <p className="text-xs text-blue-600">บาท</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Date Filter Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-600">ตั้งแต่วันที่</label>
            <ThaiDatePicker value={fromDate} onChange={setFromDate} placeholder="เลือกวันที่เริ่ม" />
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-600">ถึงวันที่</label>
            <ThaiDatePicker value={toDate} onChange={setToDate} placeholder="เลือกวันที่สิ้นสุด" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="gap-1.5" size="sm">
              <Search className="h-4 w-4" />
              ค้นหา
            </Button>
            {(appliedFrom || appliedTo) && (
              <Button onClick={handleClear} variant="outline" size="sm">
                ล้างตัวกรอง
              </Button>
            )}
          </div>
          {(appliedFrom || appliedTo) && (
            <p className="text-xs text-gray-500 self-end">
              กรอง: {appliedFrom ? fmtDateTH(appliedFrom) : 'ทั้งหมด'} – {appliedTo ? fmtDateTH(appliedTo) : 'ทั้งหมด'}
            </p>
          )}
        </div>

        {/* ── Tab Selector ────────────────────────────────────────────────── */}
        {summaryLoading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-32 rounded-md bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(summaryData ?? []).map((item) => (
              <button
                key={item.bg_type_id}
                onClick={() => setActiveTab(item.bg_type_id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === item.bg_type_id
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
                )}
              >
                {item.budget_type}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    activeTab === item.bg_type_id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {item.entry_count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Active Tab Detail ────────────────────────────────────────────── */}
        {activeTab !== null && (
          <>
            {/* Tab header with sub-totals */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  {activeDetail?.budget_type ?? summaryData?.find((s) => s.bg_type_id === activeTab)?.budget_type ?? ''}
                </h2>
                {activeDetail && (
                  <div className="flex gap-4 text-xs text-gray-500 mt-0.5">
                    <span className="text-green-600">รับ {showNumber(activeDetail.revenue)} บาท</span>
                    <span className="text-red-500">จ่าย {showNumber(activeDetail.expenses)} บาท</span>
                    <span className={cn('font-semibold', activeDetail.balance < 0 ? 'text-red-600' : 'text-gray-700')}>
                      คงเหลือ {showNumber(activeDetail.balance)} บาท
                    </span>
                  </div>
                )}
              </div>
              {transactions.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                    <Printer className="h-4 w-4" /> ทะเบียนคุม
                  </Button>
                  {isSchoolRevenue && (
                    <Button variant="outline" size="sm" onClick={() => void handlePrintRevenueReport()} className="gap-1">
                      <Printer className="h-4 w-4" /> รายงานรับ-จ่ายรายได้สถานศึกษา
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Transaction table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'วันที่', 'เลขเอกสาร', 'รายการ', 'รับ (บาท)', 'จ่าย (บาท)', 'คงเหลือ (บาท)'].map(
                      (h, i) => (
                        <th
                          key={i}
                          className={cn(
                            'px-4 py-2 text-left text-sm font-bold text-blue-900',
                            i === 0 && 'w-12 text-center',
                            i >= 4 && 'text-right',
                          )}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detailLoading || detailFetching ? (
                    <SkeletonRows count={8} />
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        ไม่พบรายการ{appliedFrom || appliedTo ? 'ในช่วงวันที่ที่เลือก' : ''}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={tx.ft_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500 text-center">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {fmtDateTH(tx.create_date ?? '')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {tx.doc_no ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {tx.detail ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          {tx.type === 1 ? (
                            <span className="text-green-700 font-medium">{showNumber(tx.amount)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          {tx.type === -1 ? (
                            <span className="text-red-600 font-medium">{showNumber(tx.amount)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                          <span className={cn('font-semibold', tx.balance < 0 ? 'text-red-600' : 'text-gray-900')}>
                            {showNumber(tx.balance)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer totals */}
            {transactions.length > 0 && (
              <div className="flex flex-wrap justify-end gap-6 border-t pt-3 text-sm font-semibold">
                <span>
                  รวมรับ:{' '}
                  <span className="text-green-700">
                    {showNumber(transactions.filter((t) => t.type === 1).reduce((s, t) => s + t.amount, 0))}
                  </span>{' '}
                  บาท
                </span>
                <span>
                  รวมจ่าย:{' '}
                  <span className="text-red-600">
                    {showNumber(transactions.filter((t) => t.type === -1).reduce((s, t) => s + t.amount, 0))}
                  </span>{' '}
                  บาท
                </span>
                <span>
                  คงเหลือสุดท้าย:{' '}
                  <span className={cn(transactions[transactions.length - 1].balance < 0 ? 'text-red-600' : 'text-gray-900')}>
                    {showNumber(transactions[transactions.length - 1].balance)}
                  </span>{' '}
                  บาท
                </span>
              </div>
            )}
          </>
        )}

        {/* Empty state when no summary */}
        {!summaryLoading && (summaryData ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
            <Wallet className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p>ยังไม่มีข้อมูลทะเบียนคุมเงินในปีงบประมาณนี้</p>
          </div>
        )}
      </div>
    </div>
  )
}
