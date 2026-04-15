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
import type { PaginatedResponse } from '@/lib/types'

interface Sao {
  sao_id: number
  sao_name: string
  sao_group: string
  del: number
}

const saoSchema = z.object({
  sao_name: z.string().min(1, 'กรุณากรอกชื่อ สพท.'),
  sao_group: z.string().min(1, 'กรุณากรอกกลุ่ม'),
})
type SaoForm = z.infer<typeof saoSchema>

export default function SaoPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Sao | null>(null)
  const [editing, setEditing] = useState<Sao | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sao', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<Sao>>(`B_settings/load_sao/${page}/${pageSize}`),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SaoForm>({
    resolver: zodResolver(saoSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: SaoForm) => {
      if (editing) {
        return apiPost('B_settings/update_sao', { ...form, sao_id: editing.sao_id })
      }
      return apiPost('B_settings/add_sao', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['sao'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Sao) => apiPost('B_settings/remove_sao', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['sao'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ sao_name: '', sao_group: '' })
    setDialogOpen(true)
  }

  function openEdit(item: Sao) {
    setEditing(item)
    reset({ sao_name: item.sao_name, sao_group: item.sao_group })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Sao) => (
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
    { header: 'ID', key: 'sao_id' as keyof Sao },
    { header: 'ชื่อ สพท.', key: 'sao_name' as keyof Sao },
    { header: 'กลุ่ม', key: 'sao_group' as keyof Sao },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="สำนักงานเขตพื้นที่การศึกษา (สพท.)"
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
        title={editing ? 'แก้ไข สพท.' : 'เพิ่ม สพท.'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อ สพท. *</Label>
            <Input {...register('sao_name')} placeholder="ชื่อสำนักงานเขตพื้นที่การศึกษา" />
            {errors.sao_name && (
              <p className="text-red-500 text-xs mt-1">{errors.sao_name.message}</p>
            )}
          </div>
          <div>
            <Label>กลุ่ม *</Label>
            <Input {...register('sao_group')} placeholder="กลุ่ม" />
            {errors.sao_group && (
              <p className="text-red-500 text-xs mt-1">{errors.sao_group.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบ "${deleteTarget?.sao_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
