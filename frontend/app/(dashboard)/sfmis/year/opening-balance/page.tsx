'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { ExportButton } from '@/components/ui/export-button'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { exportToXlsx } from '@/lib/export-xlsx'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_TYPES: Record<number, string> = { 1: 'เงินสด', 2: 'ธนาคาร', 3: 'เงินฝาก สพป.' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpeningBalanceItem {
  ob_id: number
  money_type_id: number
  money_type_name: string | null
  storage_type: number
  bank_account_id: number | null
  amount: number
  balance_date: string | null
  remark: string | null
}

interface BudgetTypeItem { bg_type_id: number; budget_type: string }
interface BankAccountItem { baId: number; baName: string; baNo: string }

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  balance_date: z.string().min(1, 'กรุณาระบุวันที่'),
  money_type_id: z.number({ error: 'กรุณาเลือกประเภทเงิน' }).min(1),
  money_type_name: z.string().optional(),
  storage_type: z.number().min(1).max(3),
  bank_account_id: z.number().optional(),
  amount: z.number({ error: 'กรุณาระบุยอดเงิน' }).min(0),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningBalancePage() {
  const { scId, syId, budgetYear, adminId } = useAppContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<OpeningBalanceItem | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const queryKey = ['opening-balance', scId, syId, budgetYear]

  const { data: items = [], isLoading } = useQuery<OpeningBalanceItem[]>({
    queryKey,
    queryFn: () => apiGet<OpeningBalanceItem[]>(`OpeningBalance/load/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0,
  })

  const { data: budgetTypesData } = useQuery<{ data: BudgetTypeItem[] }>({
    queryKey: ['budget-types', scId],
    queryFn: () => apiGet<{ data: BudgetTypeItem[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })
  const budgetTypes = budgetTypesData?.data ?? []

  const { data: bankAccountsData } = useQuery<BankAccountItem[]>({
    queryKey: ['bank-accounts', scId],
    queryFn: () => apiGet<BankAccountItem[]>(`bank/loadBankAccount/${scId}`).catch(() => []),
    enabled: scId > 0,
  })
  const bankAccounts = bankAccountsData ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { storage_type: 1, amount: 0 },
  })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form
  const balanceDateVal = watch('balance_date')
  const storageTypeVal = watch('storage_type')

  const invalidate = () => qc.invalidateQueries({ queryKey })

  const addMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('OpeningBalance/add', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); invalidate() } else toast.error(r.ms) },
  })
  const updateMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('OpeningBalance/update', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); setEditItem(null); invalidate() } else toast.error(r.ms) },
  })
  const deleteMut = useMutation({
    mutationFn: (obId: number) => apiPost<{ flag: boolean; ms: string }>('OpeningBalance/delete', { ob_id: obId, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); invalidate() } else toast.error(r.ms) },
  })

  function openAdd() { setEditItem(null); reset({ storage_type: 1, amount: 0 }); setOpen(true) }
  function openEdit(item: OpeningBalanceItem) {
    setEditItem(item)
    reset({ balance_date: item.balance_date ?? '', money_type_id: item.money_type_id, money_type_name: item.money_type_name ?? '', storage_type: item.storage_type, bank_account_id: item.bank_account_id ?? undefined, amount: item.amount, remark: item.remark ?? '' })
    setOpen(true)
  }
  function onSubmit(vals: FormValues) {
    if (editItem) updateMut.mutate({ ob_id: editItem.ob_id, ...(vals as Record<string, unknown>), up_by: adminId })
    else addMut.mutate({ sc_id: scId, sy_id: syId, budget_year: String(budgetYear), up_by: adminId, ...(vals as Record<string, unknown>) })
  }

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalAmount = items.reduce((s, r) => s + r.amount, 0)

  const cols = [
    { header: 'วันที่ตั้งต้น', render: (r: OpeningBalanceItem) => fmtDateTH(r.balance_date) },
    { header: 'ประเภทเงิน', render: (r: OpeningBalanceItem) => r.money_type_name ?? '-' },
    { header: 'แหล่งเก็บ', render: (r: OpeningBalanceItem) => STORAGE_TYPES[r.storage_type] ?? '-' },
    { header: 'ยอดยกมา (บาท)', render: (r: OpeningBalanceItem) => <span className="font-medium">{r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>, headerClassName: 'text-right', className: 'text-right' },
    { header: 'หมายเหตุ', render: (r: OpeningBalanceItem) => r.remark ?? '-' },
    {
      header: '',
      render: (r: OpeningBalanceItem) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>แก้ไข</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => { if (confirm('ยืนยันลบ?')) deleteMut.mutate(r.ob_id) }}>ลบ</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="ตั้งค่ายอดเงินคงเหลือ (ยอดยกมา)" subtitle={`ปีงบประมาณ ${budgetYear} — ตั้งต้นยอดเงินแต่ละประเภท ณ วันเริ่มต้นปีงบประมาณ`}
        actions={
          <div className="flex gap-2">
            <ExportButton onExport={() => exportToXlsx(items.map((r) => ({ 'วันที่': fmtDateTH(r.balance_date), 'ประเภทเงิน': r.money_type_name, 'แหล่งเก็บ': STORAGE_TYPES[r.storage_type], 'ยอดยกมา': r.amount, 'หมายเหตุ': r.remark })), 'ยอดยกมา', `opening-balance-${budgetYear}`)} />
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />เพิ่มยอดยกมา</Button>
          </div>
        }
      />

      <DataTable columns={cols} data={paged} total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} loading={isLoading} emptyText="ยังไม่มียอดยกมา" />

      {items.length > 0 && (
        <div className="text-right text-sm font-medium">ยอดยกมารวม: <span className="text-blue-700 text-base">{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท</div>
      )}

      <FormDialog open={open} onClose={() => { setOpen(false); setEditItem(null) }} title={editItem ? 'แก้ไขยอดยกมา' : 'เพิ่มยอดยกมา'} size="md" loading={addMut.isPending || updateMut.isPending} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>วันที่ตั้งต้น <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={balanceDateVal ?? ''} onChange={(v) => setValue('balance_date', v, { shouldValidate: true })} />
              {errors.balance_date && <p className="text-xs text-red-500">{errors.balance_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทเงิน <span className="text-red-500">*</span></Label>
              <Select value={String(watch('money_type_id') ?? '')} onValueChange={(v) => {
                const bt = budgetTypes.find((m) => String(m.bg_type_id) === v)
                setValue('money_type_id', Number(v), { shouldValidate: true })
                setValue('money_type_name', bt?.budget_type ?? '')
              }}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทเงิน" /></SelectTrigger>
                <SelectContent>{budgetTypes.map((m) => <SelectItem key={m.bg_type_id} value={String(m.bg_type_id)}>{m.budget_type}</SelectItem>)}</SelectContent>
              </Select>
              {errors.money_type_id && <p className="text-xs text-red-500">{errors.money_type_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>แหล่งเก็บเงิน <span className="text-red-500">*</span></Label>
              <Select value={String(storageTypeVal ?? 1)} onValueChange={(v) => setValue('storage_type', Number(v), { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STORAGE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {storageTypeVal === 2 && (
              <div className="space-y-1.5">
                <Label>บัญชีธนาคาร</Label>
                <Select value={String(watch('bank_account_id') ?? '')} onValueChange={(v) => setValue('bank_account_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="เลือกบัญชี" /></SelectTrigger>
                  <SelectContent>{bankAccounts.map((ba) => <SelectItem key={ba.baId} value={String(ba.baId)}>{ba.baName} ({ba.baNo})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>ยอดยกมา (บาท) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Input {...register('remark')} placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
