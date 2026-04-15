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

interface BudgetIncomeType {
  bit_id: number
  bit_name: string
  bit_detail: string
  del: number
}

const bitSchema = z.object({
  bit_name: z.string().min(1, 'กรุณากรอกประเภทงบประมาณ'),
  bit_detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
})
type BitForm = z.infer<typeof bitSchema>

export default function BudgetIncomeTypePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BudgetIncomeType | null>(null)
  const [editing, setEditing] = useState<BudgetIncomeType | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['budget_income_type', page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<BudgetIncomeType>>(
        `B_settings/load_budget_income_type/${page}/${pageSize}`
      ),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BitForm>({
    resolver: zodResolver(bitSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: BitForm) => {
      if (editing) {
        return apiPost('B_settings/update_budget_income_type', {
          ...form,
          bit_id: editing.bit_id,
        })
      }
      return apiPost('B_settings/add_budget_income_type', form)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['budget_income_type'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: BudgetIncomeType) =>
      apiPost('B_settings/remove_budget_income_type', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['budget_income_type'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ bit_name: '', bit_detail: '' })
    setDialogOpen(true)
  }

  function openEdit(item: BudgetIncomeType) {
    setEditing(item)
    reset({ bit_name: item.bit_name, bit_detail: item.bit_detail })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: BudgetIncomeType) => (
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
    { header: 'ID', key: 'bit_id' as keyof BudgetIncomeType },
    { header: 'ประเภทงบประมาณ', key: 'bit_name' as keyof BudgetIncomeType },
    { header: 'รายละเอียด', key: 'bit_detail' as keyof BudgetIncomeType },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ประเภทรายรับงบประมาณ (Budget Income Type)"
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
        title={editing ? 'แก้ไขประเภทรายรับ' : 'เพิ่มประเภทรายรับ'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ประเภทงบประมาณ *</Label>
            <Input {...register('bit_name')} placeholder="ชื่อประเภทงบประมาณ" />
            {errors.bit_name && (
              <p className="text-red-500 text-xs mt-1">{errors.bit_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('bit_detail')} placeholder="รายละเอียด" />
            {errors.bit_detail && (
              <p className="text-red-500 text-xs mt-1">{errors.bit_detail.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบ "${deleteTarget?.bit_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
