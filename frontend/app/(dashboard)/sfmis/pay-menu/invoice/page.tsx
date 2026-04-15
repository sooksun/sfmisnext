'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Send } from 'lucide-react'
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

interface InvoiceRow {
  rw_id: number
  sc_id: number
  no_doc: string
  bg_type_id: number
  rw_type: number
  p_id: number
  order_id: number
  user_request: number
  project_name: string
  partner_name: string
  budget_type_name: string
  user_request_name: string
  detail: string
  amount: number | string
  status: number
  date_request: string
  up_by: string | number
  up_date: string
  remark: string
  sy_id: number
  year: string
}

interface Partner {
  p_id: number
  p_name: string
}

interface BudgetType {
  bg_type_id: number
  budget_type_name: string
}

interface UserRequest {
  admin_id: number
  name: string
}

// Select ส่งค่าผ่าน setValue(..., Number(v)) เสมอ ไม่จำเป็นต้องใช้ z.coerce
const invoiceSchema = z.object({
  no_doc: z.string().min(1, 'กรุณากรอกเลขที่ใบสำคัญ'),
  bg_type_id: z.number().min(1, 'กรุณาเลือกประเภทงบ'),
  rw_type: z.number().min(1, 'กรุณาเลือกประเภทการจ่าย'),
  p_id: z.number().min(1, 'กรุณาเลือกผู้รับเงิน'),
  detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
  amount: z.number().min(0.01, 'กรุณากรอกจำนวนเงิน'),
  date_request: z.string().min(1, 'กรุณาเลือกวันที่'),
  user_request: z.number().min(1, 'กรุณาเลือกผู้ขอเบิก'),
})
type InvoiceForm = z.infer<typeof invoiceSchema>

// status จริงใน request_withdraw
const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'รออนุมัติ', color: 'text-yellow-600' },
  100: { label: 'รอหัวหน้าตรวจ', color: 'text-blue-600' },
  101: { label: 'หัวหน้าไม่อนุมัติ', color: 'text-red-500' },
  102: { label: 'หัวหน้าอนุมัติ / รอ ผอ.', color: 'text-indigo-600' },
  200: { label: 'ผอ. อนุมัติ', color: 'text-green-600' },
  201: { label: 'ยกเลิกเช็ค', color: 'text-red-500' },
  202: { label: 'ออกเช็คแล้ว', color: 'text-green-700' },
}

const rwTypeLabel: Record<number, string> = {
  1: 'โอนเงิน',
  2: 'เช็ค',
  3: 'จัดซื้อ/จ้าง',
  4: 'หัก ณ ที่จ่าย',
}

