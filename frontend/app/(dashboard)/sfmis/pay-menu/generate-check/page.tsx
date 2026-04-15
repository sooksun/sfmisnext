'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { XCircle, ClipboardEdit } from 'lucide-react'
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

interface CheckRow {
  rw_id: number
  no_doc: string
  check_no_doc: string
  partner_name: string
  budget_type_name: string
  detail: string
  amount: number | string
  offer_check_date: string
  user_offer_check: number
  type_offer_check: number
  status: number
  up_by: string | number
  up_date: string
}

interface CheckUser {
  admin_id: number
  name: string
}

// status จริงที่ check ใช้
const statusLabel: Record<number, { label: string; color: string }> = {
  200: { label: 'รอออกเช็ค', color: 'text-yellow-600' },
  201: { label: 'ยกเลิก', color: 'text-red-500' },
  202: { label: 'ออกเช็คแล้ว', color: 'text-green-600' },
}

// z.coerce ป้องกัน type mismatch จาก Select
const checkSchema = z.object({
  check_no_doc: z.string().min(1, 'กรุณากรอกเลขที่เช็ค'),
  user_offer_check: z.number().min(1, 'กรุณาเลือกผู้ออกเช็ค'),
  offer_check_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  type_offer_check: z.number(),
})
type CheckForm = z.infer<typeof checkSchema>

export default function GenerateCheckPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [issueTarget, setIssueTarget] = useState<CheckRow | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CheckRow | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['check', scId, syId],
    queryFn: () => apiGet<CheckRow[]>(`Check/loadCheck/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: users } = useQuery({
    queryKey: ['check-users', scId],
    queryFn: () => apiGet<CheckUser[]>(`Check/loadUser/${scId}`),
    enabled: scId > 0,
  })

  const { data: autoNo } = useQuery({
    queryKey: ['check-auto-no', scId, syId],
    queryFn: () => apiGet<{ check_no_doc: number }>(`Check/loadAutoNoCheck/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<CheckForm>({
      resolver: zodResolver(checkSchema),
      defaultValues: { check_no_doc: '', user_offer_check: 0, offer_check_date: '', type_offer_check: 1 },
    })

  const userOfferCheck = watch('user_offer_check')
  const typeOfferCheck = watch('type_offer_check')
  const offerCheckDate = watch('offer_check_date')

  function openIssue(item: CheckRow) {
    setIssueTarget(item)
    reset({
      check_no_doc: String(autoNo?.check_no_doc ?? ''),
      user_offer_check: item.user_offer_check || 0,
      offer_check_date: new Date().toISOString().substring(0, 10),
      type_offer_check: item.type_offer_check || 1,
    })
  }

  const issueMutation = useMutation({
    mutationFn: (form: CheckForm) => {
      if (!issueTarget) throw new Error('no target')
      return apiPost('Check/updateCheck', {
        rw_id: issueTarget.rw_id,
        check_no_doc: Number(form.check_no_doc),
        user_offer_check: form.user_offer_check,
        offer_check_date: form.offer_check_date,
        type_offer_check: form.type_offer_check,
        amount: Number(issueTarget.amount),
        status: 202,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ออกเช็คเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['check'] })
        qc.invalidateQueries({ queryKey: ['check-auto-no'] })
        setIssueTarget(null)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการออกเช็ค')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const cancelMutation = useMutation({
    mutationFn: (item: CheckRow) => apiPost('Check/cancelCheck', { rw_id: item.rw_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ยกเลิกเช็คเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['check'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการยกเลิก')
      }
      setCancelTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const fmt = (n: number | string) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []
  const userList = Array.isArray(users) ? users : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: CheckRow) => (
        <div className="flex gap-1">
          {item.status === 200 && (
            <Button size="sm" variant="outline" onClick={() => openIssue(item)} title="ออกเช็ค">
              <ClipboardEdit className="h-3 w-3" />
            </Button>
          )}
          {item.status !== 201 && (
            <Button size="sm" variant="destructive" onClick={() => setCancelTarget(item)} title="ยกเลิกเช็ค">
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
      headerClassName: 'w-24',
    },
    { header: 'เลขที่ใบสำคัญ', key: 'no_doc' as keyof CheckRow },
    { header: 'เลขที่เช็ค', key: 'check_no_doc' as keyof CheckRow },
    { header: 'ผู้รับเงิน', key: 'partner_name' as keyof CheckRow },
    { header: 'รายละเอียด', key: 'detail' as keyof CheckRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: CheckRow) => <span className="text-right block">{fmt(item.amount)}</span>,
    },
    {
      header: 'วันที่เช็ค',
      render: (item: CheckRow) => <span>{fmtDateTH(item.offer_check_date)}</span>,
    },
    {
      header: 'สถานะ',
      render: (item: CheckRow) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: 'text-gray-500' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: CheckRow) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="สร้างเช็ค" />
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

      {/* Dialog ออกเช็ค */}
      <FormDialog
        open={!!issueTarget}
        onClose={() => setIssueTarget(null)}
        title={`ออกเช็ค — ใบสำคัญ ${issueTarget?.no_doc ?? ''}`}
        onSubmit={handleSubmit((d) => issueMutation.mutate(d))}
        loading={issueMutation.isPending}
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">ผู้รับเงิน:</span> {issueTarget?.partner_name}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">จำนวนเงิน:</span> {fmt(issueTarget?.amount ?? 0)} บาท
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่เช็ค *</Label>
              <Input {...register('check_no_doc')} placeholder="เลขที่เช็ค" />
              {errors.check_no_doc && <p className="text-red-500 text-xs mt-1">{errors.check_no_doc.message}</p>}
            </div>
            <div>
              <Label>วันที่เช็ค *</Label>
              <ThaiDatePicker
                value={offerCheckDate}
                onChange={(v) => setValue('offer_check_date', v, { shouldValidate: true })}
              />
              {errors.offer_check_date && <p className="text-red-500 text-xs mt-1">{errors.offer_check_date.message}</p>}
            </div>
          </div>
          <div>
            <Label>ผู้ออกเช็ค *</Label>
            <Select value={userOfferCheck > 0 ? String(userOfferCheck) : ''} onValueChange={(v) => setValue('user_offer_check', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้ออกเช็ค" /></SelectTrigger>
              <SelectContent>
                {userList.map((u) => (
                  <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_offer_check && <p className="text-red-500 text-xs mt-1">{errors.user_offer_check.message}</p>}
          </div>
          <div>
            <Label>ประเภทใบสำคัญ</Label>
            <Select value={String(typeOfferCheck)} onValueChange={(v) => setValue('type_offer_check', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">บค. (ใบสำคัญจ่าย)</SelectItem>
                <SelectItem value="2">บจ. (บิลจ่าย)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* ยืนยันยกเลิกเช็ค */}
      <ConfirmDialog
        open={!!cancelTarget}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        title="ยืนยันการยกเลิกเช็ค"
        description={`ต้องการยกเลิกเช็คใบสำคัญ "${cancelTarget?.no_doc}" หรือไม่?`}
        confirmLabel="ยกเลิกเช็ค"
        variant="destructive"
      />
    </div>
  )
}
