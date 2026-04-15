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

interface Project {
  ppa_id: number
  sc_id: number
  sy_id: number
  project_name: string
  project_code: string
  budget_amount: number
  budget_used: number
  budget_remain: number
  status: number
  del: number
  up_by: string
  up_date: string
}

const projectSchema = z.object({
  project_name: z.string().min(1, 'กรุณากรอกชื่อโครงการ'),
  project_code: z.string().min(1, 'กรุณากรอกรหัสโครงการ'),
  budget_amount: z.number().min(0, 'กรุณากรอกวงเงินงบประมาณ'),
})
type ProjectForm = z.infer<typeof projectSchema>

const statusLabel: Record<number, string> = {
  0: 'รอดำเนินการ',
  1: 'อนุมัติแล้ว',
  2: 'ไม่อนุมัติ',
}

export default function ProjectPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [editing, setEditing] = useState<Project | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['project', scId, syId, page, pageSize],
    queryFn: () =>
      apiGet<PaginatedResponse<Project>>(
        `Project_approve/loadProjectApprove/${scId}/${syId}/${page}/${pageSize}`
      ),
    enabled: scId > 0 && syId > 0,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { budget_amount: 0 },
  })

  const saveMutation = useMutation({
    mutationFn: (form: ProjectForm) => {
      const payload = { ...form, sc_id: scId, sy_id: syId }
      if (editing) {
        return apiPost('Project_approve/updateProjectApprove', {
          ...payload,
          ppa_id: editing.ppa_id,
        })
      }
      return apiPost('Project_approve/addProjectApprove', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['project'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: Project) =>
      apiPost('Project_approve/removeParcelOrder', { ppa_id: item.ppa_id, del: 1 }),
    onSuccess: () => {
      toast.success('ลบเรียบร้อยแล้ว')
      qc.invalidateQueries({ queryKey: ['project'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({ project_name: '', project_code: '', budget_amount: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: Project) {
    setEditing(item)
    reset({
      project_name: item.project_name,
      project_code: item.project_code,
      budget_amount: item.budget_amount,
    })
    setDialogOpen(true)
  }

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  const columns = [
    {
      header: 'จัดการ',
      render: (item: Project) => (
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
    { header: 'รหัสโครงการ', key: 'project_code' as keyof Project },
    { header: 'ชื่อโครงการ', key: 'project_name' as keyof Project },
    {
      header: 'วงเงิน (บาท)',
      render: (item: Project) => <span>{fmt(item.budget_amount)}</span>,
    },
    {
      header: 'ใช้ไป (บาท)',
      render: (item: Project) => <span>{fmt(item.budget_used)}</span>,
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: Project) => (
        <span className={item.budget_remain < 0 ? 'text-red-600 font-semibold' : ''}>
          {fmt(item.budget_remain)}
        </span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: Project) => (
        <span>{statusLabel[item.status] ?? item.status}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="แผนงาน / โครงการ"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มโครงการ
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
        title={editing ? 'แก้ไขโครงการ' : 'เพิ่มโครงการ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>รหัสโครงการ *</Label>
            <Input {...register('project_code')} placeholder="รหัสโครงการ" />
            {errors.project_code && (
              <p className="text-red-500 text-xs mt-1">{errors.project_code.message}</p>
            )}
          </div>
          <div>
            <Label>ชื่อโครงการ *</Label>
            <Input {...register('project_name')} placeholder="ชื่อโครงการ" />
            {errors.project_name && (
              <p className="text-red-500 text-xs mt-1">{errors.project_name.message}</p>
            )}
          </div>
          <div>
            <Label>วงเงินงบประมาณ (บาท) *</Label>
            <Input
              type="number"
              step="0.01"
              {...register('budget_amount', { valueAsNumber: true })}
              placeholder="วงเงินงบประมาณ"
            />
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
        description={`ต้องการลบโครงการ "${deleteTarget?.project_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
