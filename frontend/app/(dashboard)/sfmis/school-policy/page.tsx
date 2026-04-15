'use client'
import { useState, useEffect } from 'react'
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

interface SchoolPolicy {
  sp_id: number
  sp_name: string
  sp_detail: string
  sc_id: number
  del: number
}

const spSchema = z.object({
  sp_name: z.string().min(1, 'กรุณากรอกชื่อนโยบายโรงเรียน'),
  sp_detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
})
type SpForm = z.infer<typeof spSchema>

export default function SchoolPolicyPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SchoolPolicy | null>(null)
  const [editing, setEditing] = useState<SchoolPolicy | null>(null)
  const [scId, setScId] = useState<number>(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {
      // ignore
    }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['school_policy', scId, page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<SchoolPolicy>>(
        `B_school_policy/load_school_policy/${scId}/${page}/${pageSize}`
      ),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SpForm>({
    resolver: zodResolver(spSchema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: SpForm) => {
      const payload = { ...form, sc_id: scId }
      if (editing) {
        return apiPost('B_school_policy/update_school_policy', {
          ...payload,
          sp_id: editing.sp_id,
        })
      }
      return apiPost('B_school_policy/add_school_policy', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['school_policy'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: SchoolPolicy) =>
      apiPost('B_school_policy/remove_school_policy', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['school_policy'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ sp_name: '', sp_detail: '' })
    setDialogOpen(true)
  }

  function openEdit(item: SchoolPolicy) {
    setEditing(item)
    reset({ sp_name: item.sp_name, sp_detail: item.sp_detail })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: SchoolPolicy) => (
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
    { header: 'ID', key: 'sp_id' as keyof SchoolPolicy },
    { header: 'ชื่อนโยบายโรงเรียน', key: 'sp_name' as keyof SchoolPolicy },
    { header: 'รายละเอียด', key: 'sp_detail' as keyof SchoolPolicy },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="นโยบายโรงเรียน (School Policy)"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
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
        title={editing ? 'แก้ไขนโยบายโรงเรียน' : 'เพิ่มนโยบายโรงเรียน'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อนโยบายโรงเรียน *</Label>
            <Input {...register('sp_name')} placeholder="ชื่อนโยบายโรงเรียน" />
            {errors.sp_name && (
              <p className="text-red-500 text-xs mt-1">{errors.sp_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('sp_detail')} placeholder="รายละเอียด" />
            {errors.sp_detail && (
              <p className="text-red-500 text-xs mt-1">{errors.sp_detail.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบนโยบาย "${deleteTarget?.sp_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
