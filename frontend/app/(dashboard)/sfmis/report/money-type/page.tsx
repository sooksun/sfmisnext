'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { apiGet } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'

interface BudgetType {
  bg_type_id: number
  bg_type_name: string
}

interface MoneyTypeEntry {
  mt_id: number
  detail: string
  receive_date: string
  amount_in: number
  amount_out: number
  balance: number
  budget_type_name: string
  up_by: string
  up_date: string
}

export default function MoneyTypePage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [year, setYear] = useState('')
  const [selectedBgTypeId, setSelectedBgTypeId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-types-money'],
    queryFn: () => apiGet<BudgetType[]>('Register_control_money_type/load_budget_type'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['money-type', selectedBgTypeId, scId, syId, year],
    queryFn: () => apiGet<MoneyTypeEntry[]>(
      `Register_control_money_type/load_register_control_money_type/${selectedBgTypeId}/${scId}/${syId}/${year}`
    ),
    enabled: selectedBgTypeId > 0 && scId > 0 && syId > 0 && year !== '',
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const typeList = Array.isArray(budgetTypes) ? budgetTypes : []

  const columns = [
    { header: 'วันที่', render: (item: MoneyTypeEntry) => <span>{fmtDateTH(item.receive_date)}</span> },
    { header: 'รายละเอียด', key: 'detail' as keyof MoneyTypeEntry },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof MoneyTypeEntry },
    {
      header: 'รับ (บาท)',
      render: (item: MoneyTypeEntry) => (
        <span className="text-green-600">{item.amount_in > 0 ? fmt(item.amount_in) : '-'}</span>
      ),
    },
    {
      header: 'จ่าย (บาท)',
      render: (item: MoneyTypeEntry) => (
        <span className="text-red-500">{item.amount_out > 0 ? fmt(item.amount_out) : '-'}</span>
      ),
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: MoneyTypeEntry) => <span className="font-semibold">{fmt(item.balance)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: MoneyTypeEntry) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงานควบคุมเงินตามประเภท" />
      <div className="p-4 space-y-4">
        <div className="max-w-sm">
          <Label>เลือกประเภทงบประมาณ</Label>
          <Select
            value={selectedBgTypeId > 0 ? String(selectedBgTypeId) : ''}
            onValueChange={(v) => setSelectedBgTypeId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภทงบประมาณ" />
            </SelectTrigger>
            <SelectContent>
              {typeList.map((t) => (
                <SelectItem key={t.bg_type_id} value={String(t.bg_type_id)}>
                  {t.bg_type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>
    </div>
  )
}
