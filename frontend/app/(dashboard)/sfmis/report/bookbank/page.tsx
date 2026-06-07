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
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow } from '@/lib/print-utils'
import { officialBankDepositRegister } from '@/lib/official-forms'

interface BankAccount {
  ba_id: number
  bank_name: string
  account_no: string
  account_name: string
  budget_type_name: string
}

interface BookbankEntry {
  bb_id: number
  trans_date: string
  trans_no: string
  detail: string
  trans_in: number
  trans_out: number
  balance: number
  up_by: string
  up_date: string
}

export default function BookbankPage() {
  const { scId, syId, budgetYear: budgetYearRaw, scName } = useAppContext()
  const year = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [selectedBaId, setSelectedBaId] = useState(0)

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-report', scId],
    queryFn: () => apiGet<BankAccount[]>(`Bank/loadBankAccount/${scId}`),
    enabled: scId > 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['bookbank', selectedBaId, scId, syId, apiYear],
    queryFn: () => apiGet<BookbankEntry[]>(
      `ReportRegisterBookbank/loadReportRegisterBookbank/${selectedBaId}/${scId}/${syId}/${apiYear}`
    ),
    enabled: selectedBaId > 0 && scId > 0 && syId > 0 && apiYear !== '',
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const bankList = Array.isArray(bankAccounts) ? bankAccounts : []
  const selectedBank = bankList.find((b) => b.ba_id === selectedBaId)

  // พิมพ์ "ทะเบียนคุมเงินฝากธนาคาร" (คู่มือ ตย.5)
  function handlePrint() {
    if (rows.length === 0) return
    // แถวแรก "ยอดยกมาต้นปี" → ใช้เป็น opening ; ที่เหลือเป็นรายการ
    const openRow = rows.find((r) => /ยอดยกมา/.test(r.detail || ''))
    const txns = rows.filter((r) => !/ยอดยกมา/.test(r.detail || ''))
    const body = officialBankDepositRegister({
      scName,
      bankName: selectedBank?.bank_name,
      accountNo: selectedBank?.account_no,
      budgetYear: year,
      opening: openRow ? Number(openRow.balance) : 0,
      rows: txns.map((r) => ({
        date: r.trans_date,
        docNo: r.trans_no,
        detail: r.detail,
        deposit: Number(r.trans_in) || 0,
        withdraw: Number(r.trans_out) || 0,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมเงินฝากธนาคาร_${selectedBank?.account_no ?? ''}`, body })
  }

  const columns = [
    { header: 'วันที่', render: (item: BookbankEntry) => <span>{fmtDateTH(item.trans_date)}</span> },
    { header: 'เลขที่อ้างอิง', key: 'trans_no' as keyof BookbankEntry },
    { header: 'รายละเอียด', key: 'detail' as keyof BookbankEntry },
    {
      header: 'รับ (บาท)',
      render: (item: BookbankEntry) => (
        <span className="text-green-600">{item.trans_in > 0 ? fmt(item.trans_in) : '-'}</span>
      ),
    },
    {
      header: 'จ่าย (บาท)',
      render: (item: BookbankEntry) => (
        <span className="text-red-500">{item.trans_out > 0 ? fmt(item.trans_out) : '-'}</span>
      ),
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: BookbankEntry) => <span className="font-semibold">{fmt(item.balance)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: BookbankEntry) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงานสมุดบัญชีธนาคาร" />
      <div className="p-4 space-y-4">
        <div className="max-w-sm">
          <Label>เลือกบัญชีธนาคาร</Label>
          <Select
            value={selectedBaId > 0 ? String(selectedBaId) : ''}
            onValueChange={(v) => setSelectedBaId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกบัญชีธนาคาร" />
            </SelectTrigger>
            <SelectContent>
              {bankList.map((b) => (
                <SelectItem key={b.ba_id} value={String(b.ba_id)}>
                  {b.bank_name} — {b.account_no} ({b.account_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handlePrint} disabled={rows.length === 0}>
            <Printer className="h-4 w-4 mr-1" /> พิมพ์ทะเบียนคุมเงินฝากธนาคาร
          </Button>
        </div>

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
