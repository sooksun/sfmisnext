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

interface ObecPolicy {
  id: number
  obec_policy: string
  detail: string
  up_by: number
  create_date: string
  update_date: string
  del: number
}

const policySchema = z.object({
  obec_policy: z.string().min(1, 'กรุณากรอกชื่อนโยบาย'),
  detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
})
type PolicyForm = z.infer<typeof policySchema>

export default function ObecPolicyPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ObecPolicy | null>(null)
  const [editing, setEditing] = useState<ObecPolicy | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['obec_policy', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<ObecPolicy>>(
        `B_settings/load_obec_policy/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: PolicyForm) => {
      if (editing) {
        return apiPost('B_settings/update_obec_policy', {
          ...form,
          id: editing.id,
        })
      }
      return apiPost('B_settings/add_obec_policy', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['obec_policy'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ObecPolicy) =>
      apiPost('B_settings/remove_obec_policy', { id: item.id }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['obec_policy'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ obec_policy: '', detail: '' })
    setDialogOpen(true)
  }

  function openEdit(item: ObecPolicy) {
    setEditing(item)
    reset({ obec_policy: item.obec_policy, detail: item.detail })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ObecPolicy) => (
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
    { header: 'ID', key: 'id' as keyof ObecPolicy },
    { header: 'ชื่อนโยบาย', key: 'obec_policy' as keyof ObecPolicy },
    { header: 'รายละเอียด', key: 'detail' as keyof ObecPolicy },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="นโยบาย สพฐ. (OBEC Policy)"
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
        title={editing ? 'แก้ไขนโยบาย สพฐ.' : 'เพิ่มนโยบาย สพฐ.'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อนโยบาย *</Label>
            <Input {...register('obec_policy')} placeholder="ชื่อนโยบาย" />
            {errors.obec_policy && (
              <p className="text-red-500 text-xs mt-1">{errors.obec_policy.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('detail')} placeholder="รายละเอียดนโยบาย" />
            {errors.detail && (
              <p className="text-red-500 text-xs mt-1">{errors.detail.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบนโยบาย "${deleteTarget?.obec_policy}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
