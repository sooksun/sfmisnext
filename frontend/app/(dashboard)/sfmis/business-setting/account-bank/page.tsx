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

interface BankAccount {
  ba_id: number
  b_id: number
  ba_name: string
  ba_no: string
  sc_id: number
  up_by: number
  del: number
  create_date: string
  update_date: string
}

interface Bank {
  b_id: number
  b_name_l: string
  b_name_s: string
  b_img: string | null
}

const schema = z.object({
  b_id: z.number().min(1, 'กรุณาเลือกธนาคาร'),
  ba_no: z.string().min(1, 'กรุณากรอกเลขบัญชี'),
  ba_name: z.string().min(1, 'กรุณากรอกชื่อบัญชี'),
})
type Form = z.infer<typeof schema>

export default function AccountBankPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [scId, setScId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['account-bank', scId],
    queryFn: () => apiGet<BankAccount[]>(`Bank/loadBankAccount/${scId}`),
    enabled: scId > 0,
  })

  const { data: banks } = useQuery({
    queryKey: ['banks-db'],
    queryFn: () => apiGet<Bank[]>('Bank/loadBankDB'),
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: { b_id: 0 },
    })

  const bankId = watch('b_id')

  const saveMutation = useMutation({
    mutationFn: (form: Form) => {
      const payload = { ...form, sc_id: scId }
      if (editing) {
        return apiPost('Bank/updateBankSchool', { ...payload, ba_id: editing.ba_id })
      }
      return apiPost('Bank/addBankSchool', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['account-bank'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: BankAccount) =>
      apiPost('Bank/removeBankAccount', { ba_id: item.ba_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['account-bank'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ b_id: 0, ba_no: '', ba_name: '' })
    setDialogOpen(true)
  }

  function openEdit(item: BankAccount) {
    setEditing(item)
    reset({
      b_id: item.b_id,
      ba_no: item.ba_no,
      ba_name: item.ba_name,
    })
    setDialogOpen(true)
  }

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: BankAccount) => (
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
    {
      header: 'ธนาคาร',
      render: (item: BankAccount) => {
        const bank = (banks ?? []).find((b) => b.b_id === item.b_id)
        return <span>{bank?.b_name_l ?? '-'}</span>
      },
    },
    { header: 'เลขที่บัญชี', key: 'ba_no' as keyof BankAccount },
    { header: 'ชื่อบัญชี', key: 'ba_name' as keyof BankAccount },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: BankAccount) => (
        <div>
          <small className="text-gray-500">{getThaiDateTime(item.update_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="บัญชีธนาคาร"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มบัญชีธนาคาร
          </Button>
        }
      />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคาร'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ธนาคาร *</Label>
            <Select
              value={bankId > 0 ? String(bankId) : ''}
              onValueChange={(v) => setValue('b_id', Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกธนาคาร" />
              </SelectTrigger>
              <SelectContent>
                {(banks ?? []).map((b) => (
                  <SelectItem key={b.b_id} value={String(b.b_id)}>
                    {b.b_name_l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.b_id && (
              <p className="text-red-500 text-xs mt-1">{errors.b_id.message}</p>
            )}
          </div>
          <div>
            <Label>เลขที่บัญชี *</Label>
            <Input {...register('ba_no')} placeholder="เลขที่บัญชีธนาคาร" />
            {errors.ba_no && (
              <p className="text-red-500 text-xs mt-1">{errors.ba_no.message}</p>
            )}
          </div>
          <div>
            <Label>ชื่อบัญชี *</Label>
            <Input {...register('ba_name')} placeholder="ชื่อบัญชีธนาคาร" />
            {errors.ba_name && (
              <p className="text-red-500 text-xs mt-1">{errors.ba_name.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบบัญชี "${deleteTarget?.ba_name}" (${deleteTarget?.ba_no}) หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
