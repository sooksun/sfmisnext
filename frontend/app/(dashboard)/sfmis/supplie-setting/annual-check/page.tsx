'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeTable, makeSignatures } from '@/lib/print-utils'
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
  acId: number
  suppId: number | null
  expectedQty: number
  actualQty: number
  diffQty: number
  status: number
  note: string | null
  checkerId: number | null
  checkDate: string | null
}

const STATUS: Record<number, { text: string; color: string }> = {
  1: { text: 'ปกติ', color: 'text-green-600' },
  2: { text: 'ขาด', color: 'text-red-500' },
  3: { text: 'เกิน', color: 'text-yellow-600' },
  4: { text: 'ชำรุด', color: 'text-orange-600' },
}

const schema = z.object({
  supp_id: z.number().int().min(1),
  expected_qty: z.number().int().min(0),
  actual_qty: z.number().int().min(0),
  status: z.number().int().min(1).max(4),
  note: z.string().optional(),
  checker_id: z.number().int().optional(),
  check_date: z.string().optional(),
})
type Form = z.infer<typeof schema>

export default function AnnualCheckPage() {
  const { scId, adminId, budgetYear } = useAppContext()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['annual-check', scId, budgetYear],
    queryFn: () => apiGet<{ data: Row[] }>(`Supplie_annual_check/load/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYear > 0,
  })
  const rows = data?.data ?? []

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { supp_id: 0, expected_qty: 0, actual_qty: 0, status: 1 },
  })
  const checkDate = watch('check_date') || ''

  const save = useMutation({
    mutationFn: (form: Form) =>
      apiPost('Supplie_annual_check/save', {
        ...form, sc_id: scId, acad_year: budgetYear, up_by: adminId,
        ...(editing ? { ac_id: editing.acId } : {}),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกสำเร็จ')
        qc.invalidateQueries({ queryKey: ['annual-check'] })
        setDialogOpen(false); reset()
      } else toast.error(res?.ms)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  const remove = useMutation({
    mutationFn: (r: Row) => apiPost('Supplie_annual_check/remove', { ac_id: r.acId }),
    onSuccess: (res: any) => {
      if (res?.flag) { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['annual-check'] }) }
      else toast.error(res?.ms)
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error(e?.message),
  })

  function openAdd() {
    setEditing(null)
    reset({ supp_id: 0, expected_qty: 0, actual_qty: 0, status: 1 })
    setDialogOpen(true)
  }
  function openEdit(r: Row) {
    setEditing(r)
    reset({
      supp_id: r.suppId ?? 0,
      expected_qty: r.expectedQty,
      actual_qty: r.actualQty,
      status: r.status,
      note: r.note ?? '',
      checker_id: r.checkerId ?? undefined,
      check_date: r.checkDate ? r.checkDate.slice(0, 10) : '',
    })
    setDialogOpen(true)
  }

  function printReport() {
    const header = makeHeader({
      title: `รายงานผลการตรวจสอบพัสดุประจำปี ${budgetYear || ''}`,
      subtitle: '(ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 113)',
      docDate: new Date().toISOString().slice(0, 10),
    })
    const data = rows.map((r, i) => [
      i + 1,
      r.suppId ?? '-',
      r.expectedQty,
      r.actualQty,
      (r.diffQty > 0 ? '+' : '') + r.diffQty,
      STATUS[r.status]?.text ?? '-',
      r.note ?? '-',
    ])
    const table = makeTable(
      ['ลำดับ', 'supp_id', 'ยอดตามบัญชี', 'นับจริง', 'ต่าง', 'สถานะ', 'หมายเหตุ'],
      data,
      { numCols: [0, 2, 3, 4] },
    )
    openPrintWindow({
      title: `รายงานตรวจสอบพัสดุ_${budgetYear}`,
      body: header + table + makeSignatures(['ประธานกรรมการตรวจสอบพัสดุ', 'กรรมการ', 'กรรมการและเลขานุการ']),
    })
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (r: Row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="warning" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ),
      headerClassName: 'w-20',
    },
    { header: 'supp_id', render: (r: Row) => r.suppId ?? '-' },
    { header: 'ยอดตามบัญชี', render: (r: Row) => r.expectedQty },
    { header: 'นับจริง', render: (r: Row) => r.actualQty },
    {
      header: 'ต่าง',
      render: (r: Row) => (
        <span className={r.diffQty === 0 ? '' : r.diffQty < 0 ? 'text-red-500' : 'text-yellow-600'}>
          {r.diffQty > 0 ? '+' : ''}{r.diffQty}
        </span>
      ),
    },
    {
      header: 'สถานะ',
      render: (r: Row) => {
        const s = STATUS[r.status] ?? STATUS[1]
        return <span className={s.color}>{s.text}</span>
      },
    },
    { header: 'วันที่ตรวจ', render: (r: Row) => fmtDateTH(r.checkDate) },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title={`ตรวจสอบพัสดุประจำปี ${budgetYear || '-'} (พ.ร.บ. ม.113)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={printReport} disabled={rows.length === 0}>
              <Printer className="h-4 w-4" />พิมพ์รายงาน
            </Button>
            <Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4" />บันทึกการตรวจ</Button>
          </div>
        }
      />
      <div className="p-4">
        <DataTable columns={columns} data={rows} total={rows.length} page={0} pageSize={rows.length || 25} onPageChange={() => {}} loading={isLoading} />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไข' : 'บันทึกการตรวจสอบ'}
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
            <div><Label>ยอดตามบัญชี *</Label><Input type="number" {...register('expected_qty', { valueAsNumber: true })} /></div>
            <div><Label>นับจริง *</Label><Input type="number" {...register('actual_qty', { valueAsNumber: true })} /></div>
          </div>
          <div>
            <Label>สถานะ *</Label>
            <select className="w-full border rounded-md h-9 px-2" {...register('status', { valueAsNumber: true })}>
              <option value={1}>ปกติ</option>
              <option value={2}>ขาด</option>
              <option value={3}>เกิน</option>
              <option value={4}>ชำรุด</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>ผู้ตรวจ (checker_id)</Label><Input type="number" {...register('checker_id', { valueAsNumber: true })} /></div>
            <div>
              <Label>วันที่ตรวจ</Label>
              <ThaiDatePicker value={checkDate} onChange={(v) => setValue('check_date', v)} />
            </div>
          </div>
          <div><Label>หมายเหตุ</Label><Input {...register('note')} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description="ต้องการลบรายการนี้หรือไม่?"
      />
    </div>
  )
}
