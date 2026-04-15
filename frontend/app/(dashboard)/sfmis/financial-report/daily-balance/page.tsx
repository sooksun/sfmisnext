'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet } from '@/lib/api'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'

interface DailyBalanceRow {
  id: number
  budget_type_name: string
  income: number
  expense: number
  balance: number
  date: string
}

export default function DailyBalancePage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.toISOString().substring(0, 10)
  })

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['daily-balance', scId, selectedDate, syId],
    queryFn: () =>
      apiGet<DailyBalanceRow[]>(`ReportDailyBalance/loadDailyBalance/${scId}/${selectedDate}/${syId}`),
    enabled: scId > 0 && syId > 0 && !!selectedDate,
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  const totalIncome = rows.reduce((s, r) => s + Number(r.income), 0)
  const totalExpense = rows.reduce((s, r) => s + Number(r.expense), 0)
  const totalBalance = rows.reduce((s, r) => s + Number(r.balance), 0)

  const columns = [
    { header: 'ประเภทงบประมาณ', key: 'budget_type_name' as keyof DailyBalanceRow },
    {
      header: 'รับเข้า (บาท)',
      render: (item: DailyBalanceRow) => (
        <span className="text-green-700">{fmt(item.income)}</span>
      ),
    },
    {
      header: 'จ่ายออก (บาท)',
      render: (item: DailyBalanceRow) => (
        <span className="text-red-600">{fmt(item.expense)}</span>
      ),
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: DailyBalanceRow) => (
        <span className={item.balance < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
          {fmt(item.balance)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ยอดเงินคงเหลือประจำวัน" />
      <div className="p-4 space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-sm font-medium">เลือกวันที่</Label>
            <ThaiDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              className="w-52"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />

        {rows.length > 0 && (
          <div className="flex justify-end gap-8 text-sm font-semibold border-t pt-3">
            <span>รวมรับเข้า: <span className="text-green-700">{fmt(totalIncome)}</span> บาท</span>
            <span>รวมจ่ายออก: <span className="text-red-600">{fmt(totalExpense)}</span> บาท</span>
            <span>รวมคงเหลือ: <span className={totalBalance < 0 ? 'text-red-600' : ''}>{fmt(totalBalance)}</span> บาท</span>
          </div>
        )}
      </div>
    </div>
  )
}
