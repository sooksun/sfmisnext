'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface Certificate {
  cert_id: number
  cert_no: string
  cert_date: string
  cert_amount: number
  partner_name: string
  project_name: string
  budget_type_name: string
  status: number
  up_by: string
  up_date: string
}

export default function CertificatePage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const year = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { data, isLoading } = useQuery({
    queryKey: ['certificate', scId, apiYear],
    queryFn: () => apiGet<Certificate[]>(`Registration_certificate/loadregistrationcertificate/${scId}/${apiYear}`),
    enabled: scId > 0 && apiYear !== '',
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  const columns = [
    { header: 'เลขที่หนังสือรับรอง', key: 'cert_no' as keyof Certificate },
    { header: 'วันที่', render: (item: Certificate) => <span>{fmtDateTH(item.cert_date)}</span> },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: Certificate) => <span>{fmt(item.cert_amount)}</span>,
    },
    { header: 'ผู้ค้า / ผู้รับจ้าง', key: 'partner_name' as keyof Certificate },
    { header: 'โครงการ', key: 'project_name' as keyof Certificate },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof Certificate },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: Certificate) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="หนังสือรับรองการหักภาษี ณ ที่จ่าย" />
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
