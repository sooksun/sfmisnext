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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'
import type { Admin, PaginatedResponse } from '@/lib/types'

const userTypeLabels: Record<number, string> = {
  1: 'SuperAdmin',
  2: 'School Admin',
  3: 'วางแผน',
  4: 'พัสดุ',
  5: 'การเงิน',
  6: 'หัวหน้าวางแผน',
  7: 'หัวหน้าพัสดุ',
  8: 'หัวหน้าการเงิน',
}

const userSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().optional(),
  type: z.number().min(1).max(8),
})
type UserForm = z.infer<typeof userSchema>

export default function UserPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)
  const [editing, setEditing] = useState<Admin | null>(null)
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
    queryKey: ['user', scId, page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<Admin>>(`B_admin/load_user/${scId}/${page}/${pageSize}`),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<UserForm>({
      resolver: zodResolver(userSchema),
      defaultValues: { type: 2 },
    })

  const typeValue = watch('type')

  const saveMutation = useMutation({
    mutationFn: (form: UserForm) => {
      const payload = { ...form, sc_id: scId }
      if (editing) {
        return apiPost('B_admin/update_user', { ...payload, admin_id: editing.admin_id })
      }
      return apiPost('B_admin/add_user', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['user'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Admin) => apiPost('B_admin/remove_user', { ...item, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['user'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ name: '', email: '', password: '', type: 2 })
    setDialogOpen(true)
  }

  function openEdit(item: Admin) {
    setEditing(item)
    reset({ name: item.name, email: item.email, type: item.type })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Admin) => (
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
    { header: 'ID', key: 'admin_id' as keyof Admin },
    { header: 'ชื่อ', key: 'name' as keyof Admin },
    { header: 'อีเมล', key: 'email' as keyof Admin },
    {
      header: 'ประเภท',
      render: (item: Admin) => <span>{userTypeLabels[item.type] ?? item.type}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: Admin) => (
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
        title="ผู้ใช้งาน (Users)"
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
        title={editing ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อ *</Label>
            <Input {...register('name')} placeholder="ชื่อ-นามสกุล" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label>อีเมล *</Label>
            <Input type="email" {...register('email')} placeholder="example@email.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label>รหัสผ่าน</Label>
            <Input
              type="password"
              {...register('password')}
              placeholder="รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)"
            />
          </div>
          <div>
            <Label>ประเภทผู้ใช้ *</Label>
            <Select
              value={String(typeValue)}
              onValueChange={(val) => setValue('type', Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(userTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบผู้ใช้ "${deleteTarget?.name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
