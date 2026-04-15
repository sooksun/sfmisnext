'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'

interface CheckControl {
  rw_id: number
  no_doc: string | null
  check_no_doc: string | null
  date_request: string | null
  offer_check_date: string | null
  amount: number
  detail: string | null
  status: number
  user_offer_check: number
  user_offer_check_name: string
  p_id: number
  partner_name: string
  bg_type_id: number
  budget_type: string
  remark: string | null
}

const statusLabel: Record<number, { label: string; color: string }> = {
  200: { label: 'ผอ.อนุมัติ', color: 'text-blue-600' },
  201: { label: 'ยกเลิกเช็ค', color: 'text-red-500' },
  202: { label: 'ออกเช็คแล้ว', color: 'text-green-600' },
}

export default function CheckControlPage() {
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
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['check-control', scId, syId],
    queryFn: () => apiGet<CheckControl[]>(`ReportCheckControl/loadCheckControl/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  const columns = [
    { header: 'เลขที่ใบสำคัญ', key: 'no_doc' as keyof CheckControl },
    { header: 'เลขที่เช็ค', key: 'check_no_doc' as keyof CheckControl },
    { header: 'วันที่ออกเช็ค', render: (item: CheckControl) => <span>{fmtDateTH(item.offer_check_date)}</span> },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: CheckControl) => <span>{fmt(item.amount)}</span>,
    },
    { header: 'ผู้รับเงิน', key: 'partner_name' as keyof CheckControl },
    { header: 'ประเภทงบ', key: 'budget_type' as keyof CheckControl },
    { header: 'รายละเอียด', key: 'detail' as keyof CheckControl },
    {
      header: 'สถานะ',
      render: (item: CheckControl) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'ผู้ออกเช็ค',
      render: (item: CheckControl) => (
        <span>{item.user_offer_check_name || '-'}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงานควบคุมเช็ค" />
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
