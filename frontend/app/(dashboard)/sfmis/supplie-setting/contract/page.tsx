'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Printer, Paperclip } from 'lucide-react'
import { openPrintWindow, makeSignatures, fmtBaht, numberToThaiBaht, thaiFullDate, esc } from '@/lib/print-utils'
import { KRUT_EMBLEM } from '@/lib/krut-emblem'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { AttachmentPanel } from '@/components/shared/attachment-panel'
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
  warrantyReturnDt?: string | null
  productWarrantyMonths?: number
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
}

interface OrderOpt {
  order_id: number
  project_type: number
  details: string | null
  budgets: number | null
  p_id: number
  acad_year: number | null
  order_status: number
  p_name: string | null
}
interface PartnerOpt {
  p_id: number
  p_name: string
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
  const { scId, adminId, scName, budgetYear } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [attachTarget, setAttachTarget] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contract', scId],
    queryFn: () => apiGet<{ data: Row[] }>(`Supplie_contract/load/${scId}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  // ใบขอจัดซื้อที่พร้อมทำสัญญา (สำหรับ dropdown)
  const { data: ordersReady } = useQuery({
    queryKey: ['orders-ready', scId],
    queryFn: () => apiGet<{ data: OrderOpt[] }>(`Supplie_contract/orders-ready/${scId}`),
    enabled: scId > 0,
  })
  const orderOpts = ordersReady?.data ?? []

  // รายชื่อร้านค้า/ผู้รับจ้าง (สำหรับ dropdown)
  const { data: partners } = useQuery({
    queryKey: ['partners', scId],
    queryFn: () => apiGet<PartnerOpt[]>(`Project_approve/loadPartner/${scId}`),
    enabled: scId > 0,
  })
  const partnerOpts = partners ?? []

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
  const orderId = watch('order_id')
  const supplierId = watch('supplier_id')

  // เลือกใบขอจัดซื้อ → เติมผู้ขาย/ยอดเงิน/ประเภทให้อัตโนมัติ
  function onSelectOrder(v: number | undefined) {
    setValue('order_id', v)
    const o = orderOpts.find((x) => x.order_id === v)
    if (!o) return
    if (o.p_id) setValue('supplier_id', o.p_id)
    if (o.budgets != null) {
      setValue('ct_amount', Number(o.budgets))
      setValue('ct_total', Number(o.budgets))
    }
    setValue('ct_type', o.project_type === 2 ? 2 : 1)
  }

  const save = useMutation({
    mutationFn: (form: Form) =>
      apiPost('Supplie_contract/save', {
        ...form, sc_id: scId, up_by: adminId, budget_year: budgetYear,
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

  async function openAdd() {
    setEditing(null)
    reset({
      ct_type: 1, ct_amount: 0, ct_vat: 0, ct_total: 0,
      warranty_amount: 0, warranty_type: 0, ct_status: 0,
    })
    setDialogOpen(true)
    // prefill เลขที่สัญญาอัตโนมัติ (แก้ไขเองได้)
    try {
      const res = await apiGet<{ next_no: string }>(`Supplie_contract/next-no/${scId}?year=${budgetYear}`)
      if (res?.next_no) setValue('ct_no', res.next_no)
    } catch {
      /* ปล่อยว่างถ้าดึงไม่ได้ — backend จะสร้างให้ตอนบันทึก */
    }
  }

  // พิมพ์ "หนังสือสัญญา + ใบรับหลักประกัน" (ใบสั่งซื้อทางการอยู่ที่เมนู 2.3)
  function printContract(r: Row) {
    const DOTS = '...........................'
    const isHire = r.ctType === 2
    const buyerWord = isHire ? 'ผู้ว่าจ้าง' : 'ผู้ซื้อ'
    const sellerWord = isHire ? 'ผู้รับจ้าง' : 'ผู้ขาย'
    const docTitle = r.ctType === 2 ? 'หนังสือสัญญาจ้าง' : r.ctType === 3 ? 'บันทึกข้อตกลง' : 'หนังสือสัญญาซื้อขาย'
    const supplierName = partnerOpts.find((p) => p.p_id === r.supplierId)?.p_name || DOTS
    const orderDetail = orderOpts.find((o) => o.order_id === r.orderId)?.details || r.remark || DOTS
    const warType = WAR_TYPE[r.warrantyType] ?? '-'
    const dt = (s?: string | null) => (s ? esc(thaiFullDate(s.slice(0, 10))) : DOTS)
    const ind = 'text-indent:2.5cm'

    const head = (title: string) => `
<div style="text-align:center;margin-bottom:6pt">
  <img src="${KRUT_EMBLEM}" alt="ครุฑ" style="height:18mm;width:auto" />
  <h1 style="font-size:20pt;font-weight:bold;margin:2pt 0 0 0">${esc(title)}</h1>
  <div style="font-size:14pt">เลขที่ ${esc(r.ctNo || '............/............')}</div>
</div>`

    // ── เอกสารที่ 1: หนังสือสัญญา ──
    const contractDoc =
      head(docTitle) +
      `<p style="${ind}">สัญญาฉบับนี้ทำขึ้น ณ ${esc(scName)} เมื่อ${dt(r.ctDate)} ระหว่าง ${esc(scName)}
       ซึ่งต่อไปในสัญญานี้เรียกว่า "${buyerWord}" ฝ่ายหนึ่ง กับ ${esc(supplierName)}
       ซึ่งต่อไปในสัญญานี้เรียกว่า "${sellerWord}" อีกฝ่ายหนึ่ง คู่สัญญาตกลงกันมีข้อความดังต่อไปนี้</p>
       <p style="${ind}"><b>ข้อ ๑.</b> ${buyerWord}ตกลง${isHire ? 'จ้าง' : 'ซื้อ'} และ${sellerWord}ตกลง${isHire ? 'รับจ้าง' : 'ขาย'}
       ${esc(orderDetail)}${r.orderId ? ` (ตามใบขอจัดซื้อ/จ้างเลขที่ ${r.orderId})` : ''}</p>
       <p style="${ind}"><b>ข้อ ๒.</b> ${buyerWord}ตกลงชำระเงินเป็นจำนวนทั้งสิ้น ${fmtBaht(r.ctTotal)} บาท
       (${esc(numberToThaiBaht(Number(r.ctTotal)))})${Number(r.ctVat) > 0 ? ` ซึ่งรวมภาษีมูลค่าเพิ่ม ${fmtBaht(r.ctVat)} บาท แล้ว` : ''}</p>
       <p style="${ind}"><b>ข้อ ๓.</b> กำหนดเวลา${isHire ? 'ส่งมอบงาน' : 'ส่งมอบ'} เริ่มตั้งแต่${dt(r.startDate)} ถึง${dt(r.endDate)}</p>
       ${
         Number(r.warrantyAmount) > 0
           ? `<p style="${ind}"><b>ข้อ ๔.</b> ${sellerWord}ได้นำหลักประกันสัญญาเป็น${esc(warType)} จำนวน ${fmtBaht(r.warrantyAmount)} บาท
       (${esc(numberToThaiBaht(Number(r.warrantyAmount)))}) มอบให้${buyerWord}เพื่อเป็นประกันการปฏิบัติตามสัญญา</p>`
           : ''
       }
       ${
         Number(r.productWarrantyMonths) > 0
           ? `<p style="${ind}"><b>ข้อ ๕.</b> ${sellerWord}รับประกันความชำรุดบกพร่องเป็นเวลา ${r.productWarrantyMonths} เดือน
       นับแต่${dt(r.warrantyStartDate)} ถึง${dt(r.warrantyEndDate)}</p>`
           : ''
       }
       <p style="${ind}">สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความโดยละเอียดตลอดแล้ว
       จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน</p>` +
      makeSignatures([sellerWord, buyerWord, 'พยาน'])

    // ── เอกสารที่ 2: ใบรับหลักประกันสัญญา (เฉพาะเมื่อมีหลักประกัน) ──
    const warrantyDoc =
      Number(r.warrantyAmount) > 0
        ? `<div style="page-break-before:always"></div>` +
          head('ใบรับหลักประกันสัญญา') +
          `<p style="${ind}">${esc(scName)} ได้รับหลักประกันสัญญาจาก ${esc(supplierName)} (${sellerWord})
           ตาม${esc(docTitle)} เลขที่ ${esc(r.ctNo || '-')} ลง${dt(r.ctDate)} ไว้ดังรายละเอียดต่อไปนี้</p>
           <table>
             <tr><th style="width:40%">รายการ</th><th>รายละเอียด</th></tr>
             <tr><td>ประเภทหลักประกัน</td><td>${esc(warType)}</td></tr>
             <tr><td>จำนวนเงิน</td><td class="num">${fmtBaht(r.warrantyAmount)} บาท</td></tr>
             <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(Number(r.warrantyAmount)))}</td></tr>
             <tr><td>กำหนดคืนหลักประกัน</td><td>${dt(r.warrantyReturnDt)}</td></tr>
           </table>
           <p style="${ind};margin-top:8pt">หลักประกันนี้จะคืนให้เมื่อ${sellerWord}พ้นจากข้อผูกพันตามสัญญาเรียบร้อยแล้ว</p>` +
          makeSignatures(['ผู้วางหลักประกัน', 'ผู้รับหลักประกัน'])
        : ''

    openPrintWindow({
      title: `สัญญา_${r.ctNo || r.ctId}`,
      body: contractDoc + warrantyDoc,
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
          <Button size="sm" variant="outline" onClick={() => printContract(r)} title="พิมพ์หนังสือสัญญา + ใบรับหลักประกัน"><Printer className="h-3 w-3" /></Button>
          <Button size="sm" variant="outline" onClick={() => setAttachTarget(r)} title="เอกสารแนบ/ไฟล์สัญญา"><Paperclip className="h-3 w-3" /></Button>
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

        {attachTarget && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                ไฟล์แนบของสัญญา: {attachTarget.ctNo || `#${attachTarget.ctId}`}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setAttachTarget(null)}>ปิด</Button>
            </div>
            <AttachmentPanel
              refType="sup_contract"
              refId={attachTarget.ctId}
              scId={scId}
              category="contract"
              title="ไฟล์สัญญา/เอกสารแนบ"
            />
          </div>
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขสัญญา' : 'เพิ่มสัญญา'}
        onSubmit={handleSubmit((d) => save.mutate(d))}
        loading={save.isPending}
        size="2xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่สัญญา (อัตโนมัติ — แก้ไขได้)</Label>
              <Input {...register('ct_no')} placeholder="เช่น 1/2569" />
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
              <Label>อ้างอิงใบขอจัดซื้อ/จ้าง</Label>
              <select
                className="w-full border rounded-md h-9 px-2"
                value={orderId ?? ''}
                onChange={(e) => onSelectOrder(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">— เลือกใบขอจัดซื้อ —</option>
                {orderOpts.map((o) => (
                  <option key={o.order_id} value={o.order_id}>
                    #{o.order_id} · {(o.details || '-').slice(0, 40)} · {fmt(Number(o.budgets || 0))} บาท
                    {o.p_name ? ` · ${o.p_name}` : ''}
                  </option>
                ))}
              </select>
              {orderOpts.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">ยังไม่มีใบขอที่ตั้งกรรมการแล้ว</p>
              )}
            </div>
            <div>
              <Label>ผู้ขาย/ผู้รับจ้าง</Label>
              <select
                className="w-full border rounded-md h-9 px-2"
                value={supplierId ?? ''}
                onChange={(e) => setValue('supplier_id', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">— เลือกร้านค้า —</option>
                {partnerOpts.map((p) => (
                  <option key={p.p_id} value={p.p_id}>{p.p_name}</option>
                ))}
              </select>
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
