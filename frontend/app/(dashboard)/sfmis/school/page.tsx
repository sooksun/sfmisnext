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
import type { School, PaginatedResponse } from '@/lib/types'

const schoolSchema = z.object({
  sc_name: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน'),
  sc_address: z.string().min(1, 'กรุณากรอกที่อยู่'),
  sc_phone: z.string().min(1, 'กรุณากรอกเบอร์โทรศัพท์'),
})
type SchoolForm = z.infer<typeof schoolSchema>

export default function SchoolPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
  const [editing, setEditing] = useState<School | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['school', page, pageSize],
    queryFn: () => apiGet<PaginatedResponse<School>>(`B_school/load_school/${page}/${pageSize}`),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: SchoolForm) => {
      if (editing) {
        return apiPost('B_school/update_school', { ...form, sc_id: editing.sc_id })
      }
      return apiPost('B_school/add_school', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['school'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: School) => apiPost('B_school/remove_school', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['school'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ sc_name: '', sc_address: '', sc_phone: '' })
    setDialogOpen(true)
  }

  function openEdit(item: School) {
    setEditing(item)
    reset({ sc_name: item.sc_name, sc_address: item.sc_address, sc_phone: item.sc_phone })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: School) => (
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
    { header: 'ID', key: 'sc_id' as keyof School },
    { header: 'ชื่อโรงเรียน', key: 'sc_name' as keyof School },
    { header: 'ที่อยู่', key: 'sc_address' as keyof School },
    { header: 'โทรศัพท์', key: 'sc_phone' as keyof School },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="โรงเรียน (School)"
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
        title={editing ? 'แก้ไขโรงเรียน' : 'เพิ่มโรงเรียน'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อโรงเรียน *</Label>
            <Input {...register('sc_name')} placeholder="ชื่อโรงเรียน" />
            {errors.sc_name && <p className="text-red-500 text-xs mt-1">{errors.sc_name.message}</p>}
          </div>
          <div>
            <Label>ที่อยู่ *</Label>
            <Input {...register('sc_address')} placeholder="ที่อยู่โรงเรียน" />
            {errors.sc_address && <p className="text-red-500 text-xs mt-1">{errors.sc_address.message}</p>}
          </div>
          <div>
            <Label>โทรศัพท์ *</Label>
            <Input {...register('sc_phone')} placeholder="เบอร์โทรศัพท์" />
            {errors.sc_phone && <p className="text-red-500 text-xs mt-1">{errors.sc_phone.message}</p>}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบ "${deleteTarget?.sc_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
