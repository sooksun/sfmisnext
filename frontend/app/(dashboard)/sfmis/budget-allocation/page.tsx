'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'

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
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setBudgetYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['budget-allocation', scId, syId, budgetYear],
    queryFn: () =>
      apiGet<BudgetCategory[]>(
        `Budget/loadPLNBudgetCategory/${scId}/${syId}/${budgetYear}`
      ),
    enabled: scId > 0 && syId > 0 && !!budgetYear,
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
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
    { header: 'ปีงบประมาณ', key: 'budget_year' as keyof BudgetCategory },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="การจัดสรรงบประมาณ" />
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
