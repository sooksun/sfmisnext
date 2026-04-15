'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'

interface StudentRow {
  st_id: number
  class_id: number
  class_name: string
  amount: number
  up_by: string
  up_date: string
}

const studentSchema = z.object({
  amount: z.number().min(0, 'กรุณากรอกจำนวนนักเรียน'),
})
type StudentForm = z.infer<typeof studentSchema>

export default function StudentPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StudentRow | null>(null)
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
    queryKey: ['student', syId, budgetYear, scId, page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<StudentRow>>(
        `Student/loadStudent/${syId}/${budgetYear}/${scId}/${page}/${pageSize}`
      ),
    enabled: scId > 0 && syId > 0 && !!budgetYear,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: StudentForm) =>
      apiPost('Student/updateStudent', { ...form, st_id: editing?.st_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['student'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openEdit(item: StudentRow) {
    setEditing(item)
    reset({ amount: item.amount })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: StudentRow) => (
        <Button size="sm" variant="warning" onClick={() => openEdit(item)}>
          <Pencil className="h-3 w-3" />
        </Button>
      ),
      headerClassName: 'w-16',
    },
    { header: 'ระดับชั้น', key: 'class_name' as keyof StudentRow },
    { header: 'จำนวนนักเรียน (คน)', key: 'amount' as keyof StudentRow },
    { header: 'แก้ไขโดย', key: 'up_by' as keyof StudentRow },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ข้อมูลนักเรียน" />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.count ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`แก้ไขจำนวนนักเรียน: ${editing?.class_name}`}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>จำนวนนักเรียน (คน) *</Label>
            <Input
              type="number"
              {...register('amount', { valueAsNumber: true })}
              placeholder="จำนวนนักเรียน"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
