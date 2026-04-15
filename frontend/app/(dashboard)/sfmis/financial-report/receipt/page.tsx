'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'

interface ReceiptRow {
  r_id: number
  r_no: string
  detail: string
  pr_id: string
  date_generate: string
  status: string
  receive_form: string
  total_budget: number
  up_by: string
  up_date: string
}

interface ReceiveRef {
  pr_id: string
  receive_form: string
  total_budget: number
}

const receiptSchema = z.object({
  r_no: z.string().min(1, 'กรุณากรอกเลขที่ใบเสร็จ'),
  detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
  pr_id: z.string().min(1, 'กรุณาเลือกใบรับเงิน'),
  date_generate: z.string().min(1, 'กรุณาเลือกวันที่'),
  status: z.string(),
})
type ReceiptForm = z.infer<typeof receiptSchema>

export default function ReceiptPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceiptRow | null>(null)
  const [editing, setEditing] = useState<ReceiptRow | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [year, setYear] = useState('')

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['receipt', scId, syId, year],
    queryFn: () => apiGet<ReceiptRow[]>(`Receipt/loadReceipt/${scId}/${syId}/${year}`),
    enabled: scId > 0 && syId > 0 && year !== '',
  })

  const { data: receives } = useQuery({
    queryKey: ['receives-ref', scId, syId, year],
    queryFn: () => apiGet<ReceiveRef[]>(`Receipt/loadReceive/${scId}/${syId}/${year}`),
    enabled: scId > 0 && syId > 0 && year !== '',
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<ReceiptForm>({
      resolver: zodResolver(receiptSchema),
      defaultValues: { r_no: '', detail: '', pr_id: '', date_generate: '', status: '1' },
    })

  const prId = watch('pr_id')
  const statusVal = watch('status')
  const dateGenerate = watch('date_generate')

  const saveMutation = useMutation({
    mutationFn: (form: ReceiptForm) => {
      const payload = { ...form, sc_id: scId, sy_id: syId, year }
      if (editing) return apiPost('Receipt/updateReceipt', { ...payload, r_id: editing.r_id })
      return apiPost('Receipt/addReceipt', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receipt'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ReceiptRow) => apiPost('Receipt/removeReceipt', { r_id: item.r_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receipt'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ r_no: '', detail: '', pr_id: '', date_generate: '', status: '1' })
    setDialogOpen(true)
  }

  function openEdit(item: ReceiptRow) {
    setEditing(item)
    reset({
      r_no: item.r_no,
      detail: item.detail,
      pr_id: String(item.pr_id),
      date_generate: item.date_generate?.substring(0, 10) ?? '',
      status: String(item.status),
    })
    setDialogOpen(true)
  }

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const receiveList = Array.isArray(receives) ? receives : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ReceiptRow) => (
        <div className="flex gap-1">
          <Button size="sm" variant="warning" onClick={() => openEdit(item)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      headerClassName: 'w-20',
    },
    { header: 'เลขที่ใบเสร็จ', key: 'r_no' as keyof ReceiptRow },
    { header: 'รายละเอียด', key: 'detail' as keyof ReceiptRow },
    { header: 'ใบรับเงิน', key: 'receive_form' as keyof ReceiptRow },
    {
      header: 'จำนวนเงิน',
      render: (item: ReceiptRow) => <span>{fmt(item.total_budget)}</span>,
    },
    { header: 'วันที่', render: (item: ReceiptRow) => <span>{fmtDateTH(item.date_generate)}</span> },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ReceiptRow) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ใบเสร็จรับเงิน"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มใบเสร็จ
          </Button>
        }
      />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขใบเสร็จ' : 'เพิ่มใบเสร็จรับเงิน'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>เลขที่ใบเสร็จ *</Label>
            <Input {...register('r_no')} placeholder="เลขที่ใบเสร็จ" />
            {errors.r_no && <p className="text-red-500 text-xs mt-1">{errors.r_no.message}</p>}
          </div>
          <div>
            <Label>ใบรับเงิน *</Label>
            <Select value={prId} onValueChange={(v) => setValue('pr_id', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกใบรับเงิน" /></SelectTrigger>
              <SelectContent>
                {receiveList.map((r) => (
                  <SelectItem key={r.pr_id} value={String(r.pr_id)}>
                    {r.receive_form} ({fmt(r.total_budget)} บาท)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pr_id && <p className="text-red-500 text-xs mt-1">{errors.pr_id.message}</p>}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('detail')} placeholder="รายละเอียด" />
            {errors.detail && <p className="text-red-500 text-xs mt-1">{errors.detail.message}</p>}
          </div>
          <div>
            <Label>วันที่ *</Label>
            <ThaiDatePicker
              value={dateGenerate}
              onChange={(v) => setValue('date_generate', v, { shouldValidate: true })}
            />
            {errors.date_generate && <p className="text-red-500 text-xs mt-1">{errors.date_generate.message}</p>}
          </div>
          <div>
            <Label>สถานะ</Label>
            <Select value={statusVal} onValueChange={(v) => setValue('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ใช้งาน</SelectItem>
                <SelectItem value="0">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบใบเสร็จ "${deleteTarget?.r_no}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
