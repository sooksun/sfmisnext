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
import { apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'

interface Partner {
  p_id: number
  sc_id: number
  p_type: string
  p_no: string
  p_name: string
  pay_type: string
  payee: string
  p_address: string
  p_phone: string
  cal_vat: string
  p_fax: string
  p_id_tax: string
  del: number
  up_by: string
  up_date: string
}

const schema = z.object({
  p_type: z.string().min(1, 'กรุณาเลือกประเภท'),
  p_no: z.string().min(1, 'กรุณากรอกรหัส'),
  p_name: z.string().min(1, 'กรุณากรอกชื่อ'),
  pay_type: z.string().min(1, 'กรุณาเลือกประเภทการจ่าย'),
  payee: z.string().min(1, 'กรุณากรอกชื่อผู้รับเงิน'),
  p_address: z.string().min(1, 'กรุณากรอกที่อยู่'),
  p_phone: z.string().min(1, 'กรุณากรอกเบอร์โทร'),
  cal_vat: z.string(),
  p_fax: z.string(),
  p_id_tax: z.string(),
})
type Form = z.infer<typeof schema>

export default function PartnerPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [scId, setScId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['partners', scId, page, pageSize],
    queryFn: () => apiPost<{ data: Partner[]; count: number }>(`General_db/load_partner/${scId}/${page}/${pageSize}`, {}),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      p_type: '1', p_no: '-', p_name: '', pay_type: '1',
      payee: '', p_address: '', p_phone: '', cal_vat: '0', p_fax: '-', p_id_tax: '-',
    },
  })

  const pType = watch('p_type')
  const payType = watch('pay_type')

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      const payload = { ...form, sc_id: scId }
      if (editing) {
        return apiPost('General_db/updatePartner', { ...payload, p_id: editing.p_id })
      }
      return apiPost('General_db/addPartner', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['partners'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Partner) => apiPost('General_db/remove_partner', { partner_id: item.p_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['partners'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({
      p_type: '1', p_no: '-', p_name: '', pay_type: '1',
      payee: '', p_address: '', p_phone: '', cal_vat: '0', p_fax: '-', p_id_tax: '-',
    })
    setDialogOpen(true)
  }

  function openEdit(item: Partner) {
    setEditing(item)
    reset({
      p_type: String(item.p_type),
      p_no: item.p_no,
      p_name: item.p_name,
      pay_type: String(item.pay_type),
      payee: item.payee,
      p_address: item.p_address,
      p_phone: item.p_phone,
      cal_vat: String(item.cal_vat),
      p_fax: item.p_fax,
      p_id_tax: item.p_id_tax,
    })
    setDialogOpen(true)
  }

  const rows = Array.isArray(data?.data) ? data.data : []
  const total = data?.count ?? rows.length

  const pTypeLabel: Record<string, string> = { '1': 'บุคคลธรรมดา', '2': 'นิติบุคคล' }
  const payTypeLabel: Record<string, string> = { '1': 'โอนเงิน', '2': 'เช็ค' }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Partner) => (
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
    { header: 'ชื่อร้านค้า/ผู้รับจ้าง', key: 'p_name' as keyof Partner },
    {
      header: 'ประเภท',
      render: (item: Partner) => <span>{pTypeLabel[String(item.p_type)] ?? item.p_type}</span>,
    },
    { header: 'ชื่อผู้รับเงิน', key: 'payee' as keyof Partner },
    { header: 'เบอร์โทร', key: 'p_phone' as keyof Partner },
    {
      header: 'วิธีจ่าย',
      render: (item: Partner) => <span>{payTypeLabel[String(item.pay_type)] ?? item.pay_type}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: Partner) => (
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
        title="ร้านค้า / ผู้รับจ้าง"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มร้านค้า
          </Button>
        }
      />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้า'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภท *</Label>
              <Select value={pType} onValueChange={(v) => {
                setValue('p_type', v)
                setValue('cal_vat', v === '2' ? '1' : '0')
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">บุคคลธรรมดา</SelectItem>
                  <SelectItem value="2">นิติบุคคล</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>รหัส</Label>
              <Input {...register('p_no')} placeholder="รหัสร้านค้า" />
            </div>
          </div>
          <div>
            <Label>ชื่อร้านค้า / ผู้รับจ้าง *</Label>
            <Input {...register('p_name')} placeholder="ชื่อร้านค้าหรือผู้รับจ้าง" />
            {errors.p_name && <p className="text-red-500 text-xs mt-1">{errors.p_name.message}</p>}
          </div>
          <div>
            <Label>ชื่อผู้รับเงิน *</Label>
            <Input {...register('payee')} placeholder="ชื่อผู้รับเงิน" />
            {errors.payee && <p className="text-red-500 text-xs mt-1">{errors.payee.message}</p>}
          </div>
          <div>
            <Label>ที่อยู่ *</Label>
            <Input {...register('p_address')} placeholder="ที่อยู่" />
            {errors.p_address && <p className="text-red-500 text-xs mt-1">{errors.p_address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เบอร์โทร *</Label>
              <Input {...register('p_phone')} placeholder="เบอร์โทรศัพท์" />
              {errors.p_phone && <p className="text-red-500 text-xs mt-1">{errors.p_phone.message}</p>}
            </div>
            <div>
              <Label>แฟกซ์</Label>
              <Input {...register('p_fax')} placeholder="หมายเลขแฟกซ์" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขประจำตัวผู้เสียภาษี</Label>
              <Input {...register('p_id_tax')} placeholder="เลขประจำตัวผู้เสียภาษี" />
            </div>
            <div>
              <Label>วิธีการจ่าย *</Label>
              <Select value={payType} onValueChange={(v) => setValue('pay_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">โอนเงิน</SelectItem>
                  <SelectItem value="2">เช็ค</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบร้านค้า "${deleteTarget?.p_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