export default function InvoicePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null)
  const [submitTarget, setSubmitTarget] = useState<InvoiceRow | null>(null)
  const [editing, setEditing] = useState<InvoiceRow | null>(null)
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
    queryKey: ['invoice', scId, syId],
    queryFn: () => apiGet<InvoiceRow[]>(`Invoice/loadInvoiceOrder/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: partners } = useQuery({
    queryKey: ['partners-invoice', scId],
    queryFn: () => apiGet<Partner[]>(`Invoice/loadPartner/${scId}`),
    enabled: scId > 0,
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-type-invoice', scId, syId, year],
    queryFn: () => apiGet<BudgetType[]>(`Invoice/loadBudgetType/${scId}/${syId}/${year}`),
    enabled: scId > 0 && syId > 0 && year !== '',
  })

  const { data: userRequests } = useQuery({
    queryKey: ['user-request', scId],
    queryFn: () => apiGet<UserRequest[]>(`Invoice/loadUserRequest/${scId}`),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<InvoiceForm>({
      resolver: zodResolver(invoiceSchema),
      defaultValues: { no_doc: '', bg_type_id: 0, rw_type: 0, p_id: 0, detail: '', amount: 0, date_request: '', user_request: 0 },
    })

  const bgTypeId = watch('bg_type_id')
  const pId = watch('p_id')
  const rwType = watch('rw_type')
  const userRequest = watch('user_request')
  const dateRequest = watch('date_request')

  const saveMutation = useMutation({
    mutationFn: (form: InvoiceForm) => {
      const payload = { ...form, sc_id: scId, sy_id: syId, year }
      if (editing) return apiPost('Invoice/updateInvoice', { ...payload, rw_id: editing.rw_id })
      return apiPost('Invoice/addInvoice', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ส่งอนุมัติ = เปลี่ยน status 0 → 100 (ส่งให้หัวหน้าการเงินตรวจ)
  const submitMutation = useMutation({
    mutationFn: (item: InvoiceRow) =>
      apiPost('Invoice/updateInvoice', { rw_id: item.rw_id, status: 100, sc_id: item.sc_id ?? scId, no_doc: item.no_doc, bg_type_id: item.bg_type_id, rw_type: item.rw_type, p_id: item.p_id, detail: item.detail, amount: item.amount, date_request: item.date_request, user_request: item.user_request, sy_id: item.sy_id, year: item.year }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ส่งอนุมัติเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการส่งอนุมัติ')
      }
      setSubmitTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: InvoiceRow) =>
      apiPost('Invoice/updateInvoice', { rw_id: item.rw_id, del: 1, sc_id: item.sc_id ?? scId, no_doc: item.no_doc, bg_type_id: item.bg_type_id, rw_type: item.rw_type, p_id: item.p_id, detail: item.detail, amount: item.amount, date_request: item.date_request, user_request: item.user_request, sy_id: item.sy_id, year: item.year }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ no_doc: '', bg_type_id: 0, rw_type: 0, p_id: 0, detail: '', amount: 0, date_request: new Date().toISOString().substring(0, 10), user_request: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: InvoiceRow) {
    setEditing(item)
    reset({
      no_doc: item.no_doc ?? '',
      bg_type_id: item.bg_type_id,
      rw_type: item.rw_type,
      p_id: item.p_id,
      detail: item.detail ?? '',
      amount: Number(item.amount),
      date_request: item.date_request ? String(item.date_request).substring(0, 10) : '',
      user_request: item.user_request,
    })
    setDialogOpen(true)
  }

  const fmt = (n: number | string) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const partnerList = Array.isArray(partners) ? partners : []
  const budgetTypeList = Array.isArray(budgetTypes) ? budgetTypes : []
  const userRequestList = Array.isArray(userRequests) ? userRequests : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: InvoiceRow) => (
        <div className="flex gap-1">
          {item.status === 0 && (
            <>
              <Button size="sm" variant="warning" onClick={() => openEdit(item)} title="แก้ไข">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSubmitTarget(item)} title="ส่งอนุมัติ">
                <Send className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} title="ลบ">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      headerClassName: 'w-28',
    },
    { header: 'เลขที่', key: 'no_doc' as keyof InvoiceRow },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof InvoiceRow },
    { header: 'ผู้รับเงิน', key: 'partner_name' as keyof InvoiceRow },
    { header: 'รายละเอียด', key: 'detail' as keyof InvoiceRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: InvoiceRow) => <span className="text-right block">{fmt(item.amount)}</span>,
    },
    {
      header: 'ประเภทจ่าย',
      render: (item: InvoiceRow) => <span>{rwTypeLabel[item.rw_type] ?? String(item.rw_type)}</span>,
    },
    {
      header: 'สถานะ',
      render: (item: InvoiceRow) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: 'text-gray-500' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'วันที่ขอเบิก',
      render: (item: InvoiceRow) => <span>{fmtDateTH(item.date_request)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: InvoiceRow) => (
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
        title="ใบสำคัญจ่าย (ขอเบิก)"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            สร้างใบสำคัญจ่าย
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
        title={editing ? 'แก้ไขใบสำคัญจ่าย' : 'สร้างใบสำคัญจ่าย'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>เลขที่ใบสำคัญ *</Label>
            <Input {...register('no_doc')} placeholder="เลขที่ใบสำคัญ" />
            {errors.no_doc && <p className="text-red-500 text-xs mt-1">{errors.no_doc.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทงบ *</Label>
              <Select value={bgTypeId > 0 ? String(bgTypeId) : ''} onValueChange={(v) => setValue('bg_type_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทงบ" /></SelectTrigger>
                <SelectContent>
                  {budgetTypeList.map((bt) => (
                    <SelectItem key={bt.bg_type_id} value={String(bt.bg_type_id)}>
                      {bt.budget_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bg_type_id && <p className="text-red-500 text-xs mt-1">{errors.bg_type_id.message}</p>}
            </div>
            <div>
              <Label>ประเภทการจ่าย *</Label>
              <Select value={rwType > 0 ? String(rwType) : ''} onValueChange={(v) => setValue('rw_type', Number(v))}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทการจ่าย" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">โอนเงิน</SelectItem>
                  <SelectItem value="2">เช็ค</SelectItem>
                  <SelectItem value="3">จัดซื้อ/จ้าง</SelectItem>
                  <SelectItem value="4">หัก ณ ที่จ่าย</SelectItem>
                </SelectContent>
              </Select>
              {errors.rw_type && <p className="text-red-500 text-xs mt-1">{errors.rw_type.message}</p>}
            </div>
          </div>
          <div>
            <Label>ผู้รับเงิน *</Label>
            <Select value={pId > 0 ? String(pId) : ''} onValueChange={(v) => setValue('p_id', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้รับเงิน" /></SelectTrigger>
              <SelectContent>
                {partnerList.map((p) => (
                  <SelectItem key={p.p_id} value={String(p.p_id)}>{p.p_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.p_id && <p className="text-red-500 text-xs mt-1">{errors.p_id.message}</p>}
          </div>
          <div>
            <Label>ผู้ขอเบิก *</Label>
            <Select value={userRequest > 0 ? String(userRequest) : ''} onValueChange={(v) => setValue('user_request', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้ขอเบิก" /></SelectTrigger>
              <SelectContent>
                {userRequestList.map((u) => (
                  <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_request && <p className="text-red-500 text-xs mt-1">{errors.user_request.message}</p>}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('detail')} placeholder="รายละเอียดการเบิก" />
            {errors.detail && <p className="text-red-500 text-xs mt-1">{errors.detail.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} placeholder="จำนวนเงิน" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label>วันที่ขอเบิก *</Label>
              <ThaiDatePicker
                value={dateRequest}
                onChange={(v) => setValue('date_request', v, { shouldValidate: true })}
              />
              {errors.date_request && <p className="text-red-500 text-xs mt-1">{errors.date_request.message}</p>}
            </div>
          </div>
        </div>
      </FormDialog>

      {/* ส่งอนุมัติ — เปลี่ยน status 0 → 100 */}
      <ConfirmDialog
        open={!!submitTarget}
        onConfirm={() => submitTarget && submitMutation.mutate(submitTarget)}
        onCancel={() => setSubmitTarget(null)}
        title="ส่งอนุมัติ"
        description={`ส่งใบสำคัญ "${submitTarget?.no_doc}" ให้หัวหน้าการเงินตรวจสอบหรือไม่?`}
        confirmLabel="ส่งอนุมัติ"
        variant="default"
      />

      {/* ลบ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบใบสำคัญ "${deleteTarget?.no_doc}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
