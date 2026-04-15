'use client'
import { useState } from 'react'
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
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDate } from '@/lib/utils'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import type { SchoolYear, PaginatedResponse } from '@/lib/types'

const yearSchema = z.object({
  sy_year: z.number().min(2500, 'กรุณากรอกปีการศึกษา'),
  sy_name: z.string().min(1, 'กรุณากรอกชื่อปีการศึกษา'),
  sy_start: z.string().min(1, 'กรุณาเลือกวันเริ่มต้น'),
  sy_end: z.string().min(1, 'กรุณาเลือกวันสิ้นสุด'),
})
type YearForm = z.infer<typeof yearSchema>

export default function YearPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SchoolYear | null>(null)
  const [editing, setEditing] = useState<SchoolYear | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['school_year', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<SchoolYear>>(
        `B_school_year/load_school_year/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<YearForm>({
    resolver: zodResolver(yearSchema),
  })

  const syStart = watch('sy_start')
  const syEnd = watch('sy_end')

  const saveMutation = useMutation({
    mutationFn: (form: YearForm) => {
      if (editing) {
        return apiPost('B_school_year/update_school_year', { ...form, sy_id: editing.sy_id })
      }
      return apiPost('B_school_year/add_school_year', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['school_year'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: SchoolYear) =>
      apiPost('B_school_year/remove_school_year', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['school_year'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ sy_year: 0, sy_name: '', sy_start: '', sy_end: '' })
    setDialogOpen(true)
  }

  function openEdit(item: SchoolYear) {
    setEditing(item)
    reset({
      sy_year: item.sy_year,
      sy_name: item.sy_name,
      sy_start: item.sy_start?.slice(0, 10) ?? '',
      sy_end: item.sy_end?.slice(0, 10) ?? '',
    })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: SchoolYear) => (
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
    { header: 'ปีการศึกษา', key: 'sy_year' as keyof SchoolYear },
    { header: 'ชื่อ', key: 'sy_name' as keyof SchoolYear },
    {
      header: 'วันเริ่มต้น',
      render: (item: SchoolYear) => <span>{getThaiDate(item.sy_start)}</span>,
    },
    {
      header: 'วันสิ้นสุด',
      render: (item: SchoolYear) => <span>{getThaiDate(item.sy_end)}</span>,
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ปีการศึกษา (School Year)"
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            เพิ่ม
          </Button>
        }
      />
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
        title={editing ? 'แก้ไขปีการศึกษา' : 'เพิ่มปีการศึกษา'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ปีการศึกษา *</Label>
            <Input type="number" {...register('sy_year', { valueAsNumber: true })} placeholder="เช่น 2567" />
            {errors.sy_year && <p className="text-red-500 text-xs mt-1">{errors.sy_year.message}</p>}
          </div>
          <div>
            <Label>ชื่อปีการศึกษา *</Label>
            <Input {...register('sy_name')} placeholder="เช่น ปีการศึกษา 2567" />
            {errors.sy_name && <p className="text-red-500 text-xs mt-1">{errors.sy_name.message}</p>}
          </div>
          <div>
            <Label>วันเริ่มต้น *</Label>
            <ThaiDatePicker
              value={syStart}
              onChange={(v) => setValue('sy_start', v, { shouldValidate: true })}
            />
            {errors.sy_start && <p className="text-red-500 text-xs mt-1">{errors.sy_start.message}</p>}
          </div>
          <div>
            <Label>วันสิ้นสุด *</Label>
            <ThaiDatePicker
              value={syEnd}
              onChange={(v) => setValue('sy_end', v, { shouldValidate: true })}
            />
            {errors.sy_end && <p className="text-red-500 text-xs mt-1">{errors.sy_end.message}</p>}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบปีการศึกษา "${deleteTarget?.sy_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
