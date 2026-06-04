'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeSignatures, fmtBaht, numberToThaiBaht, esc } from '@/lib/print-utils'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'

interface Row {
  ctId: number
  orderId: number | null
  ctNo: string | null
  ctType: number
  supplierId: number | null
  ctDate: string | null
  ctAmount: number
  ctVat: number
  ctTotal: number
  warrantyAmount: number
  warrantyType: number
  startDate: string | null
  endDate: string | null
  ctStatus: number
  remark: string | null
}

const CT_TYPE: Record<number, string> = { 1: 'ใบสั่งซื้อ', 2: 'สัญญาจ้าง', 3: 'ข้อตกลง' }
const CT_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: 'ร่าง', color: 'text-gray-600' },
  1: { text: 'ลงนาม', color: 'text-blue-600' },
  2: { text: 'ส่งมอบครบ', color: 'text-green-600' },
  3: { text: 'ปิด', color: 'text-gray-500' },
  9: { text: 'ยกเลิก', color: 'text-red-500' },
}
const WAR_TYPE: Record<number, string> = { 0: 'ไม่มี', 1: 'เงินสด', 2: 'หนังสือค้ำประกัน', 3: 'พันธบัตร' }

const schema = z.object({
  order_id: z.number().int().optional(),
  ct_no: z.string().optional(),
  ct_type: z.number().int().min(1).max(3),
  supplier_id: z.number().int().optional(),
  ct_date: z.string().optional(),
  ct_amount: z.number().min(0),
  ct_vat: z.number().min(0),
  ct_total: z.number().min(0),
  warranty_amount: z.number().min(0),
  warranty_type: z.number().int().min(0).max(3),
  warranty_return_dt: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  ct_status: z.number().int().min(0).max(9),
  remark: z.string().optional(),
})
type Form = z.infer<typeof schema>

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function ContractPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contract', scId],
    queryFn: () => apiGet<{ data: Row[] }>(`Supplie_contract/load/${scId}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      ct_type: 1, ct_amount: 0, ct_vat: 0, ct_total: 0,
      warranty_amount: 0, warranty_type: 0, ct_status: 0,
    },
  })
  const ctDate = watch('ct_date') || ''
  const startDate = watch('start_date') || ''
  const endDate = watch('end_date') || ''
  const warrReturnDt = watch('warranty_return_dt') || ''

  const save = useMutation({
    mutationFn: (form: Form) =>
      apiPost('Supplie_contract/save', {
        ...form, sc_id: scId, up_by: adminId,
        ...(editing ? { ct_id: editing.ctId } : {}),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกสำเร็จ')
        qc.invalidateQueries({ queryKey: ['contract'] })
        setDialogOpen(false); reset()
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message || 'error'),
  })

  const remove = useMutation({
    mutationFn: (r: Row) => apiPost('Supplie_contract/remove', { ct_id: r.ctId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['contract'] }) }
      else toast.error(res?.ms)
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  function openAdd() {
    setEditing(null)
    reset({
      ct_type: 1, ct_amount: 0, ct_vat: 0, ct_total: 0,
      warranty_amount: 0, warranty_type: 0, ct_status: 0,
    })
    setDialogOpen(true)
  }

  function printContract(r: Row) {
    const header = makeHeader({
      title: CT_TYPE[r.ctType] ?? 'สัญญา',
      subtitle: '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560)',
      docNo: r.ctNo ?? undefined,
      docDate: r.ctDate ?? undefined,
    })
    const info = `
<p><b>ประเภทเอกสาร:</b> ${esc(CT_TYPE[r.ctType] ?? '-')}</p>
<p><b>อ้างอิงใบขอซื้อ/ขอจ้าง (order_id):</b> ${r.orderId ?? '-'}</p>
<p><b>ผู้ขาย/ผู้รับจ้าง (supplier_id):</b> ${r.supplierId ?? '-'}</p>
<table>
  <tr><th style="width:35%">รายการ</th><th>รายละเอียด</th></tr>
  <tr><td>จำนวนเงิน</td><td class="num">${fmtBaht(r.ctAmount)} บาท</td></tr>
  <tr><td>ภาษีมูลค่าเพิ่ม (VAT)</td><td class="num">${fmtBaht(r.ctVat)} บาท</td></tr>
  <tr><td><b>ยอดรวมทั้งสิ้น</b></td><td class="num"><b>${fmtBaht(r.ctTotal)} บาท</b></td></tr>
  <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(Number(r.ctTotal)))}</td></tr>
  <tr><td>หลักประกันสัญญา</td><td class="num">${fmtBaht(r.warrantyAmount)} บาท (${esc(WAR_TYPE[r.warrantyType] ?? '-')})</td></tr>
  <tr><td>ระยะเวลาสัญญา</td><td>${esc(r.startDate ? r.startDate.slice(0,10) : '-')} ถึง ${esc(r.endDate ? r.endDate.slice(0,10) : '-')}</td></tr>
  <tr><td>สถานะ</td><td>${esc(CT_STATUS[r.ctStatus]?.text ?? '-')}</td></tr>
  <tr><td>หมายเหตุ</td><td>${esc(r.remark ?? '-')}</td></tr>
