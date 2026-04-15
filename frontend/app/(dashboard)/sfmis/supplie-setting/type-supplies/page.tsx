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
import { apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'
import type { PaginatedResponse } from '@/lib/types'

interface TypeSupply {
  ts_id: number
  sc_id: number
  ts_name: string
  del: number
  up_by: string
  up_date: string
}

const schema = z.object({
  ts_name: z.string().min(1, 'กรุณากรอกชื่อประเภทพัสดุ'),
})
type Form = z.infer<typeof schema>

export default function TypeSuppliesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TypeSupply | null>(null)
  const [editing, setEditing] = useState<TypeSupply | null>(null)
  const [scId, setScId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['type-supplies', scId, page, pageSize],
    queryFn: () =>
      apiPost<PaginatedResponse<TypeSupply>>(
        `General_db/load_type_supplie/${scId}/${page}/${pageSize}`,
        {}
      ),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      if (editing) {
        return apiPost('General_db/updateTypeSupplie', {
          ...form,
          ts_id: editing.ts_id,
          sc_id: scId,
        })
      }
      return apiPost('General_db/addTypeSupplie', { ...form, sc_id: scId })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['type-supplies'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: TypeSupply) =>
      apiPost('General_db/remove_type_supplie', { ts_id: item.ts_id }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['type-supplies'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ ts_name: '' })
    setDialogOpen(true)
  }

  function openEdit(item: TypeSupply) {
    setEditing(item)
    reset({ ts_name: item.ts_name })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: TypeSupply) => (
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
    { header: 'ID', key: 'ts_id' as keyof TypeSupply },
    { header: 'ชื่อประเภทพัสดุ', key: 'ts_name' as keyof TypeSupply },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: TypeSupply) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ประเภทพัสดุ"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มประเภทพัสดุ
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
        title={editing ? 'แก้ไขประเภทพัสดุ' : 'เพิ่มประเภทพัสดุ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อประเภทพัสดุ *</Label>
            <Input {...register('ts_name')} placeholder="ชื่อประเภทพัสดุ" />
            {errors.ts_name && (
              <p className="text-red-500 text-xs mt-1">{errors.ts_name.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบประเภทพัสดุ "${deleteTarget?.ts_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
