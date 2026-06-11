'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { DeleteWithReasonDialog } from '@/components/shared/delete-with-reason-dialog'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppContext } from '@/hooks/use-app-context'

interface BankAccount {
  ba_id: number
  ba_name: string
  ba_no: string
  account_name: string
  account_no: string
  bank_name: string
}

interface LedgerRow {
  ble_id: number
  entry_type: number
  entry_type_label: string
  doc_no: string | null
  entry_date: string | null
  detail: string | null
  amount: number
  amount_in: number
  amount_out: number
  balance: number
  ref_type: string | null
  signer_name: string | null
  note: string | null
}

interface LedgerResponse {
  data: LedgerRow[]
  count: number
}

const schema = z.object({
  entry_type: z.number().min(1).max(2),
  entry_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  doc_no: z.string(),
  detail: z.string().min(1, 'กรุณาระบุรายการ'),
  amount: z.number().min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  note: z.string(),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  entry_type: 1,
  entry_date: '',
  doc_no: '',
  detail: '',
  amount: 0,
  note: '',
}

const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function BankLedgerPage() {
  const { scId, adminId, syId } = useAppContext()
  const queryClient = useQueryClient()
  const [selectedBaId, setSelectedBaId] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<LedgerRow | null>(null)
  const [deleteItem, setDeleteItem] = useState<LedgerRow | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const entryDateVal = watch('entry_date')
  const entryTypeVal = watch('entry_type')

  const { data: bankAccountsRaw } = useQuery({
    queryKey: ['bank-accounts-ledger', scId],
    queryFn: () => apiGet<BankAccount[]>(`Bank/loadBankAccount/${scId}`),
    enabled: scId > 0,
  })
  const bankAccounts: BankAccount[] = Array.isArray(bankAccountsRaw) ? bankAccountsRaw : []

  const { data: ledgerRaw, isLoading } = useQuery({
    queryKey: ['bank-ledger', scId, syId, selectedBaId],
    queryFn: () => apiGet<LedgerResponse>(`BankLedger/loadLedger/${scId}/${syId}/${selectedBaId}`),
    enabled: scId > 0 && syId > 0 && selectedBaId > 0,
  })
  const ledgerData = ledgerRaw && 'data' in ledgerRaw ? ledgerRaw : { data: [], count: 0 }
  const rows: LedgerRow[] = Array.isArray(ledgerData.data) ? ledgerData.data : []

  const totalIn = rows.reduce((s, r) => s + r.amount_in, 0)
  const totalOut = rows.reduce((s, r) => s + r.amount_out, 0)
  const balance = totalIn - totalOut
  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize)

  const selectedAccount = bankAccounts.find((a) => a.ba_id === selectedBaId)

  const addMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiPost('BankLedger/addEntry', {
        sc_id: scId,
        sy_id: syId,
        ba_id: selectedBaId,
        entry_type: values.entry_type,
        entry_date: values.entry_date,
        doc_no: values.doc_no || undefined,
        detail: values.detail,
        amount: values.amount,
        note: values.note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกสำเร็จ')
        queryClient.invalidateQueries({ queryKey: ['bank-ledger'] })
        setDialogOpen(false)
        reset(defaultValues)
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiPost(`BankLedger/updateEntry/${editItem!.ble_id}`, {
        entry_type: values.entry_type,
        entry_date: values.entry_date,
        doc_no: values.doc_no || undefined,
        detail: values.detail,
        amount: values.amount,
        note: values.note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'แก้ไขสำเร็จ')
        queryClient.invalidateQueries({ queryKey: ['bank-ledger'] })
        setDialogOpen(false)
        setEditItem(null)
        reset(defaultValues)
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ bleId, reason }: { bleId: number; reason: string }) =>
      apiPost('BankLedger/removeEntry', { ble_id: bleId, up_by: adminId, reason }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ลบสำเร็จ')
        queryClient.invalidateQueries({ queryKey: ['bank-ledger'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
      setDeleteItem(null)
    },
    onError: () => { toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'); setDeleteItem(null) },
  })

  const openAdd = () => {
    setEditItem(null)
    reset(defaultValues)
    setDialogOpen(true)
  }

  const openEdit = (row: LedgerRow) => {
    setEditItem(row)
    reset({
      entry_type: row.entry_type,
      entry_date: row.entry_date ?? '',
      doc_no: row.doc_no ?? '',
      detail: row.detail ?? '',
      amount: row.amount,
      note: row.note ?? '',
    })
    setDialogOpen(true)
  }

  const onSubmit = (values: FormValues) => {
    if (editItem) {
      updateMutation.mutate(values)
    } else {
      addMutation.mutate(values)
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending

  const columns = [
    {
      header: 'ลำดับ',
      render: (row: LedgerRow) => (
        <span>{pagedRows.indexOf(row) + 1 + page * pageSize}</span>
      ),
    },
    {
      header: 'วันที่',
      render: (row: LedgerRow) => <span>{row.entry_date ? fmtDateTH(row.entry_date) : '-'}</span>,
    },
    {
      header: 'เลขที่เอกสาร',
      render: (row: LedgerRow) => <span>{row.doc_no ?? '-'}</span>,
    },
    {
      header: 'รายการ',
      render: (row: LedgerRow) => <span className="whitespace-pre-wrap max-w-xs block">{row.detail ?? '-'}</span>,
    },
    {
      header: 'ฝาก (บาท)',
      headerClassName: 'text-right',
      render: (row: LedgerRow) => (
        <span className={`block text-right ${row.amount_in > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
          {row.amount_in > 0 ? fmt(row.amount_in) : '-'}
        </span>
      ),
    },
    {
      header: 'ถอน (บาท)',
      headerClassName: 'text-right',
      render: (row: LedgerRow) => (
        <span className={`block text-right ${row.amount_out > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          {row.amount_out > 0 ? fmt(row.amount_out) : '-'}
        </span>
      ),
    },
    {
      header: 'คงเหลือ (บาท)',
      headerClassName: 'text-right',
      render: (row: LedgerRow) => (
        <span className={`block text-right font-bold ${row.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {fmt(row.balance)}
        </span>
      ),
    },
    {
      header: 'ผู้ลงนาม',
      render: (row: LedgerRow) => <span>{row.signer_name ?? '-'}</span>,
    },
    {
      header: 'จัดการ',
      render: (row: LedgerRow) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-600 hover:text-blue-800"
            onClick={() => openEdit(row)}
            title="แก้ไข"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-600 hover:text-red-800"
            onClick={() => setDeleteItem(row)}
            title="ลบ"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-0">
      <PageHeader
        title="ทะเบียนคุมเงินฝากธนาคาร"
        subtitle={selectedAccount ? `${selectedAccount.ba_name} — ${selectedAccount.bank_name} เลขที่ ${selectedAccount.account_no || selectedAccount.ba_no}` : 'เลือกบัญชีธนาคารเพื่อดูรายการ'}
        actions={
          <Button
            onClick={openAdd}
            disabled={selectedBaId === 0}
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        }
      />

      {/* Bank Account Selector */}
      <div className="px-4">
        <div className="flex flex-wrap gap-2">
          {bankAccounts.length === 0 && (
            <span className="text-sm text-gray-400">ไม่พบบัญชีธนาคาร</span>
          )}
          {bankAccounts.map((acc) => (
            <button
              key={acc.ba_id}
              onClick={() => { setSelectedBaId(acc.ba_id); setPage(0) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                selectedBaId === acc.ba_id
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>{acc.ba_name}</span>
              <span className="text-xs opacity-80">{acc.account_no || acc.ba_no}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Info Bar */}
      {selectedBaId > 0 && (
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-medium">ยอดฝากทั้งหมด</p>
                <p className="text-lg font-bold text-blue-700">{fmt(totalIn)} บาท</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <TrendingDown className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="text-xs text-red-600 font-medium">ยอดถอนทั้งหมด</p>
                <p className="text-lg font-bold text-red-700">{fmt(totalOut)} บาท</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${balance < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <CreditCard className={`h-5 w-5 shrink-0 ${balance < 0 ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <p className={`text-xs font-medium ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>คงเหลือ</p>
                <p className={`text-lg font-extrabold ${balance < 0 ? 'text-red-700' : 'text-green-700'}`}>{fmt(balance)} บาท</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="px-4 pb-6">
        {selectedBaId === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            กรุณาเลือกบัญชีธนาคารด้านบน
          </div>
        ) : (
          <DataTable<LedgerRow>
            columns={columns}
            data={pagedRows}
            total={rows.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            loading={isLoading}
            emptyText="ยังไม่มีรายการ"
          />
        )}
      </div>

      {/* Add/Edit Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); reset(defaultValues) }}
        title={editItem ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={editItem ? 'บันทึกการแก้ไข' : 'บันทึก'}
        loading={isPending}
        size="md"
      >
        <div className="flex flex-col gap-4">
          {/* entry_type */}
          <div className="flex flex-col gap-1">
            <Label>ประเภทรายการ <span className="text-red-500">*</span></Label>
            <Select
              value={String(entryTypeVal)}
              onValueChange={(v) => setValue('entry_type', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ฝาก</SelectItem>
                <SelectItem value="2">ถอน</SelectItem>
              </SelectContent>
            </Select>
            {errors.entry_type && <span className="text-xs text-red-500">{errors.entry_type.message}</span>}
          </div>

          {/* entry_date */}
          <div className="flex flex-col gap-1">
            <Label>วันที่ <span className="text-red-500">*</span></Label>
            <ThaiDatePicker
              value={entryDateVal}
              onChange={(v) => setValue('entry_date', v, { shouldValidate: true })}
            />
            {errors.entry_date && <span className="text-xs text-red-500">{errors.entry_date.message}</span>}
          </div>

          {/* doc_no */}
          <div className="flex flex-col gap-1">
            <Label>เลขที่เอกสาร</Label>
            <Input
              {...register('doc_no')}
              placeholder="เลขที่เอกสาร (ถ้ามี)"
            />
          </div>

          {/* detail */}
          <div className="flex flex-col gap-1">
            <Label>รายการ <span className="text-red-500">*</span></Label>
            <Input
              {...register('detail')}
              placeholder="ระบุรายการ"
            />
            {errors.detail && <span className="text-xs text-red-500">{errors.detail.message}</span>}
          </div>

          {/* amount */}
          <div className="flex flex-col gap-1">
            <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount && <span className="text-xs text-red-500">{errors.amount.message}</span>}
          </div>

          {/* note */}
          <div className="flex flex-col gap-1">
            <Label>หมายเหตุ</Label>
            <Input
              {...register('note')}
              placeholder="หมายเหตุ (ถ้ามี)"
            />
          </div>
        </div>
      </FormDialog>

      {/* Confirm Delete Dialog */}
      <DeleteWithReasonDialog
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={(reason) => { if (deleteItem) deleteMutation.mutate({ bleId: deleteItem.ble_id, reason }) }}
        title="ยืนยันการลบรายการ"
        reasonLabel="เหตุผลการลบ"
        confirmLabel="ลบรายการ"
        itemLabel={`${deleteItem?.detail ?? ''} จำนวน ${deleteItem ? fmt(deleteItem.amount) : ''} บาท`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