</table>`
    openPrintWindow({
      title: `${CT_TYPE[r.ctType] ?? 'สัญญา'}_${r.ctNo || r.ctId}`,
      body: header + info + makeSignatures(['ผู้ขาย/ผู้รับจ้าง', 'ผู้ซื้อ/ผู้ว่าจ้าง', 'พยาน']),
    })
  }
  function openEdit(r: Row) {
    setEditing(r)
    reset({
      order_id: r.orderId ?? undefined,
      ct_no: r.ctNo ?? '',
      ct_type: r.ctType,
      supplier_id: r.supplierId ?? undefined,
      ct_date: r.ctDate ? r.ctDate.slice(0, 10) : '',
      ct_amount: Number(r.ctAmount),
      ct_vat: Number(r.ctVat),
      ct_total: Number(r.ctTotal),
      warranty_amount: Number(r.warrantyAmount),
      warranty_type: r.warrantyType,
      start_date: r.startDate ? r.startDate.slice(0, 10) : '',
      end_date: r.endDate ? r.endDate.slice(0, 10) : '',
      ct_status: r.ctStatus,
      remark: r.remark ?? '',
    })
    setDialogOpen(true)
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (r: Row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => printContract(r)} title="พิมพ์"><Printer className="h-3 w-3" /></Button>
          <Button size="sm" variant="warning" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ),
      headerClassName: 'w-28',
    },
    { header: 'เลขที่', render: (r: Row) => r.ctNo || '-' },
    { header: 'ประเภท', render: (r: Row) => CT_TYPE[r.ctType] ?? '-' },
    { header: 'วันที่ทำ', render: (r: Row) => fmtDateTH(r.ctDate) },
    { header: 'ยอดรวม', render: (r: Row) => <span className="font-mono">{fmt(r.ctTotal)}</span> },
    { header: 'หลักประกัน', render: (r: Row) => <span className="font-mono">{fmt(r.warrantyAmount)}</span> },
    {
      header: 'สถานะ',
      render: (r: Row) => {
        const s = CT_STATUS[r.ctStatus] ?? CT_STATUS[0]
        return <span className={s.color}>{s.text}</span>
      },
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <ProcessFlow flow="procure" />
      <PageHeader
        title="สัญญา / ใบสั่งซื้อ (พ.ร.บ. หมวด 7)"
        actions={<Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4" />เพิ่มสัญญา</Button>}
      />
      <div className="p-4">
        <DataTable columns={columns} data={rows} total={rows.length} page={0} pageSize={rows.length || 25} onPageChange={() => {}} loading={isLoading} />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขสัญญา' : 'เพิ่มสัญญา'}
        onSubmit={handleSubmit((d) => save.mutate(d))}
        loading={save.isPending}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่สัญญา</Label>
              <Input {...register('ct_no')} />
            </div>
            <div>
              <Label>ประเภท *</Label>
              <select className="w-full border rounded-md h-9 px-2" {...register('ct_type', { valueAsNumber: true })}>
                <option value={1}>ใบสั่งซื้อ</option>
                <option value={2}>สัญญาจ้าง</option>
                <option value={3}>ข้อตกลง</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>อ้างอิง order_id</Label>
              <Input type="number" {...register('order_id', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>ผู้ขาย (supplier_id)</Label>
              <Input type="number" {...register('supplier_id', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>วันที่สัญญา</Label>
              <ThaiDatePicker value={ctDate} onChange={(v) => setValue('ct_date', v)} />
            </div>
            <div>
              <Label>เริ่ม</Label>
              <ThaiDatePicker value={startDate} onChange={(v) => setValue('start_date', v)} />
            </div>
            <div>
              <Label>สิ้นสุด</Label>
              <ThaiDatePicker value={endDate} onChange={(v) => setValue('end_date', v)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>จำนวนเงิน</Label>
              <Input type="number" step="0.01" {...register('ct_amount', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>VAT</Label>
              <Input type="number" step="0.01" {...register('ct_vat', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>ยอดรวม</Label>
              <Input type="number" step="0.01" {...register('ct_total', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>หลักประกันสัญญา</Label>
              <Input type="number" step="0.01" {...register('warranty_amount', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>ประเภทหลักประกัน</Label>
              <select className="w-full border rounded-md h-9 px-2" {...register('warranty_type', { valueAsNumber: true })}>
                <option value={0}>ไม่มี</option>
                <option value={1}>เงินสด</option>
                <option value={2}>หนังสือค้ำประกัน</option>
                <option value={3}>พันธบัตร</option>
              </select>
            </div>
            <div>
              <Label>วันคืนหลักประกัน</Label>
              <ThaiDatePicker value={warrReturnDt} onChange={(v) => setValue('warranty_return_dt', v)} />
            </div>
          </div>
          <div>
            <Label>สถานะ *</Label>
            <select className="w-full border rounded-md h-9 px-2" {...register('ct_status', { valueAsNumber: true })}>
              <option value={0}>ร่าง</option>
              <option value={1}>ลงนาม</option>
              <option value={2}>ส่งมอบครบ</option>
              <option value={3}>ปิด</option>
              <option value={9}>ยกเลิก</option>
            </select>
          </div>
          <div><Label>หมายเหตุ</Label><Input {...register('remark')} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description={`ต้องการลบสัญญา "${deleteTarget?.ctNo}" หรือไม่?`}
      />
    </div>
  )
}
