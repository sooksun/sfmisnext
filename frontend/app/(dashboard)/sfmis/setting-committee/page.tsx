'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
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

interface CommitteeOrder {
  order_id: number
  project_id: number
  project_name: string
  order_name: string
  budgets: number
  admin_id: number
  committee1: number
  committee2: number
  committee3: number
  p_id: number
  order_status: number
  day_deadline: number
  date_deadline: string
  remark: string
  up_by: string
  up_date: string
}

interface Director {
  admin_id: number
  name: string
}

interface Partner {
  p_id: number
  p_name: string
}

const schema = z.object({
  committee1: z.string().min(1, 'กรุณาเลือกคณะกรรมการคนที่ 1'),
  committee2: z.string(),
  committee3: z.string(),
  p_id: z.string().min(1, 'กรุณาเลือกร้านค้า'),
  day_deadline: z.number().min(1, 'ต้องมากกว่า 0'),
  date_deadline: z.string().min(1, 'กรุณาระบุวันกำหนด'),
})
type Form = z.infer<typeof schema>

const statusLabel: Record<number, { label: string; color: string }> = {
  1: { label: 'รอดำเนินการ', color: 'text-yellow-600' },
  5: { label: 'ดำเนินการแล้ว', color: 'text-green-600' },
  7: { label: 'อนุมัติแล้ว', color: 'text-blue-600' },
}

