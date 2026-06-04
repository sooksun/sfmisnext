'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, CheckCircle, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { openPrintWindow } from '@/lib/print-utils'
import { officialDisbursementEvidenceRegister } from '@/lib/official-forms'

import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
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

const EXPENSE_TYPES: Record<number, string> = {
  1: 'ลูกจ้างชั่วคราว', 2: 'ค่าตอบแทน', 3: 'ค่าใช้สอย', 4: 'ค่าวัสดุ',
  5: 'ค่าสาธารณูปโภค', 6: 'ค่าครุภัณฑ์', 7: 'ค่าที่ดินสิ่งก่อสร้าง',
  8: 'เงินฝาก', 9: 'ทุนการศึกษา',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetRequestItem {
  br_id: number
  br_seq: number
  action_date: string | null
  creditor_name: string | null
  expense_type: number
  amount: number
  send_date: string | null
  remark: string | null
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  action_date: z.string().min(1, 'กรุณาระบุวันที่ดำเนินการ'),
  creditor_name: z.string().min(1, 'กรุณาระบุเจ้าหนี้/ผู้ขอเบิก'),
  expense_type: z.number({ error: 'กรุณาเลือกประเภทรายจ่าย' }).min(1),
  amount: z.number({ error: 'กรุณาระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  send_date: z.string().optional(),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetRequestPage() {
  const { scId, syId, budgetYear, adminId, scName } = useAppContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetRequestItem | null>(null)
  const [markSentItem, setMarkSentItem] = useState<BudgetRequestItem | null>(null)
  const [sendDate, setSendDate] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data: items = [], isLoading } = useQuery<BudgetRequestItem[]>({
    queryKey: ['budget-request', scId, syId, budgetYear],
    queryFn: () => apiGet<BudgetRequestItem[]>(`BudgetRequest/load/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { expense_type: 3, amount: 0 },
  })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form

  const actionDateVal = watch('action_date')
  const sendDateVal = watch('send_date')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['budget-request', scId, syId, budgetYear] })

  function handlePrint() {
    if (items.length === 0) return
    const body = officialDisbursementEvidenceRegister({
      scName,
      budgetYear,
      rows: items.map((r) => ({
        date: r.action_date,
        creditor: r.creditor_name,
        expenseType: EXPENSE_TYPES[r.expense_type] ?? '',
        amount: r.amount,
        sendDate: r.send_date,
        note: r.remark,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมหลักฐานขอเบิก_${budgetYear}`, body })
  }

  const addMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/add', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); invalidate() } else toast.error(r.ms) },
  })
  const updateMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/update', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); setEditItem(null); invalidate() } else toast.error(r.ms) },
  })
  const deleteMut = useMutation({
    mutationFn: (brId: number) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/delete', { br_id: brId, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); invalidate() } else toast.error(r.ms) },
  })
  const markSentMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/markSent', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setMarkSentItem(null); setSendDate(''); invalidate() } else toast.error(r.ms) },
  })

  function openAdd() {
    setEditItem(null); reset({ expense_type: 3, amount: 0 }); setOpen(true)
  }
  function openEdit(item: BudgetRequestItem) {
    setEditItem(item)
    reset({ action_date: item.action_date ?? '', creditor_name: item.creditor_name ?? '', expense_type: item.expense_type, amount: item.amount, send_date: item.send_date ?? '', remark: item.remark ?? '' })
    setOpen(true)
  }
  function onSubmit(vals: FormValues) {
    if (editItem) updateMut.mutate({ br_id: editItem.br_id, ...(vals as Record<string, unknown>), up_by: adminId })
    else addMut.mutate({ sc_id: scId, sy_id: syId, budget_year: String(budgetYear), up_by: adminId, ...(vals as Record<string, unknown>) })
  }

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalAmount = items.reduce((s, r) => s + r.amount, 0)

  const columns = [
    { header: 'ที่', render: (r: BudgetRequestItem) => r.br_seq, headerClassName: 'w-12' },
    { header: 'วันที่ดำเนินการ', render: (r: BudgetRequestItem) => fmtDateTH(r.action_date) },
    { header: 'เจ้าหนี้/ผู้ขอเบิก', render: (r: BudgetRequestItem) => r.creditor_name },
    { header: 'ประเภทรายจ่าย', render: (r: BudgetRequestItem) => EXPENSE_TYPES[r.expense_type] ?? '-' },
    { header: 'จำนวนเงิน', render: (r: BudgetRequestItem) => <span className="font-medium">{r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>, headerClassName: 'text-right', className: 'text-right' },
    { header: 'วันที่ส่ง สพป.', render: (r: BudgetRequestItem) => r.send_date ? fmtDateTH(r.send_date) : <span className="text-orange-500 text-xs">ยังไม่ส่ง</span> },
    {
      header: '',
      render: (r: BudgetRequestItem) => (
        <div className="flex gap-1 justify-end">
          {!r.send_date && (
            <Button size="sm" variant="ghost" className="text-green-600 h-7 px-2 text-xs" onClick={() => { setMarkSentItem(r); setSendDate('') }}>
              <CheckCircle className="h-3 w-3 mr-1" />ส่ง สพป.
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>แก้ไข</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => { if (confirm('ยืนยันลบ?')) deleteMut.mutate(r.br_id) }}>ลบ</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ProcessFlow flow="pay" />
      <PageHeader
        title="ทะเบียนคุมหลักฐานขอเบิกเงินงบประมาณ"
        subtitle={`ปีงบประมาณ ${budgetYear}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={items.length === 0}>
              <Printer className="h-4 w-4 mr-1" />พิมพ์แบบฟอร์ม
            </Button>
            <ExportButton onExport={() => exportToXlsx(items.map((r) => ({ 'ที่': r.br_seq, 'วันที่': fmtDateTH(r.action_date), 'เจ้าหนี้': r.creditor_name, 'ประเภท': EXPENSE_TYPES[r.expense_type], 'จำนวน': r.amount, 'ส่ง สพป.': r.send_date ? fmtDateTH(r.send_date) : 'ยังไม่ส่ง' })), 'หลักฐานขอเบิก', `budget-request-${budgetYear}`)} />
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />เพิ่มรายการ</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={paged} total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} loading={isLoading} emptyText="ไม่พบรายการขอเบิก" />

      {items.length > 0 && (
        <div className="text-right text-sm font-medium">รวมทั้งสิ้น: <span className="text-blue-700 text-base">{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท</div>
      )}

      {/* Add/Edit Dialog */}
      <FormDialog open={open} onClose={() => { setOpen(false); setEditItem(null) }} title={editItem ? 'แก้ไขรายการขอเบิก' : 'เพิ่มรายการขอเบิก'} size="md" loading={addMut.isPending || updateMut.isPending} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>วันที่ดำเนินการ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={actionDateVal ?? ''} onChange={(v) => setValue('action_date', v, { shouldValidate: true })} />
              {errors.action_date && <p className="text-xs text-red-500">{errors.action_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทรายจ่าย <span className="text-red-500">*</span></Label>
              <Select value={String(watch('expense_type') ?? '')} onValueChange={(v) => setValue('expense_type', Number(v), { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>{Object.entries(EXPENSE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              {errors.expense_type && <p className="text-xs text-red-500">{errors.expense_type.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>เจ้าหนี้/ผู้ขอเบิก <span className="text-red-500">*</span></Label>
            <Input {...register('creditor_name')} placeholder="ชื่อเจ้าหนี้หรือผู้ขอเบิก" />
            {errors.creditor_name && <p className="text-xs text-red-500">{errors.creditor_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>วันที่ส่ง สพป. (ถ้ามี)</Label>
              <ThaiDatePicker value={sendDateVal ?? ''} onChange={(v) => setValue('send_date', v)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Input {...register('remark')} placeholder="หมายเหตุ (ถ้ามี)" />
          </div>
        </div>
      </FormDialog>

      {/* Mark Sent Dialog */}
      {markSentItem && (
        <FormDialog open={!!markSentItem} onClose={() => { setMarkSentItem(null); setSendDate('') }} title="บันทึกวันที่ส่ง สพป." size="sm" loading={markSentMut.isPending} onSubmit={() => { if (!sendDate) { toast.error('กรุณาระบุวันที่ส่ง'); return } markSentMut.mutate({ br_id: markSentItem.br_id as unknown as number, send_date: sendDate, up_by: adminId }) }}>
          <div className="space-y-4">
            <p className="text-sm">รายการ: <span className="font-medium">{markSentItem.creditor_name}</span></p>
            <div className="space-y-1.5">
              <Label>วันที่ส่ง สพป. <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={sendDate} onChange={(v) => setSendDate(v)} />
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  )
}
