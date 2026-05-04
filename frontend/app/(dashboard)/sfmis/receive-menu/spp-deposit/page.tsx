'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmpEntry {
  sde_id: number
  entry_type: number
  doc_no: string | null
  doc_date: string | null
  detail: string | null
  amount: number
  money_type_id: number | null
  money_type_name: string | null
  note: string | null
}

interface BudgetTypeItem { bg_type_id: number; budget_type: string }

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  entry_type: z.number().min(1).max(2),
  doc_no: z.string().optional(),
  doc_date: z.string().min(1, 'กรุณาระบุวันที่'),
  detail: z.string().min(1, 'กรุณาระบุรายการ'),
  amount: z.number({ error: 'กรุณาระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  money_type_id: z.number().optional(),
  money_type_name: z.string().optional(),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function SppDepositPage() {
  const { scId, syId, budgetYear, adminId } = useAppContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<SmpEntry | null>(null)
  const [currentType, setCurrentType] = useState<1 | 2>(1)
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const queryKey = ['smp-deposit', scId, syId, budgetYear]

  const { data: entries = [], isLoading } = useQuery<SmpEntry[]>({
    queryKey,
    queryFn: () => apiGet<{ data: SmpEntry[] }>(`SmpDeposit/loadEntries/${scId}/${syId}/${budgetYear}`).then((r) => r.data ?? []),
    enabled: scId > 0,
  })

  const { data: budgetTypesData } = useQuery<{ data: BudgetTypeItem[] }>({
    queryKey: ['budget-types', scId],
    queryFn: () => apiGet<{ data: BudgetTypeItem[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })
  const budgetTypes = budgetTypesData?.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry_type: 1, amount: 0 },
  })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form
  const docDateVal = watch('doc_date')

  const invalidate = () => qc.invalidateQueries({ queryKey })

  const addMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('SmpDeposit/addEntry', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); invalidate() } else toast.error(r.ms) },
  })
  const updateMut = useMutation({
    mutationFn: (dto: Record<string, unknown> & { sde_id: number }) => apiPost<{ flag: boolean; ms: string }>(`SmpDeposit/updateEntry/${dto.sde_id}`, dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); setEditItem(null); invalidate() } else toast.error(r.ms) },
  })
  const deleteMut = useMutation({
    mutationFn: (sdeId: number) => apiPost<{ flag: boolean; ms: string }>('SmpDeposit/removeEntry', { sde_id: sdeId, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); invalidate() } else toast.error(r.ms) },
  })

  function openAdd(type: 1 | 2) {
    setCurrentType(type); setEditItem(null); reset({ entry_type: type, amount: 0 }); setOpen(true)
  }
  function openEdit(item: SmpEntry) {
    setEditItem(item); setCurrentType(item.entry_type as 1 | 2)
    reset({ entry_type: item.entry_type as 1 | 2, doc_no: item.doc_no ?? '', doc_date: item.doc_date ?? '', detail: item.detail ?? '', amount: item.amount, money_type_id: item.money_type_id ?? undefined, money_type_name: item.money_type_name ?? '', note: item.note ?? '' })
    setOpen(true)
  }
  function onSubmit(vals: FormValues) {
    const base = { sc_id: scId, sy_id: syId, budget_year: String(budgetYear), up_by: adminId, ...(vals as Record<string, unknown>) }
    if (editItem) updateMut.mutate({ sde_id: editItem.sde_id, ...(vals as Record<string, unknown>), up_by: adminId })
    else addMut.mutate(base)
  }

  const deposits = entries.filter((e) => e.entry_type === 1)
  const withdrawals = entries.filter((e) => e.entry_type === 2)
  const totalDeposit = deposits.reduce((s, r) => s + r.amount, 0)
  const totalWithdrawal = withdrawals.reduce((s, r) => s + r.amount, 0)
  const balance = totalDeposit - totalWithdrawal

  const shown = activeTab === 1 ? deposits : withdrawals
  const paged = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const cols = [
    { header: 'วันที่', render: (r: SmpEntry) => fmtDateTH(r.doc_date) },
    { header: 'เลขที่เอกสาร', render: (r: SmpEntry) => r.doc_no ?? '-' },
    { header: 'รายการ', render: (r: SmpEntry) => r.detail },
    { header: 'ประเภทเงิน', render: (r: SmpEntry) => r.money_type_name ?? '-' },
    { header: 'จำนวนเงิน', render: (r: SmpEntry) => <span className="font-medium">{r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>, headerClassName: 'text-right', className: 'text-right' },
    {
      header: '',
      render: (r: SmpEntry) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>แก้ไข</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => { if (confirm('ยืนยันลบ?')) deleteMut.mutate(r.sde_id) }}>ลบ</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="สมุดคู่ฝากส่วนราชการผู้เบิก (เงินรับฝาก สพป.)" subtitle={`ปีงบประมาณ ${budgetYear}`}
        actions={
          <ExportButton onExport={() => exportToXlsx(entries.map((r) => ({ 'ประเภท': r.entry_type === 1 ? 'ฝาก' : 'ถอน', 'วันที่': fmtDateTH(r.doc_date), 'เลขที่': r.doc_no, 'รายการ': r.detail, 'ประเภทเงิน': r.money_type_name, 'จำนวนเงิน': r.amount })), 'สมุดคู่ฝาก', `smp-deposit-${budgetYear}`)} />
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-green-50 p-4 text-center">
          <p className="text-xs text-gray-500">ยอดฝากรวม</p>
          <p className="text-xl font-bold text-green-700">{totalDeposit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-4 text-center">
          <p className="text-xs text-gray-500">ยอดถอนรวม</p>
          <p className="text-xl font-bold text-red-700">{totalWithdrawal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-blue-50 p-4 text-center">
          <p className="text-xs text-gray-500">คงเหลือ</p>
          <p className="text-xl font-bold text-blue-700">{balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={activeTab === 1 ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab(1); setPage(0) }}>
            <ArrowDownCircle className="h-4 w-4 mr-1" />รายการฝาก ({deposits.length})
          </Button>
          <Button variant={activeTab === 2 ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab(2); setPage(0) }}>
            <ArrowUpCircle className="h-4 w-4 mr-1" />รายการถอน ({withdrawals.length})
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openAdd(1)}><Plus className="h-4 w-4 mr-1" />เพิ่มรายการฝาก</Button>
          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => openAdd(2)}><Plus className="h-4 w-4 mr-1" />เพิ่มรายการถอน</Button>
        </div>
      </div>

      <DataTable columns={cols} data={paged} total={shown.length} page={page} pageSize={PAGE_SIZE} onPageChange={(p) => { setPage(p) }} loading={isLoading} emptyText="ไม่พบรายการ" />

      {/* Add/Edit Dialog */}
      <FormDialog open={open} onClose={() => { setOpen(false); setEditItem(null) }} title={editItem ? 'แก้ไขรายการ' : (currentType === 1 ? 'เพิ่มรายการฝาก' : 'เพิ่มรายการถอน')} size="md" loading={addMut.isPending || updateMut.isPending} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>วันที่ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={docDateVal ?? ''} onChange={(v) => setValue('doc_date', v, { shouldValidate: true })} />
              {errors.doc_date && <p className="text-xs text-red-500">{errors.doc_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>เลขที่เอกสาร</Label>
              <Input {...register('doc_no')} placeholder="เลขที่ใบนำฝาก/ถอน" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>รายการ <span className="text-red-500">*</span></Label>
            <Input {...register('detail')} placeholder="รายละเอียดรายการ" />
            {errors.detail && <p className="text-xs text-red-500">{errors.detail.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทเงิน</Label>
              <Select value={String(watch('money_type_id') ?? '')} onValueChange={(v) => {
                const bt = budgetTypes.find((m) => String(m.bg_type_id) === v)
                setValue('money_type_id', Number(v))
                setValue('money_type_name', bt?.budget_type ?? '')
              }}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทเงิน" /></SelectTrigger>
                <SelectContent>{budgetTypes.map((m) => <SelectItem key={m.bg_type_id} value={String(m.bg_type_id)}>{m.budget_type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Input {...register('note')} placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
