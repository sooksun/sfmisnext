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

interface MoePolicy {
  moe_policy_id: number
  policy_name: string
  policy_detail: string
  del: number
}

const policySchema = z.object({
  policy_name: z.string().min(1, 'กรุณากรอกชื่อนโยบาย'),
  policy_detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
})
type PolicyForm = z.infer<typeof policySchema>

export default function MoePolicyPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MoePolicy | null>(null)
  const [editing, setEditing] = useState<MoePolicy | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['moe_policy', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<MoePolicy>>(
        `B_settings/load_moe_policy/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: PolicyForm) => {
      if (editing) {
        return apiPost('B_settings/update_moe_policy', {
          ...form,
          moe_policy_id: editing.moe_policy_id,
        })
      }
      return apiPost('B_settings/add_moe_policy', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['moe_policy'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: MoePolicy) =>
      apiPost('B_settings/remove_moe_policy', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['moe_policy'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ policy_name: '', policy_detail: '' })
    setDialogOpen(true)
  }

  function openEdit(item: MoePolicy) {
    setEditing(item)
    reset({ policy_name: item.policy_name, policy_detail: item.policy_detail })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: MoePolicy) => (
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
    { header: 'ID', key: 'moe_policy_id' as keyof MoePolicy },
    { header: 'ชื่อนโยบาย', key: 'policy_name' as keyof MoePolicy },
    { header: 'รายละเอียด', key: 'policy_detail' as keyof MoePolicy },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="นโยบาย กระทรวงศึกษาธิการ (MOE Policy)"
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
        title={editing ? 'แก้ไขนโยบาย กระทรวงศึกษาธิการ' : 'เพิ่มนโยบาย กระทรวงศึกษาธิการ'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อนโยบาย *</Label>
            <Input {...register('policy_name')} placeholder="ชื่อนโยบาย" />
            {errors.policy_name && (
              <p className="text-red-500 text-xs mt-1">{errors.policy_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('policy_detail')} placeholder="รายละเอียดนโยบาย" />
            {errors.policy_detail && (
              <p className="text-red-500 text-xs mt-1">{errors.policy_detail.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบนโยบาย "${deleteTarget?.policy_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
