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

// ── Types ─────────────────────────────────────────────────────────────────────
// field names ตรงกับสิ่งที่ backend project.service.ts map ออกมา

interface ProjectRow {
  proj_id: number
  project_code: string       // auto-gen PROJ-XXXXXX จาก backend
  proj_name: string
  proj_detail: string | null
  proj_budget: number
  proj_status: number
  sc_id: number
  sy_id: number
  up_by: number | null
  update_date: string | null
}

interface ProjectResponse {
  data: ProjectRow[]
  count: number
  page: number
  pageSize: number
}

// ── Schema ────────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  proj_name:   z.string().min(1, 'กรุณากรอกชื่อโครงการ'),
  proj_detail: z.string().optional(),
  proj_budget: z.number().min(0, 'กรุณากรอกวงเงิน'),
})
type ProjectForm = z.infer<typeof projectSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<number, { text: string; color: string }> = {
  0: { text: 'รอดำเนินการ',  color: 'text-yellow-600' },
  1: { text: 'อนุมัติแล้ว',  color: 'text-green-600'  },
  2: { text: 'ไม่อนุมัติ',   color: 'text-red-500'    },
}

const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null)
  const [editing, setEditing] = useState<ProjectRow | null>(null)

  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [userId, setUserId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id)   setScId(Number(userData.sc_id))
      if (userData?.admin_id) setUserId(Number(userData.admin_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  // ── Query ─────────────────────────────────────────────────────────────────
  // endpoint: GET project/load_project/:scId/:userId/:page/:pageSize/:syId

  const { data: resp, isLoading } = useQuery({
    queryKey: ['project', scId, userId, syId, page, pageSize],
    queryFn: () =>
      apiGet<ProjectResponse>(
        `project/load_project/${scId}/${userId}/${page}/${pageSize}/${syId}`
      ),
    enabled: scId > 0 && syId > 0,
  })

  const rows = resp?.data ?? []

  // ── Form ──────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { proj_name: '', proj_detail: '', proj_budget: 0 },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (form: ProjectForm) => {
      const payload = { ...form, sc_id: scId, sy_id: syId, up_by: userId }
      if (editing) {
        return apiPost('Project/updateProject', { ...payload, proj_id: editing.proj_id })
      }
      return apiPost('Project/addProject', payload)
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['project'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res?.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ProjectRow) =>
      apiPost('Project/removeProject', { proj_id: item.proj_id }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['project'] })
      } else {
        toast.error(res?.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null)
    reset({ proj_name: '', proj_detail: '', proj_budget: 0 })
    setDialogOpen(true)
  }

  function openEdit(item: ProjectRow) {
    setEditing(item)
    reset({
      proj_name:   item.proj_name ?? '',
      proj_detail: item.proj_detail ?? '',
      proj_budget: Number(item.proj_budget),
    })
    setDialogOpen(true)
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ProjectRow) => (
        <div className="flex gap-1">
          <Button size="sm" variant="warning" onClick={() => openEdit(item)} title="แก้ไข">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} title="ลบ">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      headerClassName: 'w-20',
    },
    {
      header: 'รหัสโครงการ',
      render: (item: ProjectRow) => (
        <span className="font-mono text-xs text-gray-500">{item.project_code}</span>
      ),
    },
    {
      header: 'ชื่อโครงการ',
      render: (item: ProjectRow) => (
        <div>
          <p className="font-medium">{item.proj_name}</p>
          {item.proj_detail && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.proj_detail}</p>
          )}
        </div>
      ),
    },
    {
      header: 'วงเงิน (บาท)',
      render: (item: ProjectRow) => (
        <span className="font-mono">{fmt(item.proj_budget)}</span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: ProjectRow) => {
        const s = STATUS_LABEL[item.proj_status] ?? { text: String(item.proj_status), color: 'text-gray-500' }
        return <span className={s.color}>{s.text}</span>
      },
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

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
          data={rows}
          total={resp?.count ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขโครงการ' : 'เพิ่มโครงการ'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่อโครงการ *</Label>
            <Input {...register('proj_name')} placeholder="ชื่อโครงการ" />
            {errors.proj_name && (
              <p className="text-red-500 text-xs mt-1">{errors.proj_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Input {...register('proj_detail')} placeholder="รายละเอียดโครงการ (ไม่บังคับ)" />
          </div>
          <div>
            <Label>วงเงินงบประมาณ (บาท) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('proj_budget', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.proj_budget && (
              <p className="text-red-500 text-xs mt-1">{errors.proj_budget.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบโครงการ "${deleteTarget?.proj_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
