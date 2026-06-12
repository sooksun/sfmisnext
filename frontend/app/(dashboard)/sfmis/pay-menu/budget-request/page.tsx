'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, CheckCircle, Printer, Settings2, Trash2, Send, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { openPrintWindow } from '@/lib/print-utils'
import { officialDisbursementEvidenceRegister } from '@/lib/official-forms'

import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { FormDialog } from '@/components/shared/form-dialog'
import { AnomalyWarnings } from '@/components/shared/anomaly-warnings'
import { useAnomalyPrecheck } from '@/hooks/use-anomaly-precheck'
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
  expense_type_text: string | null
  amount: number
  status: number
  send_date: string | null
  paid_date: string | null
  remark: string | null
}

interface ExpenseTypeOption {
  bet_id: number
  name: string
}

/** 9 หมวดงบพรีเซ็ตของระบบ (ลบไม่ได้) */
const PRESET_NAMES = Object.values(EXPENSE_TYPES)

/** สถานะเอกสาร: 0=รอส่งเบิก 1=ส่งเบิก 2=โอนเงินแล้ว 3=ยกเลิก */
const STATUS_META: Record<number, { label: string; className: string }> = {
  0: { label: 'รอส่งเบิก', className: 'bg-gray-100 text-gray-600' },
  1: { label: 'ส่งเบิก', className: 'bg-blue-100 text-blue-700' },
  2: { label: 'โอนเงินแล้ว', className: 'bg-green-100 text-green-700' },
  3: { label: 'ยกเลิก', className: 'bg-red-100 text-red-600' },
}

