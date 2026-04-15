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
import { showNumber } from '@/lib/utils'
import type { PaginatedResponse } from '@/lib/types'

interface ClassroomBudget {
  cb_id: number
  level_name: string
  budget_amount: number
  del: number
}

const cbSchema = z.object({
  level_name: z.string().min(1, 'กรุณากรอกระดับชั้น'),
  budget_amount: z.number().min(0, 'กรุณากรอกจำนวนงบประมาณ'),
})
type CbForm = z.infer<typeof cbSchema>

export default function ClassroomBudgetPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClassroomBudget | null>(null)
  const [editing, setEditing] = useState<ClassroomBudget | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['classroom_budget', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<ClassroomBudget>>(
        `B_settings/load_classroom_budget/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CbForm>({
    resolver: zodResolver(cbSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: CbForm) => {
      if (editing) {
        return apiPost('B_settings/update_classroom_budget', { ...form, cb_id: editing.cb_id })
      }
      return apiPost('B_settings/add_classroom_budget', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['classroom_budget'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ClassroomBudget) =>
      apiPost('B_settings/remove_classroom_budget', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['classroom_budget'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ level_name: '', budget_amount: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: ClassroomBudget) {
    setEditing(item)
    reset({ level_name: item.level_name, budget_amount: item.budget_amount })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ClassroomBudget) => (
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
    { header: 'ID', key: 'cb_id' as keyof ClassroomBudget },
    { header: 'ระดับชั้น', key: 'level_name' as keyof ClassroomBudget },
    {
      header: 'จำนวนงบประมาณ (บาท)',
      render: (item: ClassroomBudget) => (
        <span className="text-right block">{showNumber(item.budget_amount)}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="งบประมาณต่อห้องเรียน (Classroom Budget)"
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
        title={editing ? 'แก้ไขงบประมาณต่อห้องเรียน' : 'เพิ่มงบประมาณต่อห้องเรียน'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ระดับชั้น *</Label>
            <Input {...register('level_name')} placeholder="เช่น ป.1, ม.1" />
            {errors.level_name && (
              <p className="text-red-500 text-xs mt-1">{errors.level_name.message}</p>
            )}
          </div>
          <div>
            <Label>จำนวนงบประมาณ (บาท) *</Label>
            <Input type="number" step="0.01" {...register('budget_amount', { valueAsNumber: true })} placeholder="0.00" />
            {errors.budget_amount && (
              <p className="text-red-500 text-xs mt-1">{errors.budget_amount.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบ "${deleteTarget?.level_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
