'use client'
import { useState, useEffect } from 'react'
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
import { apiGet } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'

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
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [year, setYear] = useState('')
  const [selectedBaId, setSelectedBaId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-report', scId],
    queryFn: () => apiGet<BankAccount[]>(`Bank/loadBankAccount/${scId}`),
    enabled: scId > 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['bookbank', selectedBaId, scId, syId, year],
    queryFn: () => apiGet<BookbankEntry[]>(
      `ReportRegisterBookbank/loadReportRegisterBookbank/${selectedBaId}/${scId}/${syId}/${year}`
    ),
    enabled: selectedBaId > 0 && scId > 0 && syId > 0 && year !== '',
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const bankList = Array.isArray(bankAccounts) ? bankAccounts : []

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
