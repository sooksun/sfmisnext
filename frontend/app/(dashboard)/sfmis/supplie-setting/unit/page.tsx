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

interface Unit {
  un_id: number
  un_name: string
  sc_id: number
  del: number
  up_by: string
  up_date: string
}

const schema = z.object({
  un_name: z.string().min(1, 'กรุณากรอกชื่อหน่วยนับ'),
})
type Form = z.infer<typeof schema>

export default function UnitPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [scId, setScId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['units', scId, page, pageSize],
    queryFn: () => apiPost<{ data: Unit[]; count: number }>(`General_db/load_unit/${scId}/${page}/${pageSize}`, {}),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { un_name: '' },
  })

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      const payload = { ...form, sc_id: scId }
      if (editing) {
        return apiPost('General_db/updateUnit', { ...payload, un_id: editing.un_id })
      }
      return apiPost('General_db/addUnit', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['units'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Unit) => apiPost('General_db/remove_unit', { un_id: item.un_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['units'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ un_name: '' })
    setDialogOpen(true)
  }

  function openEdit(item: Unit) {
    setEditing(item)
    reset({ un_name: item.un_name })
    setDialogOpen(true)
  }

  const rows = Array.isArray(data?.data) ? data.data : []
  const total = data?.count ?? rows.length

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Unit) => (
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
    { header: 'ชื่อหน่วยนับ', key: 'un_name' as keyof Unit },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: Unit) => (
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
        title="หน่วยนับพัสดุ"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มหน่วยนับ
          </Button>
        }
      />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขหน่วยนับ' : 'เพิ่มหน่วยนับ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อหน่วยนับ *</Label>
            <Input {...register('un_name')} placeholder="เช่น ชิ้น, กล่อง, แพ็ค" />
            {errors.un_name && (
              <p className="text-red-500 text-xs mt-1">{errors.un_name.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบหน่วยนับ "${deleteTarget?.un_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
