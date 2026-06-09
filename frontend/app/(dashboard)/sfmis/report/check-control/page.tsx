'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow } from '@/lib/print-utils'
import { officialChequeRegister, officialPaymentVoucherRegister } from '@/lib/official-forms'

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
  const { scId, syId, budgetYear: budgetYearRaw, scName } = useAppContext()
  const beYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const { data, isLoading } = useQuery({
    queryKey: ['check-control', scId, syId],
    queryFn: () => apiGet<CheckControl[]>(`ReportCheckControl/loadCheckControl/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  // พิมพ์ "ทะเบียนคุมเช็ค" (คู่มือ ตย.6) — คุมลำดับเลขเช็คทั้งเล่ม
  //   รวมเช็คที่ "ยกเลิก" (status 201) ด้วย ไม่ใช่เฉพาะที่ออกแล้ว (202) เพื่อไม่ให้เลขเช็คข้าม
  function handlePrintCheque() {
    const cheques = rows
      .filter((r) => r.check_no_doc && (r.status === 202 || r.status === 201))
      .sort((a, b) =>
        String(a.check_no_doc).localeCompare(String(b.check_no_doc), undefined, { numeric: true }),
      )
    if (cheques.length === 0) return
    const body = officialChequeRegister({
      scName, budgetYear: beYear,
      rows: cheques.map((r) => {
        const cancelled = r.status === 201
        return {
          date: r.offer_check_date,
          chequeNo: r.check_no_doc,
          payee: cancelled ? 'ยกเลิก' : (r.partner_name || r.detail),
          amount: cancelled ? null : (Number(r.amount) || 0),
        }
      }),
    })
    openPrintWindow({ title: 'ทะเบียนคุมเช็ค', body })
  }

  // พิมพ์ "ทะเบียนคุมใบสำคัญคู่จ่าย" — แยก บค./บจ.
  function handlePrintVoucher() {
    const issued = rows.filter((r) => r.no_doc && r.status === 202)
    if (issued.length === 0) return
    const body = officialPaymentVoucherRegister({
      scName, budgetYear: beYear,
      rows: issued.map((r) => {
        const doc = r.no_doc ?? ''
        const isBc = /^บค/.test(doc)
        return {
          date: r.offer_check_date || r.date_request,
          bcNo: isBc ? doc : '',
          bjNo: isBc ? '' : doc,
          detail: r.partner_name || r.detail,
          amount: Number(r.amount) || 0,
        }
      }),
    })
    openPrintWindow({ title: 'ทะเบียนคุมใบสำคัญคู่จ่าย', body })
  }

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
      <PageHeader
        title="รายงานควบคุมเช็ค"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrintCheque} disabled={rows.length === 0}>
              <Printer className="h-4 w-4 mr-1" /> ทะเบียนคุมเช็ค
            </Button>
            <Button variant="outline" onClick={handlePrintVoucher} disabled={rows.length === 0}>
              <Printer className="h-4 w-4 mr-1" /> ใบสำคัญคู่จ่าย
            </Button>
          </div>
        }
      />
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