/** ป้ายประเภทรายจ่ายที่จะแสดง/พิมพ์ — ใช้ข้อความอิสระถ้ามี ไม่งั้น fallback หมวดงบเดิม */
function expenseLabel(r: BudgetRequestItem): string {
  return r.expense_type_text || EXPENSE_TYPES[r.expense_type] || ''
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  action_date: z.string().min(1, 'กรุณาระบุวันที่ดำเนินการ'),
  creditor_name: z.string().min(1, 'กรุณาระบุเจ้าหนี้/ผู้ขอเบิก'),
  expense_type_text: z.string().min(1, 'กรุณาระบุประเภทรายจ่าย'),
  amount: z.number({ error: 'กรุณาระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  remark: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/** หาเลขหมวดงบจากข้อความ (ถ้าตรงพรีเซ็ต) — เก็บ expense_type ไว้เข้ากันได้ย้อนหลัง */
function matchExpenseType(text: string): number {
  const hit = Object.entries(EXPENSE_TYPES).find(([, v]) => v === text)
  return hit ? Number(hit[0]) : 3
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetRequestPage() {
  const { scId, syId, budgetYear, adminId, scName } = useAppContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { warnings: anomalyWarnings, check: anomalyCheck, clear: clearAnomaly } = useAnomalyPrecheck('budget-request')
  const [anomalyBypass, setAnomalyBypass] = useState(false)
  const [editItem, setEditItem] = useState<BudgetRequestItem | null>(null)
  // เปลี่ยนสถานะแบบต้องระบุวันที่ (ส่งเบิก=1 / โอนเงินแล้ว=2)
  const [transition, setTransition] = useState<{ item: BudgetRequestItem; target: number } | null>(null)
  const [transDate, setTransDate] = useState('')
  const [page, setPage] = useState(0)
  const [manageOpen, setManageOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const PAGE_SIZE = 20

  const { data: items = [], isLoading } = useQuery<BudgetRequestItem[]>({
    queryKey: ['budget-request', scId, syId, budgetYear],
    queryFn: () => apiGet<BudgetRequestItem[]>(`BudgetRequest/load/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0,
  })

  // ประเภทรายจ่ายที่กำหนดเอง (master) รายโรงเรียน
  const { data: customTypes = [] } = useQuery<ExpenseTypeOption[]>({
    queryKey: ['budget-request-types', scId],
    queryFn: () => apiGet<ExpenseTypeOption[]>(`BudgetRequest/expenseTypes/${scId}`),
    enabled: scId > 0,
  })

  // รวมพรีเซ็ต 9 หมวด + ที่กำหนดเอง (ตัดชื่อซ้ำ คงลำดับพรีเซ็ตก่อน)
  const typeOptions = React.useMemo(() => {
    const seen = new Set(PRESET_NAMES)
    const extra = customTypes.map((t) => t.name).filter((n) => !seen.has(n))
    return [...PRESET_NAMES, ...extra]
  }, [customTypes])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { expense_type_text: 'ค่าใช้สอย', amount: 0 },
  })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form

  const actionDateVal = watch('action_date')
  const expenseTypeVal = watch('expense_type_text')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['budget-request', scId, syId, budgetYear] })

  function handlePrint() {
    if (items.length === 0) return
    const body = officialDisbursementEvidenceRegister({
      scName,
      budgetYear,
      rows: items.map((r) => ({
        date: r.action_date,
        creditor: r.creditor_name,
        expenseType: expenseLabel(r),
        amount: r.amount,
        sendDate: r.send_date,
        note: r.remark,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมหลักฐานขอเบิก_${budgetYear}`, body, paper: 'A4 landscape' })
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
  const statusMut = useMutation({
    mutationFn: (dto: { br_id: number; status: number; date?: string }) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/updateStatus', { ...dto, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setTransition(null); setTransDate(''); invalidate() } else toast.error(r.ms) },
  })

  /** เปลี่ยนสถานะที่ต้องระบุวันที่ (ส่งเบิก/โอนเงิน) → เปิด dialog */
  function openTransition(item: BudgetRequestItem, target: number) {
    setTransition({ item, target })
    setTransDate(target === 1 ? (item.send_date ?? '') : (item.paid_date ?? ''))
  }
  /** เปลี่ยนสถานะที่ไม่ต้องระบุวันที่ (ยกเลิก/คืนสถานะ) */
  function changeStatus(item: BudgetRequestItem, status: number, confirmMsg: string) {
    if (confirm(confirmMsg)) statusMut.mutate({ br_id: item.br_id, status })
  }

  const invalidateTypes = () => qc.invalidateQueries({ queryKey: ['budget-request-types', scId] })
  const addTypeMut = useMutation({
    mutationFn: (name: string) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/expenseType/add', { sc_id: scId, name, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setNewTypeName(''); invalidateTypes() } else toast.error(r.ms) },
  })
  const deleteTypeMut = useMutation({
    mutationFn: (betId: number) => apiPost<{ flag: boolean; ms: string }>('BudgetRequest/expenseType/delete', { bet_id: betId, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); invalidateTypes() } else toast.error(r.ms) },
  })

  function openAdd() {
    setEditItem(null); reset({ expense_type_text: 'ค่าใช้สอย', amount: 0 }); setAnomalyBypass(false); clearAnomaly(); setOpen(true)
  }
  function openEdit(item: BudgetRequestItem) {
    setEditItem(item)
    reset({ action_date: item.action_date ?? '', creditor_name: item.creditor_name ?? '', expense_type_text: expenseLabel(item), amount: item.amount, remark: item.remark ?? '' })
    setOpen(true)
  }
  async function onSubmit(vals: FormValues) {
    // L2 ตรวจค่าผิดปกติก่อนบันทึก — ถ้ามีคำเตือน แสดงก่อน รอผู้ใช้กดยืนยันอีกครั้ง
    if (!anomalyBypass) {
      const ws = await anomalyCheck({
        amount: vals.amount,
        action_date: vals.action_date,
        creditor_name: vals.creditor_name,
      })
      if (ws.length > 0) { setAnomalyBypass(true); return }
    }
    // ผู้ใช้ยืนยันบันทึกทั้งที่มีคำเตือน → ขอความเห็น AI แบบ fire-and-forget (บันทึกเป็นข้อสังเกตย้อนหลัง)
    if (anomalyWarnings.length > 0) {
      apiPost('Ai_assist/advisory', {
        sc_id: scId, budget_year: String(budgetYear), module: 'budget-request',
        payload: { amount: vals.amount, action_date: vals.action_date, creditor_name: vals.creditor_name },
        warnings: anomalyWarnings.map((w) => ({ code: w.code, message: w.message })),
      }).catch(() => {})
    }
    setAnomalyBypass(false); clearAnomaly()
    // เก็บทั้งข้อความอิสระ (expense_type_text) และเลขหมวด (expense_type) เพื่อเข้ากันได้ย้อนหลัง
    const dto = { ...(vals as Record<string, unknown>), expense_type: matchExpenseType(vals.expense_type_text) }
    if (editItem) updateMut.mutate({ br_id: editItem.br_id, ...dto, up_by: adminId })
    else addMut.mutate({ sc_id: scId, sy_id: syId, budget_year: String(budgetYear), up_by: adminId, ...dto })
  }

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalAmount = items.reduce((s, r) => s + r.amount, 0)

  const columns = [
    { header: 'ที่', render: (r: BudgetRequestItem) => r.br_seq, headerClassName: 'w-12' },
    { header: 'วันที่ดำเนินการ', render: (r: BudgetRequestItem) => fmtDateTH(r.action_date) },
    { header: 'เจ้าหนี้/ผู้ขอเบิก', render: (r: BudgetRequestItem) => r.creditor_name },
    { header: 'ประเภทรายจ่าย', render: (r: BudgetRequestItem) => expenseLabel(r) || '-' },
    { header: 'จำนวนเงิน', render: (r: BudgetRequestItem) => <span className="font-medium">{r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>, headerClassName: 'text-right', className: 'text-right' },
    {
      header: 'สถานะ',
      render: (r: BudgetRequestItem) => {
        const meta = STATUS_META[r.status] ?? STATUS_META[0]
        const dateText = r.status === 2 ? r.paid_date : r.send_date
        return (
          <div className="space-y-0.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
            {dateText && r.status !== 3 && <div className="text-[11px] text-gray-400">{fmtDateTH(dateText)}</div>}
          </div>
        )
      },
    },
    {
      header: '',
      render: (r: BudgetRequestItem) => (
        <div className="flex gap-1 justify-end">
          {r.status === 0 && (
            <Button size="sm" variant="ghost" className="text-blue-600 h-7 px-2 text-xs" onClick={() => openTransition(r, 1)}>
              <Send className="h-3 w-3 mr-1" />ส่งเบิก
            </Button>
          )}
          {r.status === 1 && (
            <Button size="sm" variant="ghost" className="text-green-600 h-7 px-2 text-xs" onClick={() => openTransition(r, 2)}>
              <CheckCircle className="h-3 w-3 mr-1" />โอนเงินแล้ว
            </Button>
          )}
          {r.status === 3 && (
            <Button size="sm" variant="ghost" className="text-gray-600 h-7 px-2 text-xs" onClick={() => changeStatus(r, 0, 'คืนสถานะเป็น "รอส่งเบิก"?')}>
              <RotateCcw className="h-3 w-3 mr-1" />คืนสถานะ
            </Button>
          )}
          {(r.status === 1 || r.status === 2) && (
            <Button size="sm" variant="ghost" className="text-amber-600 h-7 px-2 text-xs" onClick={() => changeStatus(r, 3, 'ยกเลิกเอกสารนี้?')}>ยกเลิก</Button>
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
            <ExportButton onExport={() => exportToXlsx(items.map((r) => ({ 'ที่': r.br_seq, 'วันที่': fmtDateTH(r.action_date), 'เจ้าหนี้': r.creditor_name, 'ประเภท': expenseLabel(r), 'จำนวน': r.amount, 'สถานะ': (STATUS_META[r.status] ?? STATUS_META[0]).label, 'วันที่ส่งเบิก': r.send_date ? fmtDateTH(r.send_date) : '-', 'วันที่โอนเงิน': r.paid_date ? fmtDateTH(r.paid_date) : '-' })), 'หลักฐานขอเบิก', `budget-request-${budgetYear}`)} />
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
              <div className="flex items-center justify-between">
                <Label>ประเภทรายจ่าย <span className="text-red-500">*</span></Label>
                <button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <Settings2 className="h-3 w-3" />จัดการประเภท
                </button>
              </div>
              <Select value={expenseTypeVal ?? ''} onValueChange={(v) => setValue('expense_type_text', v, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทรายจ่าย" />
                </SelectTrigger>
                <SelectContent>
                  {(expenseTypeVal && !typeOptions.includes(expenseTypeVal) ? [expenseTypeVal, ...typeOptions] : typeOptions).map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expense_type_text && <p className="text-xs text-red-500">{errors.expense_type_text.message}</p>}
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
              <Label>หมายเหตุ</Label>
              <Input {...register('remark')} placeholder="หมายเหตุ (ถ้ามี)" />
            </div>
          </div>
          {!editItem && <p className="text-xs text-gray-400">รายการใหม่จะมีสถานะ &quot;รอส่งเบิก&quot; — กดปุ่ม &quot;ส่งเบิก&quot; ในตารางเพื่อบันทึกวันที่ส่ง</p>}
          <AnomalyWarnings warnings={anomalyWarnings} onDismiss={clearAnomaly} />
          {anomalyBypass && anomalyWarnings.length > 0 && (
            <p className="text-xs text-amber-600">ตรวจสอบแล้ว — กด “บันทึก” อีกครั้งเพื่อยืนยันบันทึกตามนี้</p>
          )}
        </div>
      </FormDialog>

      {/* Status Transition Dialog (ส่งเบิก / โอนเงินแล้ว) */}
      {transition && (
        <FormDialog
          open={!!transition}
          onClose={() => { setTransition(null); setTransDate('') }}
          title={transition.target === 1 ? 'ส่งเบิก (ส่ง สพป.)' : 'บันทึกการโอนเงิน'}
          size="sm"
          loading={statusMut.isPending}
          submitLabel={transition.target === 1 ? 'ส่งเบิก' : 'ยืนยันโอนเงิน'}
          onSubmit={() => {
            if (!transDate) { toast.error('กรุณาระบุวันที่'); return }
            statusMut.mutate({ br_id: transition.item.br_id, status: transition.target, date: transDate })
          }}
        >
          <div className="space-y-4">
            <p className="text-sm">รายการ: <span className="font-medium">{transition.item.creditor_name}</span></p>
            <div className="space-y-1.5">
              <Label>{transition.target === 1 ? 'วันที่ส่งเบิก (ส่ง สพป.)' : 'วันที่โอนเงิน'} <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={transDate} onChange={(v) => setTransDate(v)} />
            </div>
          </div>
        </FormDialog>
      )}

      {/* Manage Expense Types Dialog */}
      <FormDialog open={manageOpen} onClose={() => { setManageOpen(false); setNewTypeName('') }} title="จัดการประเภทรายจ่าย" size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>เพิ่มประเภทรายจ่ายใหม่</Label>
            <div className="flex gap-2">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const n = newTypeName.trim(); if (n) addTypeMut.mutate(n) } }}
                placeholder="เช่น ค่ารักษาพยาบาล, ค่าการศึกษาบุตร"
              />
              <Button type="button" onClick={() => { const n = newTypeName.trim(); if (n) addTypeMut.mutate(n) }} disabled={!newTypeName.trim() || addTypeMut.isPending}>
                <Plus className="h-4 w-4 mr-1" />เพิ่ม
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>รายการที่เพิ่มเอง</Label>
            {customTypes.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">ยังไม่มีประเภทที่กำหนดเอง (9 หมวดงบมาตรฐานมีให้เลือกอยู่แล้ว)</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {customTypes.map((t) => (
                  <li key={t.bet_id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{t.name}</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => { if (confirm(`ลบประเภท "${t.name}"?`)) deleteTypeMut.mutate(t.bet_id) }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400">หมายเหตุ: 9 หมวดงบมาตรฐานของระบบไม่สามารถลบได้</p>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
