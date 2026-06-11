'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow } from '@/lib/print-utils'
import { withholdingCertNo, withholdingCertificateForm } from '@/lib/official-finance-forms'

interface Certificate {
  cert_id: number
  cert_no: string
  cert_date: string
  cert_amount: number // ภาษีหัก ณ ที่จ่าย
  gross_amount: number // จำนวนเงินได้
  detail: string
  partner_name: string
  project_name: string
  budget_type_name: string
  status: number
  up_by: string
  up_date: string
}

export default function CertificatePage() {
  const { scId, budgetYear: budgetYearRaw, scName } = useAppContext()
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

  // พิมพ์หนังสือรับรองการหักภาษี ณ ที่จ่าย แบบ บก.28 (Save as PDF ได้จากหน้าพิมพ์)
  function printCert(item: Certificate) {
    const { title, body } = withholdingCertificateForm({
      scName,
      certNo: withholdingCertNo(item.cert_no, year),
      certDate: item.cert_date,
      payDate: item.cert_date,
      partnerName: item.partner_name,
      payTypeName: item.budget_type_name || item.detail,
      incomeAmount: Number(item.gross_amount ?? 0),
      taxAmount: Number(item.cert_amount ?? 0),
    })
    openPrintWindow({ title, body })
  }

  const columns = [
    {
      header: 'เลขที่หนังสือรับรอง',
      render: (item: Certificate) => <span>{withholdingCertNo(item.cert_no, year)}</span>,
    },
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
    {
      header: 'พิมพ์',
      render: (item: Certificate) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => printCert(item)}
          title="พิมพ์ / บันทึก PDF หนังสือรับรองหักภาษี (แบบ บก.28)"
        >
          <Printer className="h-3 w-3 mr-1" />
          PDF
        </Button>
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
