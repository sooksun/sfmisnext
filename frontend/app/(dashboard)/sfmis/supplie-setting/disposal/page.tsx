'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeSignatures, fmtBaht, esc, thaiFullDate } from '@/lib/print-utils'
import { PageHeader } from '@/components/shared/page-header'
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
  dpId: number
  suppId: number | null
  qty: number
  method: number
  reason: string | null
  soldAmount: number
  approvedBy: number | null
  approveDate: string | null
  dpStatus: number
}

const METHOD: Record<number, string> = {
  1: 'ขาย', 2: 'แลกเปลี่ยน', 3: 'โอน', 4: 'บริจาค', 5: 'ทำลาย', 6: 'ตัดจำหน่าย',
}
const STATUS: Record<number, { text: string; color: string }> = {
  0: { text: 'รอ', color: 'text-gray-600' },
  1: { text: 'อนุมัติ', color: 'text-blue-600' },
  2: { text: 'ดำเนินการแล้ว', color: 'text-green-600' },
  9: { text: 'ยกเลิก', color: 'text-red-500' },
}

const schema = z.object({
  supp_id: z.number().int().min(1),
  qty: z.number().int().min(1),
  method: z.number().int().min(1).max(6),
  reason: z.string().optional(),
  sold_amount: z.number().min(0),
  approved_by: z.number().int().optional(),
  approve_date: z.string().optional(),
  dp_status: z.number().int().min(0).max(9),
})
type Form = z.infer<typeof schema>

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function DisposalPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [executeTarget, setExecuteTarget] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['disposal', scId],
    queryFn: () => apiGet<{ data: Row[] }>(`Supplie_disposal/load/${scId}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { supp_id: 0, qty: 1, method: 1, sold_amount: 0, dp_status: 0 },
  })
  const approveDate = watch('approve_date') || ''

  const save = useMutation({
    mutationFn: (form: Form) =>
      apiPost('Supplie_disposal/save', {
        ...form, sc_id: scId, up_by: adminId,
        ...(editing ? { dp_id: editing.dpId } : {}),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกสำเร็จ')
        qc.invalidateQueries({ queryKey: ['disposal'] })
        setDialogOpen(false); reset()
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const execute = useMutation({
    mutationFn: (r: Row) => apiPost('Supplie_disposal/execute', { dp_id: r.dpId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ดำเนินการแล้ว'); qc.invalidateQueries({ queryKey: ['disposal'] }) }
      else toast.error(res?.ms)
      setExecuteTarget(null)
    },
    onError: (e: any) => { toast.error(e?.message); setExecuteTarget(null) },
  })

  const remove = useMutation({
    mutationFn: (r: Row) => apiPost('Supplie_disposal/remove', { dp_id: r.dpId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['disposal'] }) }
      else toast.error(res?.ms)
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  function openAdd() {
    setEditing(null)
    reset({ supp_id: 0, qty: 1, method: 1, sold_amount: 0, dp_status: 0 })
    setDialogOpen(true)
  }
  function openEdit(r: Row) {
    setEditing(r)
    reset({
      supp_id: r.suppId ?? 0,
      qty: r.qty,
      method: r.method,
      reason: r.reason ?? '',
      sold_amount: Number(r.soldAmount),
      approved_by: r.approvedBy ?? undefined,
      approve_date: r.approveDate ? r.approveDate.slice(0, 10) : '',
      dp_status: r.dpStatus,
    })
    setDialogOpen(true)
  }

  function printDisposal(r: Row) {
    const header = makeHeader({
      title: 'รายงานการจำหน่ายพัสดุ',
      subtitle: '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 57-58)',
      docNo: `DP-${r.dpId}`,
      docDate: r.approveDate ?? undefined,
    })
    const body = `
<p>ตามที่คณะกรรมการจำหน่ายพัสดุได้พิจารณาดำเนินการจำหน่ายพัสดุ
เมื่อวันที่ ${esc(thaiFullDate(r.approveDate))} ดังรายละเอียดต่อไปนี้</p>
<table>
  <tr><th style="width:35%">รายการ</th><th>รายละเอียด</th></tr>
  <tr><td>รหัสพัสดุ (supp_id)</td><td>${r.suppId ?? '-'}</td></tr>
  <tr><td>จำนวน</td><td class="num">${r.qty} หน่วย</td></tr>
  <tr><td>วิธีการจำหน่าย</td><td>${esc(METHOD[r.method] ?? '-')}</td></tr>
  <tr><td>มูลค่าที่ได้จากการขาย</td><td class="num">${fmtBaht(r.soldAmount)} บาท</td></tr>
  <tr><td>เหตุผล</td><td>${esc(r.reason ?? '-')}</td></tr>
  <tr><td>สถานะ</td><td>${esc(STATUS[r.dpStatus]?.text ?? '-')}</td></tr>
  <tr><td>ผู้อนุมัติ (id)</td><td>${r.approvedBy ?? '-'}</td></tr>
</table>
<p>จึงเรียนมาเพื่อโปรดทราบและดำเนินการจำหน่ายพัสดุออกจากบัญชีวัสดุต่อไป</p>`
    openPrintWindow({
      title: `รายงานจำหน่ายพัสดุ_${r.dpId}`,
      body: header + body + makeSignatures(['ผู้เสนอ', 'หัวหน้าเจ้าหน้าที่พัสดุ', 'ผู้อำนวยการสถานศึกษา']),
    })
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (r: Row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => printDisposal(r)} title="พิมพ์"><Printer className="h-3 w-3" /></Button>
          {r.dpStatus !== 2 && (
            <>
              <Button size="sm" variant="warning" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
          {r.dpStatus === 1 && (
            <Button size="sm" onClick={() => setExecuteTarget(r)} title="ดำเนินการ">
              <Check className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
      headerClassName: 'w-28',
    },
    { header: 'supp_id', render: (r: Row) => r.suppId ?? '-' },
    { header: 'จำนวน', render: (r: Row) => r.qty },
    { header: 'วิธี', render: (r: Row) => METHOD[r.method] ?? '-' },
    { header: 'ยอดขาย', render: (r: Row) => <span className="font-mono">{fmt(r.soldAmount)}</span> },
    {
      header: 'สถานะ',
      render: (r: Row) => {
        const s = STATUS[r.dpStatus] ?? STATUS[0]
        return <span className={s.color}>{s.text}</span>
      },
    },
    { header: 'วันอนุมัติ', render: (r: Row) => fmtDateTH(r.approveDate) },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="จำหน่ายพัสดุ (พ.ร.บ. ม.57-58)"
        actions={<Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4" />เพิ่มรายการ</Button>}
      />
      <div className="p-4">
        <DataTable columns={columns} data={rows} total={rows.length} page={0} pageSize={rows.length || 25} onPageChange={() => {}} loading={isLoading} />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขการจำหน่าย' : 'เพิ่มการจำหน่ายพัสดุ'}
        onSubmit={handleSubmit((d) => save.mutate(d))}
        loading={save.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>supp_id *</Label>
            <Input type="number" {...register('supp_id', { valueAsNumber: true })} />
            {errors.supp_id && <p className="text-red-500 text-xs">ระบุ supp_id</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>จำนวน *</Label><Input type="number" {...register('qty', { valueAsNumber: true })} /></div>
            <div>
              <Label>วิธี *</Label>
              <select className="w-full border rounded-md h-9 px-2" {...register('method', { valueAsNumber: true })}>
                <option value={1}>ขาย</option>
                <option value={2}>แลกเปลี่ยน</option>
                <option value={3}>โอน</option>
                <option value={4}>บริจาค</option>
                <option value={5}>ทำลาย</option>
                <option value={6}>ตัดจำหน่าย</option>
              </select>
            </div>
          </div>
          <div>
            <Label>ยอดขาย (กรณีขาย)</Label>
            <Input type="number" step="0.01" {...register('sold_amount', { valueAsNumber: true })} />
          </div>
          <div><Label>เหตุผล</Label><Input {...register('reason')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>ผู้อนุมัติ</Label><Input type="number" {...register('approved_by', { valueAsNumber: true })} /></div>
            <div>
              <Label>วันอนุมัติ</Label>
              <ThaiDatePicker value={approveDate} onChange={(v) => setValue('approve_date', v)} />
            </div>
          </div>
          <div>
            <Label>สถานะ</Label>
            <select className="w-full border rounded-md h-9 px-2" {...register('dp_status', { valueAsNumber: true })}>
              <option value={0}>รอ</option>
              <option value={1}>อนุมัติ</option>
              <option value={9}>ยกเลิก</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              * สถานะ &quot;ดำเนินการแล้ว&quot; ตั้งอัตโนมัติเมื่อกดปุ่มดำเนินการ (จะลดสต็อก)
            </p>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description="ต้องการลบรายการนี้หรือไม่?"
      />
      <ConfirmDialog
        open={!!executeTarget}
        onCancel={() => setExecuteTarget(null)}
        onConfirm={() => executeTarget && execute.mutate(executeTarget)}
        title="ยืนยันการดำเนินการจำหน่าย"
        description={`จะลดสต็อก ${executeTarget?.qty} หน่วย จาก supp_id ${executeTarget?.suppId} — ดำเนินการต่อหรือไม่?`}
      />
    </div>
  )
}
