'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeSignatures, esc, thaiFullDate } from '@/lib/print-utils'
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
  inspId: number
  orderId: number | null
  ctId: number | null
  inspDate: string | null
  inspResult: number
  inspNote: string | null
  committee1: number
  committee2: number
  committee3: number
  reportNo: string | null
  reportDate: string | null
  stockPosted: number
}

const RESULT: Record<number, { text: string; color: string }> = {
  1: { text: 'ผ่าน', color: 'text-green-600' },
  2: { text: 'ไม่ผ่าน', color: 'text-red-500' },
  3: { text: 'ผ่านบางส่วน', color: 'text-yellow-600' },
}

const schema = z.object({
  order_id: z.number().int().min(1, 'ระบุ order_id'),
  ct_id: z.number().int().optional(),
  insp_date: z.string().optional(),
  insp_result: z.number().int().min(1).max(3),
  insp_note: z.string().optional(),
  committee1: z.number().int().optional(),
  committee2: z.number().int().optional(),
  committee3: z.number().int().optional(),
  report_no: z.string().optional(),
  report_date: z.string().optional(),
})
type Form = z.infer<typeof schema>

export default function InspectionPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inspection', scId],
    queryFn: () => apiGet<{ data: Row[] }>(`Supplie_inspection/load/${scId}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { order_id: 0, insp_result: 1 },
  })
  const inspDate = watch('insp_date') || ''
  const reportDate = watch('report_date') || ''

  const save = useMutation({
    mutationFn: (form: Form) =>
      apiPost('Supplie_inspection/save', {
        ...form, sc_id: scId, up_by: adminId,
        ...(editing ? { insp_id: editing.inspId } : {}),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกสำเร็จ')
        qc.invalidateQueries({ queryKey: ['inspection'] })
        setDialogOpen(false); reset()
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const remove = useMutation({
    mutationFn: (r: Row) => apiPost('Supplie_inspection/remove', { insp_id: r.inspId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['inspection'] }) }
      else toast.error(res?.ms)
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  function openAdd() {
    setEditing(null)
    reset({ order_id: 0, insp_result: 1 })
    setDialogOpen(true)
  }

  function printInspection(r: Row) {
    const header = makeHeader({
      title: 'รายงานผลการตรวจรับพัสดุ',
      subtitle: '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 100-104)',
      docNo: r.reportNo ?? undefined,
      docDate: r.reportDate ?? r.inspDate ?? undefined,
    })
    const body = `
<p>ตามที่คณะกรรมการตรวจรับพัสดุได้รับมอบหมายให้ตรวจรับพัสดุตามใบสั่งซื้อ/สัญญา
อ้างอิง order_id: <b>${r.orderId ?? '-'}</b>${r.ctId ? ` / สัญญาเลขที่ ct_id: <b>${r.ctId}</b>` : ''}
เมื่อวันที่ ${esc(thaiFullDate(r.inspDate))}</p>
<p><b>ผลการตรวจรับ:</b> ${esc(RESULT[r.inspResult]?.text ?? '-')}</p>
<p><b>หมายเหตุ:</b> ${esc(r.inspNote ?? '-')}</p>
<p><b>สถานะการลงบัญชีวัสดุ:</b> ${r.stockPosted === 1 ? 'บันทึกลงสต็อกแล้ว' : 'ยังไม่ได้บันทึกลงสต็อก'}</p>
<p>จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป</p>`
    openPrintWindow({
      title: `รายงานตรวจรับพัสดุ_${r.reportNo || r.inspId}`,
      body: header + body + makeSignatures([
        `ประธานกรรมการ${r.committee1 ? ` (id:${r.committee1})` : ''}`,
        `กรรมการ${r.committee2 ? ` (id:${r.committee2})` : ''}`,
        `กรรมการและเลขานุการ${r.committee3 ? ` (id:${r.committee3})` : ''}`,
      ]),
    })
  }
  function openEdit(r: Row) {
    setEditing(r)
    reset({
      order_id: r.orderId ?? 0,
      ct_id: r.ctId ?? undefined,
      insp_date: r.inspDate ? r.inspDate.slice(0, 10) : '',
      insp_result: r.inspResult,
      insp_note: r.inspNote ?? '',
      committee1: r.committee1,
      committee2: r.committee2,
      committee3: r.committee3,
      report_no: r.reportNo ?? '',
      report_date: r.reportDate ? r.reportDate.slice(0, 10) : '',
    })
    setDialogOpen(true)
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (r: Row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => printInspection(r)} title="พิมพ์"><Printer className="h-3 w-3" /></Button>
          {r.stockPosted === 0 && (
            <>
              <Button size="sm" variant="warning" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
        </div>
      ),
      headerClassName: 'w-32',
    },
    { header: 'เลขที่รายงาน', render: (r: Row) => r.reportNo || '-' },
    { header: 'วันตรวจ', render: (r: Row) => fmtDateTH(r.inspDate) },
    { header: 'อ้างอิง order', render: (r: Row) => r.orderId ?? '-' },
    {
      header: 'ผลตรวจ',
      render: (r: Row) => {
        const s = RESULT[r.inspResult] ?? { text: '-', color: '' }
        return <span className={s.color}>{s.text}</span>
      },
    },
    {
      header: 'สต็อก',
      render: (r: Row) =>
        r.stockPosted === 1 ? <span className="text-green-600 text-xs">ลงแล้ว</span> : <span className="text-gray-400 text-xs">-</span>,
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <ProcessFlow flow="procure" />
      <PageHeader
        title="ตรวจรับพัสดุ (พ.ร.บ. ม.100-104)"
        actions={<Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4" />บันทึกการตรวจรับ</Button>}
      />
      <div className="p-4">
        <DataTable columns={columns} data={rows} total={rows.length} page={0} pageSize={rows.length || 25} onPageChange={() => {}} loading={isLoading} />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขการตรวจรับ' : 'บันทึกการตรวจรับ'}
        onSubmit={handleSubmit((d) => save.mutate(d))}
        loading={save.isPending}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>order_id * (จาก parcel_order)</Label>
              <Input type="number" {...register('order_id', { valueAsNumber: true })} />
              {errors.order_id && <p className="text-red-500 text-xs">{errors.order_id.message}</p>}
            </div>
            <div>
              <Label>ct_id (สัญญา)</Label>
              <Input type="number" {...register('ct_id', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันตรวจ</Label>
              <ThaiDatePicker value={inspDate} onChange={(v) => setValue('insp_date', v)} />
            </div>
            <div>
              <Label>ผลการตรวจ *</Label>
              <select className="w-full border rounded-md h-9 px-2" {...register('insp_result', { valueAsNumber: true })}>
                <option value={1}>ผ่าน</option>
                <option value={2}>ไม่ผ่าน</option>
                <option value={3}>ผ่านบางส่วน</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>กรรมการ 1</Label><Input type="number" {...register('committee1', { valueAsNumber: true })} /></div>
            <div><Label>กรรมการ 2</Label><Input type="number" {...register('committee2', { valueAsNumber: true })} /></div>
            <div><Label>กรรมการ 3</Label><Input type="number" {...register('committee3', { valueAsNumber: true })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>เลขที่รายงาน</Label><Input {...register('report_no')} /></div>
            <div>
              <Label>วันที่รายงาน</Label>
              <ThaiDatePicker value={reportDate} onChange={(v) => setValue('report_date', v)} />
            </div>
          </div>
          <div><Label>หมายเหตุ</Label><Input {...register('insp_note')} /></div>
          <p className="text-xs text-yellow-700">
            * หากผลตรวจ = &quot;ผ่าน&quot; ระบบจะบันทึกสต็อก (trans_in) และเปลี่ยน order_status=8 อัตโนมัติ
          </p>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description="ต้องการลบการตรวจรับนี้หรือไม่?"
      />
    </div>
  )
}
