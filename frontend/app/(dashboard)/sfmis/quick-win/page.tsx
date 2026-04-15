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

interface QuickWin {
  qw_id: number
  qw_name: string
  qw_detail: string
  del: number
}

const qwSchema = z.object({
  qw_name: z.string().min(1, 'กรุณากรอกชื่อ Quick Win'),
  qw_detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
})
type QwForm = z.infer<typeof qwSchema>

export default function QuickWinPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QuickWin | null>(null)
  const [editing, setEditing] = useState<QuickWin | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quick_win', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<QuickWin>>(`B_settings/load_quick_win/${page}/${pageSize}`),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QwForm>({
    resolver: zodResolver(qwSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: QwForm) => {
      if (editing) {
        return apiPost('B_settings/update_quick_win', { ...form, qw_id: editing.qw_id })
      }
      return apiPost('B_settings/add_quick_win', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['quick_win'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: QuickWin) =>
      apiPost('B_settings/remove_quick_win', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['quick_win'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ qw_name: '', qw_detail: '' })
    setDialogOpen(true)
  }

  function openEdit(item: QuickWin) {
    setEditing(item)
    reset({ qw_name: item.qw_name, qw_detail: item.qw_detail })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: QuickWin) => (
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
    { header: 'ID', key: 'qw_id' as keyof QuickWin },
    { header: 'ชื่อ Quick Win', key: 'qw_name' as keyof QuickWin },
    { header: 'รายละเอียด', key: 'qw_detail' as keyof QuickWin },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="Quick Win"
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
        title={editing ? 'แก้ไข Quick Win' : 'เพิ่ม Quick Win'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อ Quick Win *</Label>
            <Input {...register('qw_name')} placeholder="ชื่อ Quick Win" />
            {errors.qw_name && (
              <p className="text-red-500 text-xs mt-1">{errors.qw_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('qw_detail')} placeholder="รายละเอียด" />
            {errors.qw_detail && (
              <p className="text-red-500 text-xs mt-1">{errors.qw_detail.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบ "${deleteTarget?.qw_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
