'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
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
import { getThaiDateTime } from '@/lib/utils'

interface ReceiveRow {
  rw_id: number
  budget_type_id: number
  budget_type_name: string
  amount: number
  receive_date: string
  note: string
  up_by: string
  up_date: string
}

interface BudgetType {
  budget_type_id: number
  budget_type_name: string
}

const receiveSchema = z.object({
  budget_type_id: z.number().min(1, 'กรุณาเลือกประเภทงบประมาณ'),
  amount: z.number().min(0.01, 'กรุณากรอกจำนวนเงิน'),
  receive_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  note: z.string().optional(),
})
type ReceiveForm = z.infer<typeof receiveSchema>

export default function ReceivePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setBudgetYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['receive', scId, syId, budgetYear],
    queryFn: () =>
      apiGet<ReceiveRow[]>(`Receive/loadReceive/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0 && syId > 0 && !!budgetYear,
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-income-type'],
    queryFn: () => apiGet<BudgetType[]>('Receive/loadBudgetIncomeType'),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<ReceiveForm>({
      resolver: zodResolver(receiveSchema),
      defaultValues: { budget_type_id: 0, amount: 0 },
    })

  const btId = watch('budget_type_id')

  const saveMutation = useMutation({
    mutationFn: (form: ReceiveForm) =>
      apiPost('Receive/addReceive', { ...form, sc_id: scId, sy_id: syId, budget_year: budgetYear }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receive'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  const columns = [
    { header: 'ประเภทงบประมาณ', key: 'budget_type_name' as keyof ReceiveRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: ReceiveRow) => <span>{fmt(item.amount)}</span>,
    },
    { header: 'วันที่รับ', key: 'receive_date' as keyof ReceiveRow },
    { header: 'หมายเหตุ', key: 'note' as keyof ReceiveRow },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ReceiveRow) => (
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
        title="รับเงิน"
        actions={
          <Button onClick={() => setDialogOpen(true)} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            รับเงิน
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
        title="บันทึกรับเงิน"
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ประเภทงบประมาณ *</Label>
            <Select
              value={btId > 0 ? String(btId) : ''}
              onValueChange={(v) => setValue('budget_type_id', Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทงบประมาณ" />
              </SelectTrigger>
              <SelectContent>
                {(budgetTypes ?? []).map((bt) => (
                  <SelectItem key={bt.budget_type_id} value={String(bt.budget_type_id)}>
                    {bt.budget_type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.budget_type_id && (
              <p className="text-red-500 text-xs mt-1">{errors.budget_type_id.message}</p>
            )}
          </div>
          <div>
            <Label>จำนวนเงิน (บาท) *</Label>
            <Input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="จำนวนเงิน"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <Label>วันที่รับ *</Label>
            <Input type="date" {...register('receive_date')} />
            {errors.receive_date && (
              <p className="text-red-500 text-xs mt-1">{errors.receive_date.message}</p>
            )}
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input {...register('note')} placeholder="หมายเหตุ" />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
