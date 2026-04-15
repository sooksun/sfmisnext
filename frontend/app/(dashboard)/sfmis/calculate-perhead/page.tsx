'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'

interface PerheadCalcItem {
  st_id: number
  class_id: number
  class_lev: string
  bg_type_id: number
  budget_type: string
  st_count: number
  amount: number
  budget_per_head: number
  crb_id?: number
}

interface PerheadCalcResponse {
  data: PerheadCalcItem[]
  count: number
  totalprice: number
}

export default function CalculatePerheadPage() {
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.budget_date?.sy_id) setSyId(Number(years.budget_date.sy_id))
      else if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['calculate-perhead', scId, syId],
    queryFn: () => apiGet<PerheadCalcResponse>(`Student/loadCalculatePerhead/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data?.data) ? data.data : []
  const totalPrice = data?.totalprice ?? 0

  const columns = [
    { header: 'ระดับชั้น', key: 'class_lev' as keyof PerheadCalcItem },
    { header: 'ประเภทงบ', key: 'budget_type' as keyof PerheadCalcItem },
    {
      header: 'จำนวนนักเรียน',
      render: (item: PerheadCalcItem) => (
        <span className="text-right block">{Number(item.st_count).toLocaleString()}</span>
      ),
    },
    {
      header: 'เงินต่อหัว (บาท)',
      render: (item: PerheadCalcItem) => (
        <span className="text-right block">{fmt(item.budget_per_head || item.amount)}</span>
      ),
    },
    {
      header: 'รวม (บาท)',
      render: (item: PerheadCalcItem) => (
        <span className="text-right block font-semibold">
          {fmt(item.st_count * (item.budget_per_head || item.amount))}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="คำนวณเงินต่อหัวนักเรียน" />
      <div className="p-4 space-y-4">
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
        {!isLoading && rows.length > 0 && (
          <div className="flex justify-end">
            <div className="bg-indigo-50 border border-indigo-200 rounded px-6 py-3 text-right">
              <div className="text-sm text-indigo-600">ยอดรวมทั้งหมด</div>
              <div className="text-2xl font-bold text-indigo-700">{fmt(totalPrice)} บาท</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
