'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Printer, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { openPrintWindow } from '@/lib/print-utils'
import { officialDepositHoldingRegister } from '@/lib/official-forms'

import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { ExportButton } from '@/components/ui/export-button'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { exportToXlsx } from '@/lib/export-xlsx'
import { useAppContext } from '@/hooks/use-app-context'

interface DepositItem {
  dr_id: number
  seq: number
  item_name: string | null
  deposit_kind: string | null
  receive_date: string | null
  receive_doc_no: string | null
  receive_amount: number
  deposit_date: string | null
  deposit_doc_no: string | null
  deposit_amount: number
  due_date: string | null
  return_date: string | null
  is_open: boolean
  note: string | null
}

const schema = z.object({
  item_name: z.string().min(1, 'กรุณาระบุรายการ'),
  deposit_kind: z.string().optional(),
  receive_date: z.string().optional(),
  receive_doc_no: z.string().optional(),
  receive_amount: z.number().min(0).optional(),
  deposit_date: z.string().optional(),
  deposit_doc_no: z.string().optional(),
  deposit_amount: z.number().min(0).optional(),
  due_date: z.string().optional(),
  return_date: z.string().optional(),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const KIND_PRESETS = ['เงินประกันสัญญา', 'เงินอาหารกลางวัน (ฝาก สพป.)', 'เงินประกันผลงาน']

export default function DepositRegisterPage() {
  const { scId, syId, budgetYear, adminId, scName } = useAppContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<DepositItem | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { data: items = [], isLoading } = useQuery<DepositItem[]>({
    queryKey: ['deposit-register', scId, syId, budgetYear],
    queryFn: () => apiGet<DepositItem[]>(`DepositRegister/load/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0,
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { deposit_kind: 'เงินประกันสัญญา' } })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form
  const w = (f: keyof FormValues) => (watch(f) as string) ?? ''

  const invalidate = () => qc.invalidateQueries({ queryKey: ['deposit-register', scId, syId, budgetYear] })

  const addMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('DepositRegister/add', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); invalidate() } else toast.error(r.ms) },
  })
  const updateMut = useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiPost<{ flag: boolean; ms: string }>('DepositRegister/update', dto),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); setOpen(false); setEditItem(null); invalidate() } else toast.error(r.ms) },
  })
  const deleteMut = useMutation({
    mutationFn: (drId: number) => apiPost<{ flag: boolean; ms: string }>('DepositRegister/delete', { dr_id: drId, up_by: adminId }),
    onSuccess: (r) => { if (r.flag) { toast.success(r.ms); invalidate() } else toast.error(r.ms) },
  })

  function openAdd() {
    setEditItem(null)
    reset({ item_name: '', deposit_kind: 'เงินประกันสัญญา', receive_date: '', receive_doc_no: '', deposit_date: '', deposit_doc_no: '', due_date: '', return_date: '', note: '' })
    setOpen(true)
  }
  function openEdit(it: DepositItem) {
    setEditItem(it)
    reset({
      item_name: it.item_name ?? '', deposit_kind: it.deposit_kind ?? '',
      receive_date: it.receive_date ?? '', receive_doc_no: it.receive_doc_no ?? '', receive_amount: it.receive_amount,
      deposit_date: it.deposit_date ?? '', deposit_doc_no: it.deposit_doc_no ?? '', deposit_amount: it.deposit_amount,
      due_date: it.due_date ?? '', return_date: it.return_date ?? '', note: it.note ?? '',
    })
    setOpen(true)
  }
  function onSubmit(vals: FormValues) {
    const dto = { ...(vals as Record<string, unknown>), up_by: adminId }
    if (editItem) updateMut.mutate({ dr_id: editItem.dr_id, sc_id: scId, sy_id: syId, budget_year: String(budgetYear), ...dto })
    else addMut.mutate({ sc_id: scId, sy_id: syId, budget_year: String(budgetYear), ...dto })
  }

  function handlePrint() {
    if (items.length === 0) return
    const body = officialDepositHoldingRegister({
      scName, budgetYear,
      rows: items.map((r) => ({
        seq: r.seq, itemName: r.item_name, kind: r.deposit_kind,
        receiveDate: r.receive_date, receiveDocNo: r.receive_doc_no, receiveAmount: r.receive_amount,
        depositDate: r.deposit_date, depositDocNo: r.deposit_doc_no, depositAmount: r.deposit_amount,
        dueDate: r.due_date, returnDate: r.return_date, note: r.note,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมเงินฝาก_${budgetYear}`, body, paper: 'A4 landscape' })
  }

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  // ใกล้ครบกำหนด (ภายใน 30 วัน) และยังไม่คืน
  const dueSoon = items.filter((r) => {
    if (r.return_date || !r.due_date) return false
    const days = (new Date(r.due_date).getTime() - Date.now()) / 86400000
    return days <= 30
  })

  const columns = [
    { header: 'ที่', render: (r: DepositItem) => r.seq, headerClassName: 'w-12' },
    { header: 'รายการ', render: (r: DepositItem) => r.item_name || '-' },
    { header: 'ประเภท', render: (r: DepositItem) => r.deposit_kind || '-' },
    { header: 'รับ', render: (r: DepositItem) => <span className="text-xs">{r.receive_date ? fmtDateTH(r.receive_date) : '-'}<br />{r.receive_amount ? r.receive_amount.toLocaleString('th-TH') : ''}</span> },
    { header: 'นำฝาก สพป.', render: (r: DepositItem) => <span className="text-xs">{r.deposit_date ? fmtDateTH(r.deposit_date) : '-'}<br />{r.deposit_amount ? r.deposit_amount.toLocaleString('th-TH') : ''}</span> },
    { header: 'ครบกำหนด', render: (r: DepositItem) => r.due_date ? fmtDateTH(r.due_date) : '-' },
    {
      header: 'คืนผู้มีสิทธิ',
      render: (r: DepositItem) => r.return_date
        ? fmtDateTH(r.return_date)
        : <span className="text-orange-500 text-xs">ยังไม่คืน</span>,
    },
    {
      header: '',
      render: (r: DepositItem) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>แก้ไข</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => { if (confirm('ยืนยันลบ?')) deleteMut.mutate(r.dr_id) }}>ลบ</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="ทะเบียนคุมเงินฝาก"
        subtitle={`เงินประกันสัญญา/เงินฝาก สพป. — ปีงบประมาณ ${budgetYear}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={items.length === 0}>
              <Printer className="h-4 w-4 mr-1" />พิมพ์แบบฟอร์ม
            </Button>
            <ExportButton onExport={() => exportToXlsx(items.map((r) => ({ 'ที่': r.seq, 'รายการ': r.item_name, 'ประเภท': r.deposit_kind, 'วันรับ': fmtDateTH(r.receive_date), 'จำนวนรับ': r.receive_amount, 'วันฝาก': fmtDateTH(r.deposit_date), 'จำนวนฝาก': r.deposit_amount, 'ครบกำหนด': fmtDateTH(r.due_date), 'คืนผู้มีสิทธิ': r.return_date ? fmtDateTH(r.return_date) : 'ยังไม่คืน' })), 'ทะเบียนคุมเงินฝาก', `deposit-register-${budgetYear}`)} />
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />เพิ่มรายการ</Button>
          </div>
        }
      />

      {dueSoon.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>มี <strong>{dueSoon.length} รายการ</strong> ใกล้ครบกำหนด (ภายใน 30 วัน) และยังไม่ได้เบิกถอนคืนผู้มีสิทธิ — โปรดตรวจสอบ</span>
        </div>
      )}

      <DataTable columns={columns} data={paged} total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} loading={isLoading} emptyText="ไม่พบรายการเงินฝาก" />

      <FormDialog open={open} onClose={() => { setOpen(false); setEditItem(null) }} title={editItem ? 'แก้ไขรายการเงินฝาก' : 'เพิ่มรายการเงินฝาก'} size="lg" loading={addMut.isPending || updateMut.isPending} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>รายการ <span className="text-red-500">*</span></Label>
              <Input {...register('item_name')} placeholder="เช่น ปรับปรุงซ่อมแซมส้วม" />
              {errors.item_name && <p className="text-xs text-red-500">{errors.item_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Input list="deposit-kind-presets" {...register('deposit_kind')} placeholder="เงินประกันสัญญา" />
              <datalist id="deposit-kind-presets">{KIND_PRESETS.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-700">การรับเงิน</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">วันที่รับ</Label><ThaiDatePicker value={w('receive_date')} onChange={(v) => setValue('receive_date', v)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">เลขที่เอกสาร</Label><Input {...register('receive_doc_no')} placeholder="บร.x/xx" /></div>
              <div className="space-y-1.5"><Label className="text-xs">จำนวนเงิน</Label><Input type="number" step="0.01" {...register('receive_amount', { valueAsNumber: true })} /></div>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-700">การนำฝากส่วนราชการผู้เบิก (สพป.)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">วันที่ฝาก</Label><ThaiDatePicker value={w('deposit_date')} onChange={(v) => setValue('deposit_date', v)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">เลขที่เอกสาร</Label><Input {...register('deposit_doc_no')} placeholder="บฝ.x/xx" /></div>
              <div className="space-y-1.5"><Label className="text-xs">จำนวนเงิน</Label><Input type="number" step="0.01" {...register('deposit_amount', { valueAsNumber: true })} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>วันครบกำหนด</Label><ThaiDatePicker value={w('due_date')} onChange={(v) => setValue('due_date', v)} /></div>
            <div className="space-y-1.5"><Label>วันที่เบิกจ่ายเงินคืนผู้มีสิทธิ</Label><ThaiDatePicker value={w('return_date')} onChange={(v) => setValue('return_date', v)} /></div>
          </div>
          <div className="space-y-1.5"><Label>หมายเหตุ</Label><Input {...register('note')} placeholder="หมายเหตุ (ถ้ามี)" /></div>
        </div>
      </FormDialog>
    </div>
  )
}
