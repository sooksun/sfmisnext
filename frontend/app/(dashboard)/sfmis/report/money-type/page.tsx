'use client'
import { useState } from 'react'
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
import { useAppContext } from '@/hooks/use-app-context'

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

interface MoneyTypeTxn {
  ft_id: number
  type: number
  amount: number
  create_date: string
  update_date: string
  receive_general?: { prd_detail?: string; pr_no?: string } | null
  pay?: { detail?: string; no_doc?: string } | null
  balance: number
}

interface MoneyTypeResponse {
  carry_forward: number
  revenue: number
  expenses: number
  total: number
  data: { budget_type: string; transaction: MoneyTypeTxn[] }[]
}

export default function MoneyTypePage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const year = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [selectedBgTypeId, setSelectedBgTypeId] = useState(0)

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-types-money'],
    queryFn: () => apiGet<BudgetType[]>('Register_control_money_type/load_budget_type'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['money-type', selectedBgTypeId, scId, syId, apiYear],
    queryFn: () => apiGet<MoneyTypeResponse>(
      `Register_control_money_type/load_register_control_money_type/${selectedBgTypeId}/${scId}/${syId}/${apiYear}`
    ),
    enabled: selectedBgTypeId > 0 && scId > 0 && syId > 0 && apiYear !== '',
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const typeList = Array.isArray(budgetTypes) ? budgetTypes : []

  // backend คืน object ซ้อน { carry_forward, revenue, expenses, data:[{budget_type, transaction:[]}] }
  // → แปลงเป็นแถวตารางที่หน้าใช้แสดง
  const budgetTypeName = data?.data?.[0]?.budget_type ?? ''
  const rows: MoneyTypeEntry[] = (data?.data?.[0]?.transaction ?? []).map((t, i) => {
    const docNo = t.type === 1 ? t.receive_general?.pr_no : t.pay?.no_doc
    const text = t.type === 1 ? t.receive_general?.prd_detail : t.pay?.detail
    return {
      mt_id: t.ft_id ?? i,
      detail: [docNo, text].filter(Boolean).join(' · ') || '-',
      receive_date: t.create_date,
      amount_in: t.type === 1 ? Number(t.amount) : 0,
      amount_out: t.type === -1 ? Number(t.amount) : 0,
      balance: Number(t.balance),
      budget_type_name: budgetTypeName,
      up_by: '',
      up_date: t.update_date,
    }
  })

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

        {selectedBgTypeId > 0 && data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-gray-500">ยอดยกมา</div>
              <div className="text-lg font-semibold">{fmt(data.carry_forward ?? 0)}</div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-gray-500">รวมรับ</div>
              <div className="text-lg font-semibold text-green-600">{fmt(data.revenue ?? 0)}</div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-gray-500">รวมจ่าย</div>
              <div className="text-lg font-semibold text-red-500">{fmt(data.expenses ?? 0)}</div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs text-gray-500">คงเหลือ</div>
              <div className="text-lg font-semibold">{fmt(data.total ?? 0)}</div>
            </div>
          </div>
        )}

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
