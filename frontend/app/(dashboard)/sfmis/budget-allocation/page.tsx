'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ProcessFlow } from '@/components/shared/process-flow'
import { apiGet } from '@/lib/api'
import { toBE } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ชื่อฟิลด์ตามที่ backend ส่งกลับมา (budget.service.ts::loadPLNBudgetCategory)
interface BudgetCategory {
  pbc_id: number
  bg_cate_id: number
  budget_cate: string
  percents: number
  total: number
  budget_income: number
  acad_year: number
  budget_year: string | number
}

export default function BudgetAllocationPage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { data, isLoading } = useQuery({
    queryKey: ['budget-allocation', scId, syId, apiYear],
    queryFn: () =>
      apiGet<BudgetCategory[]>(
        `Budget/loadPLNBudgetCategory/${scId}/${syId}/${apiYear}`
      ),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })

  const rows = Array.isArray(data) ? data : []

  const columns = useMemo(() => [
    { header: 'ประเภทงบประมาณ', key: 'budget_cate' as keyof BudgetCategory },
    {
      header: 'วงเงินงบประมาณ (บาท)',
      render: (item: BudgetCategory) => (
        <span>
          {Number(item.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'สัดส่วน (%)',
      render: (item: BudgetCategory) => (
        <span>{Number(item.percents ?? 0).toLocaleString('th-TH')}</span>
      ),
    },
    {
      header: 'ปีงบประมาณ',
      render: (item: BudgetCategory) => <span>{toBE(item.budget_year)}</span>,
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="การจัดสรรงบประมาณ" />
      <ProcessFlow flow="plan" />
      <div className="p-4">
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
