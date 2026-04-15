'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'

interface EstimateGroup {
  budget_type_id: number
  budget_type_name: string
  estimate_amount: number
  real_amount: number
  remain_amount: number
  budget_year: number
}

export default function EstimateAcadyearPage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [year, setYear] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setYear(Number(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['estimate-acadyear', scId, year, syId],
    queryFn: () =>
      apiGet<EstimateGroup[]>(`Budget/loadEstimateAcadyearGroup/${scId}/${year}/${syId}`),
    enabled: scId > 0 && syId > 0 && year > 0,
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
