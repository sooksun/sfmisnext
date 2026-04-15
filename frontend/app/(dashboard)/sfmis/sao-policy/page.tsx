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

interface SaoPolicy {
  sao_policy_id: number
  sao_policy_name: string
  del: number
}

const saoPolicySchema = z.object({
  sao_policy_name: z.string().min(1, 'กรุณากรอกชื่อนโยบาย สพท.'),
})
type SaoPolicyForm = z.infer<typeof saoPolicySchema>

export default function SaoPolicyPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SaoPolicy | null>(null)
  const [editing, setEditing] = useState<SaoPolicy | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sao_policy', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<SaoPolicy>>(
        `B_settings/load_sao_policy/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SaoPolicyForm>({
    resolver: zodResolver(saoPolicySchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: SaoPolicyForm) => {
      if (editing) {
        return apiPost('B_settings/update_sao_policy', {
          ...form,
          sao_policy_id: editing.sao_policy_id,
        })
      }
      return apiPost('B_settings/add_sao_policy', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['sao_policy'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: SaoPolicy) =>
      apiPost('B_settings/remove_sao_policy', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['sao_policy'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ sao_policy_name: '' })
    setDialogOpen(true)
  }

  function openEdit(item: SaoPolicy) {
    setEditing(item)
    reset({ sao_policy_name: item.sao_policy_name })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: SaoPolicy) => (
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
    { header: 'ID', key: 'sao_policy_id' as keyof SaoPolicy },
    { header: 'ชื่อนโยบาย สพท.', key: 'sao_policy_name' as keyof SaoPolicy },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="นโยบาย สพท. (SAO Policy)"
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
        title={editing ? 'แก้ไขนโยบาย สพท.' : 'เพิ่มนโยบาย สพท.'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อนโยบาย สพท. *</Label>
            <Input {...register('sao_policy_name')} placeholder="ชื่อนโยบาย สพท." />
            {errors.sao_policy_name && (
              <p className="text-red-500 text-xs mt-1">{errors.sao_policy_name.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบนโยบาย "${deleteTarget?.sao_policy_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
