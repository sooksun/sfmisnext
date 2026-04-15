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
import { getThaiDateTime, toBE } from '@/lib/utils'

// ชนิดที่รับจาก API — ใช้ unknown/any เพราะ backend อาจส่ง number หรือ string (เช่น budget_year, amount)
interface RealBudgetRow {
  prb_id: number
  sc_id: number
  acad_year: string | number
  bg_type_id: number
  budget_type_name: string
  receivetype: number
  recieve_acadyear: string | number
  detail: string
  amount: number | string
  del: number
  up_by: string | number
  up_date: string
}

interface BudgetIncomeType {
  bg_type_id: number
  bg_type_name: string
}

interface SchoolYear {
  sy_id: number
  sy_name: string
  sy_year?: number | string
  budget_year: string | number
}

// Select ส่งค่าผ่าน setValue(..., Number(v)) หรือ setValue(..., stringValue) เสมอ
// ไม่ต้องใช้ z.coerce เพื่อหลีกเลี่ยง input type = unknown ที่ขัดกับ useForm<Form>
const schema = z.object({
  bg_type_id: z.number().min(1, 'กรุณาเลือกประเภทงบ'),
  receivetype: z.number(),
  recieve_acadyear: z.string().min(1, 'กรุณาเลือกปีที่ได้รับ'),
  detail: z.string().optional(),
  amount: z.number().min(0, 'กรุณากรอกจำนวนเงิน'),
})
type Form = z.infer<typeof schema>

export default function RealBudgetPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RealBudgetRow | null>(null)
  const [editing, setEditing] = useState<RealBudgetRow | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [acadYear, setAcadYear] = useState('')

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setAcadYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['real-budget', syId, scId, page, pageSize],
    queryFn: () => apiPost<{ data: RealBudgetRow[]; count: number }>(
      `Policy/loadRealBudget/${syId}/${scId}/${page}/${pageSize}`, {}
    ),
    enabled: scId > 0 && syId > 0,
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-income-types-policy'],
    queryFn: () => apiPost<BudgetIncomeType[]>('Policy/get_budget_income_type', {}),
  })

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years-policy'],
    queryFn: () => apiPost<SchoolYear[]>('Policy/get_school_year', {}),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { bg_type_id: 0, receivetype: 0, recieve_acadyear: '', detail: '', amount: 0 },
  })

  const bgTypeId = watch('bg_type_id')
  const receiveYear = watch('recieve_acadyear')
  const receiveType = watch('receivetype')

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      const payload = {
        ...form,
        detail: form.detail ?? '',
        sc_id: scId,
        acad_year: acadYear,
      }
      if (editing)
        return apiPost('Policy/updateRealBudget', { ...payload, prb_id: editing.prb_id })
      return apiPost('Policy/addRealBudget', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['real-budget'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: RealBudgetRow) => apiPost('Policy/removeRealBudget', { ...item, del: 1 }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['real-budget'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ bg_type_id: 0, receivetype: 0, recieve_acadyear: '', detail: '', amount: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: RealBudgetRow) {
    setEditing(item)
    reset({
      bg_type_id: item.bg_type_id,
      receivetype: item.receivetype,
      recieve_acadyear: String(item.recieve_acadyear),
      detail: item.detail,
      amount: Number(item.amount),
    })
    setDialogOpen(true)
  }

  const fmt = (n: number | string) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data?.data) ? data.data : []
  const total = data?.count ?? rows.length
  const typeList = Array.isArray(budgetTypes) ? budgetTypes : []
  const yearList = Array.isArray(schoolYears) ? schoolYears : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: RealBudgetRow) => (
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
    {
      header: 'ปีงบประมาณ',
      render: (item: RealBudgetRow) => <span>{toBE(item.acad_year)}</span>,
    },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof RealBudgetRow },
    {
      header: 'ปีที่ได้รับ',
      render: (item: RealBudgetRow) => <span>{toBE(item.recieve_acadyear)}</span>,
    },
    { header: 'รายละเอียด', key: 'detail' as keyof RealBudgetRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: RealBudgetRow) => <span className="text-right block">{fmt(item.amount)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: RealBudgetRow) => (
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
        title="งบประมาณที่ได้รับจริง"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
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
        title={editing ? 'แก้ไขรายการ' : 'เพิ่มงบประมาณที่ได้รับ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ประเภทงบ *</Label>
            <Select value={bgTypeId > 0 ? String(bgTypeId) : ''} onValueChange={(v) => setValue('bg_type_id', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกประเภทงบ" /></SelectTrigger>
              <SelectContent>
                {typeList.map((t) => (
                  <SelectItem key={t.bg_type_id} value={String(t.bg_type_id)}>{t.bg_type_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bg_type_id && <p className="text-red-500 text-xs mt-1">{errors.bg_type_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ปีที่ได้รับ *</Label>
              <Select
                value={receiveYear ? String(receiveYear) : ''}
                onValueChange={(v) => setValue('recieve_acadyear', v)}
              >
                <SelectTrigger><SelectValue placeholder="เลือกปี" /></SelectTrigger>
                <SelectContent>
                  {yearList.map((y) => (
                    <SelectItem key={y.sy_id} value={String(y.budget_year)}>
                      ปีการศึกษา {toBE(y.sy_year ?? y.budget_year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.recieve_acadyear && <p className="text-red-500 text-xs mt-1">{errors.recieve_acadyear.message}</p>}
            </div>
            <div>
              <Label>ประเภทการรับ</Label>
              <Select value={String(receiveType)} onValueChange={(v) => setValue('receivetype', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">รายปี</SelectItem>
                  <SelectItem value="1">รายงวด</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Input {...register('detail')} placeholder="รายละเอียด" />
          </div>
          <div>
            <Label>จำนวนเงิน (บาท) *</Label>
            <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} placeholder="จำนวนเงิน" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบรายการงบประมาณ "${deleteTarget?.budget_type_name}" ปี ${toBE(deleteTarget?.acad_year)} หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
