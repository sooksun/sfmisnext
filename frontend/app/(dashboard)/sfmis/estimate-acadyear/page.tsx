'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

interface EstimateGroup {
  budget_type_id: number
  budget_type_name: string
  estimate_amount: number
  real_amount: number
  remain_amount: number
  budget_year: number
}

export default function EstimateAcadyearPage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const year = budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543
  const apiYear = budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { data, isLoading } = useQuery({
    queryKey: ['estimate-acadyear', scId, apiYear, syId],
    queryFn: () =>
      apiGet<EstimateGroup[]>(`Budget/loadEstimateAcadyearGroup/${scId}/${apiYear}/${syId}`),
    enabled: scId > 0 && syId > 0 && apiYear > 0,
  })

  const rows = Array.isArray(data) ? data : []

  const fmt = (n: number) =>
    Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  const columns = [
    { header: 'ประเภทงบประมาณ', key: 'budget_type_name' as keyof EstimateGroup },
    {
      header: 'ประมาณการ (บาท)',
      render: (item: EstimateGroup) => <span>{fmt(item.estimate_amount)}</span>,
    },
    {
      header: 'ใช้จริง (บาท)',
      render: (item: EstimateGroup) => <span>{fmt(item.real_amount)}</span>,
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: EstimateGroup) => (
        <span className={item.remain_amount < 0 ? 'text-red-600 font-semibold' : ''}>
          {fmt(item.remain_amount)}
        </span>
      ),
    },
    { header: 'ปีงบประมาณ', key: 'budget_year' as keyof EstimateGroup },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ประมาณการงบประมาณปีการศึกษา" />
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
