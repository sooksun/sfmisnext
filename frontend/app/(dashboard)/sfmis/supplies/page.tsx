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
import type { PaginatedResponse } from '@/lib/types'

interface Supply {
  supp_id: number
  sc_id: number
  ts_id: number
  ts_name: string
  un_id: number
  un_name: string
  supp_name: string
  supp_amount: number
  supp_cap_max: number
  supp_cap_min: number
  del: number
  up_by: number | null
  update_date: string | null
}

interface TypeSupply {
  ts_id: number
  ts_name: string
}

interface Unit {
  un_id: number
  un_name: string
}

const schema = z.object({
  supp_name: z.string().min(1, 'กรุณากรอกชื่อวัสดุ'),
  ts_id: z.number().min(1, 'กรุณาเลือกประเภทพัสดุ'),
  un_id: z.number().min(1, 'กรุณาเลือกหน่วยนับ'),
  supp_amount: z.number().min(0, 'กรุณากรอกจำนวน'),
})
type Form = z.infer<typeof schema>

export default function SuppliesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null)
  const [editing, setEditing] = useState<Supply | null>(null)
  const [scId, setScId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['supplies', scId, page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<Supply>>(
        `General_db/load_supplies/${scId}/${page}/${pageSize}`
      ),
    enabled: scId > 0,
  })

  const { data: typeSupplies } = useQuery({
    queryKey: ['type-supplies-list', scId],
    queryFn: () =>
      apiPost<PaginatedResponse<TypeSupply>>(`General_db/load_type_supplie/${scId}/0/999`, {}),
    enabled: scId > 0,
  })

  const { data: units } = useQuery({
    queryKey: ['units-list', scId],
    queryFn: () =>
      apiPost<PaginatedResponse<Unit>>(`General_db/load_unit/${scId}/0/999`, {}),
    enabled: scId > 0,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: { ts_id: 0, un_id: 0, supp_amount: 0 },
    })

  const tsId = watch('ts_id')
  const unId = watch('un_id')

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      if (editing) {
        return apiPost('General_db/updateSupplies', {
          ...form,
          supp_id: editing.supp_id,
          sc_id: scId,
        })
      }
      return apiPost('General_db/addSupplie', { ...form, sc_id: scId })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['supplies'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Supply) =>
      apiPost('General_db/remove_supplies', { supp_id: item.supp_id, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['supplies'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ supp_name: '', ts_id: 0, un_id: 0, supp_amount: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: Supply) {
    setEditing(item)
    reset({
      supp_name: item.supp_name,
      ts_id: item.ts_id,
      un_id: item.un_id,
      supp_amount: item.supp_amount,
    })
    setDialogOpen(true)
  }

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Supply) => (
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
    { header: 'ชื่อวัสดุ', key: 'supp_name' as keyof Supply },
    { header: 'ประเภทพัสดุ', key: 'ts_name' as keyof Supply },
    { header: 'หน่วยนับ', key: 'un_name' as keyof Supply },
    { header: 'จำนวนคงเหลือ', key: 'supp_amount' as keyof Supply },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: Supply) => (
        <small className="text-gray-500">{item.update_date ?? '-'}</small>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="บัญชีวัสดุ"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มวัสดุ
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
        title={editing ? 'แก้ไขวัสดุ' : 'เพิ่มวัสดุ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อวัสดุ *</Label>
            <Input {...register('supp_name')} placeholder="ชื่อวัสดุ" />
            {errors.supp_name && (
              <p className="text-red-500 text-xs mt-1">{errors.supp_name.message}</p>
            )}
          </div>
          <div>
            <Label>ประเภทพัสดุ *</Label>
            <Select
              value={tsId > 0 ? String(tsId) : ''}
              onValueChange={(v) => setValue('ts_id', Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทพัสดุ" />
              </SelectTrigger>
              <SelectContent>
                {(typeSupplies?.data ?? []).map((t) => (
                  <SelectItem key={t.ts_id} value={String(t.ts_id)}>
                    {t.ts_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ts_id && (
              <p className="text-red-500 text-xs mt-1">{errors.ts_id.message}</p>
            )}
          </div>
          <div>
            <Label>หน่วยนับ *</Label>
            <Select
              value={unId > 0 ? String(unId) : ''}
              onValueChange={(v) => setValue('un_id', Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกหน่วยนับ" />
              </SelectTrigger>
              <SelectContent>
                {(units?.data ?? []).map((u) => (
                  <SelectItem key={u.un_id} value={String(u.un_id)}>
                    {u.un_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.un_id && (
              <p className="text-red-500 text-xs mt-1">{errors.un_id.message}</p>
            )}
          </div>
          <div>
            <Label>จำนวน</Label>
            <Input
              type="number"
              step="1"
              {...register('supp_amount', { valueAsNumber: true })}
              placeholder="จำนวน"
            />
            {errors.supp_amount && (
              <p className="text-red-500 text-xs mt-1">{errors.supp_amount.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบวัสดุ "${deleteTarget?.supp_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