export default function SettingCommitteePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CommitteeOrder | null>(null)
  const [scId, setScId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')
  const [syId, setSyId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.budget_date?.budget_year) setBudgetYear(String(years.budget_date.budget_year))
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['audit-committee', scId, budgetYear],
    queryFn: () => apiGet<CommitteeOrder[]>(`Audit_committee/loadAuditCommitteeStatus/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYear !== '',
  })

  const { data: directors } = useQuery({
    queryKey: ['directors', scId],
    queryFn: () => apiGet<Director[]>(`Project_approve/loadDirector/${scId}`),
    enabled: scId > 0,
  })

  const { data: partners } = useQuery({
    queryKey: ['partners-approve', scId],
    queryFn: () => apiGet<Partner[]>(`Project_approve/loadPartner/${scId}`),
    enabled: scId > 0,
  })

  const defaultDeadline = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      committee1: '',
      committee2: '0',
      committee3: '0',
      p_id: '',
      day_deadline: 7,
      date_deadline: defaultDeadline(),
    },
  })

  const committee1 = watch('committee1')
  const committee2 = watch('committee2')
  const committee3 = watch('committee3')
  const pId = watch('p_id')
  const dayDeadline = watch('day_deadline')
  const dateDeadline = watch('date_deadline')

  function handleDayChange(val: number) {
    setValue('day_deadline', val >= 1 ? val : 1)
    const d = new Date()
    d.setDate(d.getDate() + (val >= 1 ? val : 1))
    setValue('date_deadline', d.toISOString().split('T')[0])
  }

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      return apiPost('Audit_committee/updateSetCommittee', {
        order_id: editing!.order_id,
        committee1: parseInt(form.committee1) || 0,
        committee2: parseInt(form.committee2) || 0,
        committee3: parseInt(form.committee3) || 0,
        order_status: 5,
        p_id: parseInt(form.p_id) || 0,
        day_deadline: form.day_deadline,
        date_deadline: form.date_deadline,
        remark: '',
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['audit-committee'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openEdit(item: CommitteeOrder) {
    setEditing(item)
    const deadline = item.date_deadline
      ? item.date_deadline.split('T')[0]
      : defaultDeadline()
    reset({
      committee1: item.committee1 > 0 ? String(item.committee1) : '',
      committee2: item.committee2 > 0 ? String(item.committee2) : '0',
      committee3: item.committee3 > 0 ? String(item.committee3) : '0',
      p_id: item.p_id > 0 ? String(item.p_id) : '',
      day_deadline: item.day_deadline >= 1 ? item.day_deadline : 7,
      date_deadline: deadline,
    })
    setDialogOpen(true)
  }

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: CommitteeOrder) => (
        <Button size="sm" variant="warning" onClick={() => openEdit(item)}>
          <Settings className="h-3 w-3" />
        </Button>
      ),
      headerClassName: 'w-16',
    },
    { header: 'โครงการ', key: 'project_name' as keyof CommitteeOrder },
    { header: 'รายการ', key: 'order_name' as keyof CommitteeOrder },
    {
      header: 'งบประมาณ',
      render: (item: CommitteeOrder) => (
        <span>{Number(item.budgets).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: CommitteeOrder) => {
        const s = statusLabel[item.order_status] ?? { label: String(item.order_status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: CommitteeOrder) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  const directorOptions = Array.isArray(directors) ? directors : []
  const partnerOptions = Array.isArray(partners) ? partners : []
  const isHighBudget = (editing?.budgets ?? 0) > 100000

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="แต่งตั้งคณะกรรมการตรวจรับ" />
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
        title={`แต่งตั้งคณะกรรมการ — ${editing?.order_name ?? ''}`}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          {editing && (
            <div className="bg-gray-50 rounded p-2 text-sm">
              <div><span className="text-gray-500">โครงการ:</span> {editing.project_name}</div>
              <div><span className="text-gray-500">งบประมาณ:</span> {Number(editing.budgets).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                {isHighBudget && <span className="ml-2 text-orange-500 text-xs">(ต้องการคณะกรรมการ 3 คน)</span>}
              </div>
            </div>
          )}

          <div>
            <Label>ร้านค้า / ผู้รับจ้าง *</Label>
            <Select value={pId} onValueChange={(v) => setValue('p_id', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกร้านค้า" /></SelectTrigger>
              <SelectContent>
                {partnerOptions.map((p) => (
                  <SelectItem key={p.p_id} value={String(p.p_id)}>{p.p_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.p_id && <p className="text-red-500 text-xs mt-1">{errors.p_id.message}</p>}
          </div>

          <div>
            <Label>คณะกรรมการคนที่ 1 *</Label>
            <Select value={committee1} onValueChange={(v) => setValue('committee1', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกคณะกรรมการ" /></SelectTrigger>
              <SelectContent>
                {directorOptions.map((d) => (
                  <SelectItem key={d.admin_id} value={String(d.admin_id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.committee1 && <p className="text-red-500 text-xs mt-1">{errors.committee1.message}</p>}
          </div>

          <div>
            <Label>คณะกรรมการคนที่ 2 {isHighBudget && '*'}</Label>
            <Select value={committee2} onValueChange={(v) => setValue('committee2', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกคณะกรรมการ (ถ้ามี)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">— ไม่ระบุ —</SelectItem>
                {directorOptions.map((d) => (
                  <SelectItem key={d.admin_id} value={String(d.admin_id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>คณะกรรมการคนที่ 3 {isHighBudget && '*'}</Label>
            <Select value={committee3} onValueChange={(v) => setValue('committee3', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกคณะกรรมการ (ถ้ามี)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">— ไม่ระบุ —</SelectItem>
                {directorOptions.map((d) => (
                  <SelectItem key={d.admin_id} value={String(d.admin_id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>จำนวนวันกำหนดส่ง *</Label>
              <Input
                type="number"
                min={1}
                {...register('day_deadline', { valueAsNumber: true })}
                onChange={(e) => handleDayChange(Number(e.target.value))}
                placeholder="จำนวนวัน"
              />
              {errors.day_deadline && <p className="text-red-500 text-xs mt-1">{errors.day_deadline.message}</p>}
            </div>
            <div>
              <Label>วันกำหนดส่ง *</Label>
              <ThaiDatePicker
                value={dateDeadline}
                onChange={(v) => setValue('date_deadline', v, { shouldValidate: true })}
              />
              {errors.date_deadline && <p className="text-red-500 text-xs mt-1">{errors.date_deadline.message}</p>}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
