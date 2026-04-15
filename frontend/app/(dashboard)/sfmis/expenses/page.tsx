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
import { getThaiDateTime } from '@/lib/utils'

interface ExpenseRow {
  ex_id: number
  sc_id: number
  ex_year_in: string
  bg_type_id: number
  budget_type_name: string
  ex_type_budget: number
  ex_year_out: string
  ex_remark: string
  ex_money: number
  del: number
  up_by: string
  up_date: string
}

interface BudgetIncomeType {
  bg_type_id: number
  bg_type_name: string
}

interface SchoolYear {
  sy_id: number
  sy_name: string
  budget_year: string
}

const schema = z.object({
  bg_type_id: z.number().min(1, 'กรุณาเลือกประเภทงบ'),
  ex_type_budget: z.number(),
  ex_year_in: z.string().min(1, 'กรุณาเลือกปีที่ได้รับ'),
  ex_year_out: z.string().min(1, 'กรุณาเลือกปีที่จ่าย'),
  ex_remark: z.string().optional(),
  ex_money: z.number().min(1, 'กรุณากรอกจำนวนเงิน'),
})
type Form = z.infer<typeof schema>

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null)
  const [editing, setEditing] = useState<ExpenseRow | null>(null)
  const [scId, setScId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.budget_date?.sy_id) setBudgetYear(String(years.budget_date.sy_id))
      else if (years?.sy_date?.sy_id) setBudgetYear(String(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', scId, budgetYear, page, pageSize],
    queryFn: () => apiPost<{ data: ExpenseRow[]; count: number }>(
      `Policy/loadExpenses/${scId}/${budgetYear}/${page}/${pageSize}`, {}
    ),
    enabled: scId > 0 && budgetYear !== '',
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-income-types-expenses'],
    queryFn: () => apiPost<BudgetIncomeType[]>('Policy/get_budget_income_type', {}),
  })

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years-expenses'],
    queryFn: () => apiPost<SchoolYear[]>('Policy/get_school_year', {}),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { bg_type_id: 0, ex_type_budget: 0, ex_year_in: '', ex_year_out: '', ex_remark: '', ex_money: 0 },
  })

  const bgTypeId = watch('bg_type_id')
  const exYearIn = watch('ex_year_in')
  const exYearOut = watch('ex_year_out')
  const exTypeBudget = watch('ex_type_budget')

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      const payload = { ...form, sc_id: scId }
      if (editing) return apiPost('Policy/updateExpenses', { ...payload, ex_id: editing.ex_id })
      return apiPost('Policy/addExpenses', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['expenses'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ExpenseRow) => apiPost('Policy/removeExpenses', { ex_id: item.ex_id, del: 1 }),
    onSuccess: (res: any) => {
      if (res.flag || res === '1') {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['expenses'] })
      } else {
        toast.error('มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ bg_type_id: 0, ex_type_budget: 0, ex_year_in: '', ex_year_out: '', ex_remark: '', ex_money: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: ExpenseRow) {
    setEditing(item)
    reset({
      bg_type_id: item.bg_type_id,
      ex_type_budget: item.ex_type_budget - 0,
      ex_year_in: item.ex_year_in,
      ex_year_out: item.ex_year_out,
      ex_remark: item.ex_remark,
      ex_money: item.ex_money,
    })
    setDialogOpen(true)
  }

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data?.data) ? data.data : []
  const total = data?.count ?? rows.length
  const typeList = Array.isArray(budgetTypes) ? budgetTypes : []
  const yearList = Array.isArray(schoolYears) ? schoolYears : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ExpenseRow) => (
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
    { header: 'ปีที่ได้รับงบ', key: 'ex_year_in' as keyof ExpenseRow },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof ExpenseRow },
    { header: 'ปีที่จ่าย', key: 'ex_year_out' as keyof ExpenseRow },
    { header: 'หมายเหตุ', key: 'ex_remark' as keyof ExpenseRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: ExpenseRow) => <span className="text-right block">{fmt(item.ex_money)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ExpenseRow) => (
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
        title="รายจ่าย"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มรายจ่าย
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
        title={editing ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'}
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
              <Label>ปีที่ได้รับงบ *</Label>
              <Select value={exYearIn} onValueChange={(v) => setValue('ex_year_in', v)}>
                <SelectTrigger><SelectValue placeholder="เลือกปี" /></SelectTrigger>
                <SelectContent>
                  {yearList.map((y) => (
                    <SelectItem key={`in-${y.sy_id}`} value={y.budget_year}>{y.sy_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ex_year_in && <p className="text-red-500 text-xs mt-1">{errors.ex_year_in.message}</p>}
            </div>
            <div>
              <Label>ปีที่จ่าย *</Label>
              <Select value={exYearOut} onValueChange={(v) => setValue('ex_year_out', v)}>
                <SelectTrigger><SelectValue placeholder="เลือกปี" /></SelectTrigger>
                <SelectContent>
                  {yearList.map((y) => (
                    <SelectItem key={`out-${y.sy_id}`} value={y.budget_year}>{y.sy_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ex_year_out && <p className="text-red-500 text-xs mt-1">{errors.ex_year_out.message}</p>}
            </div>
          </div>
          <div>
            <Label>ประเภทงบที่จ่าย</Label>
            <Select value={String(exTypeBudget)} onValueChange={(v) => setValue('ex_type_budget', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">ปกติ</SelectItem>
                <SelectItem value="1">ย้ายปี</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>จำนวนเงิน (บาท) *</Label>
            <Input type="number" step="0.01" min="1" {...register('ex_money', { valueAsNumber: true })} placeholder="จำนวนเงิน" />
            {errors.ex_money && <p className="text-red-500 text-xs mt-1">{errors.ex_money.message}</p>}
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input {...register('ex_remark')} placeholder="หมายเหตุ" />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบรายจ่าย "${deleteTarget?.budget_type_name}" ปี ${deleteTarget?.ex_year_out} หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
