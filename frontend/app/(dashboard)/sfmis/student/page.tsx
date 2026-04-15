'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  st_id: number
  sc_id: number
  sy_id: number
  budget_year: string
  class_id: number
  class_lev: string
  st_count: number
  up_by: string | number
  update_date: string
}

interface StudentResponse {
  data: StudentRow[]
  count: number
  edit: boolean       // true = แก้ไขได้, false = ล็อกแล้ว (ยืนยันส่งแล้ว)
  totalstudent: number
}

interface Classroom {
  class_id: number
  class_lev: string
}

// ── Schema ────────────────────────────────────────────────────────────────────

const addSchema = z.object({
  class_id: z.number().min(1, 'กรุณาเลือกระดับชั้น'),
  st_count: z.number().min(0, 'กรุณากรอกจำนวน'),
})
const editSchema = z.object({
  st_count: z.number().min(0, 'กรุณากรอกจำนวน'),
})
type AddForm = z.infer<typeof addSchema>
type EditForm = z.infer<typeof editSchema>

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StudentRow | null>(null)

  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [budgetYear, setBudgetYear] = useState('')
  const [upBy, setUpBy] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
      if (userData?.admin_id) setUpBy(Number(userData.admin_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setBudgetYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  // ── Auto-init: สร้าง row ให้ทุก class หากยังไม่มีข้อมูลของปีนี้ ──────────────
  useEffect(() => {
    if (scId > 0 && syId > 0 && budgetYear) {
      apiPost('Student/checkClassOnYear', {
        sc_id: scId,
        sy_id: syId,
        budget_date: budgetYear,
        up_by: upBy,
      }).catch(() => {})
    }
  }, [scId, syId, budgetYear, upBy])

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: resp, isLoading } = useQuery({
    queryKey: ['student', syId, budgetYear, scId, page, pageSize],
    queryFn: () =>
      apiGet<StudentResponse>(
        `Student/loadStudent/${syId}/${budgetYear}/${scId}/${page}/${pageSize}`
      ),
    enabled: scId > 0 && syId > 0 && !!budgetYear,
  })

  const { data: classrooms } = useQuery({
    queryKey: ['classroom-list'],
    queryFn: () => apiGet<Classroom[]>('Student/loadClassroom'),
  })

  const rows = resp?.data ?? []
  const canEdit = resp?.edit !== false   // false = ล็อกแล้ว
  const classList = Array.isArray(classrooms) ? classrooms : []

  // ── Add form ─────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { class_id: 0, st_count: 0 },
  })
  const classId = addForm.watch('class_id')

  const addMutation = useMutation({
    mutationFn: (form: AddForm) =>
      apiPost('Student/addStudent', {
        ...form,
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        up_by: upBy,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('เพิ่มข้อมูลนักเรียนเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['student'] })
        setAddOpen(false)
        addForm.reset({ class_id: 0, st_count: 0 })
      } else {
        toast.error(res?.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Edit form ─────────────────────────────────────────────────────────────

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { st_count: 0 },
  })

  const editMutation = useMutation({
    mutationFn: (form: EditForm) =>
      apiPost('Student/updateStudent', {
        st_id: editTarget?.st_id,
        st_count: form.st_count,
        up_by: upBy,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['student'] })
        setEditTarget(null)
      } else {
        toast.error(res?.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openEdit(item: StudentRow) {
    setEditTarget(item)
    editForm.reset({ st_count: item.st_count })
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'จัดการ',
      render: (item: StudentRow) =>
        canEdit ? (
          <Button size="sm" variant="warning" onClick={() => openEdit(item)} title="แก้ไข">
            <Pencil className="h-3 w-3" />
          </Button>
        ) : null,
      headerClassName: 'w-16',
    },
    { header: 'ระดับชั้น', key: 'class_lev' as keyof StudentRow },
    {
      header: 'จำนวนนักเรียน (คน)',
      render: (item: StudentRow) => (
        <span className="font-medium">{item.st_count.toLocaleString()}</span>
      ),
    },
    { header: 'แก้ไขโดย', key: 'up_by' as keyof StudentRow },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ข้อมูลนักเรียน"
        actions={
          canEdit ? (
            <Button onClick={() => { addForm.reset({ class_id: 0, st_count: 0 }); setAddOpen(true) }}
              disabled={scId === 0}>
              <Plus className="h-4 w-4" />
              เพิ่มรายการ
            </Button>
          ) : undefined
        }
      />

      {/* สรุปจำนวน */}
      {resp && (
        <div className="px-4 pb-2 flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            รวมนักเรียนทั้งหมด:&nbsp;
            <strong className="text-indigo-600">{resp.totalstudent.toLocaleString()} คน</strong>
          </span>
          {!canEdit && (
            <span className="text-xs text-amber-600 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
              🔒 ยืนยันส่งข้อมูลแล้ว — ไม่สามารถแก้ไขได้
            </span>
          )}
        </div>
      )}

      <div className="p-4 pt-0">
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

      {/* ── Dialog เพิ่มรายการ ──────────────────────────────────────────────── */}
      <FormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="เพิ่มข้อมูลนักเรียน"
        onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))}
        loading={addMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ระดับชั้น *</Label>
            <Select
              value={classId > 0 ? String(classId) : ''}
              onValueChange={(v) => addForm.setValue('class_id', Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกระดับชั้น" />
              </SelectTrigger>
              <SelectContent>
                {classList.map((c) => (
                  <SelectItem key={c.class_id} value={String(c.class_id)}>
                    {c.class_lev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addForm.formState.errors.class_id && (
              <p className="text-red-500 text-xs mt-1">{addForm.formState.errors.class_id.message}</p>
            )}
          </div>
          <div>
            <Label>จำนวนนักเรียน (คน) *</Label>
            <Input
              type="number"
              min="0"
              {...addForm.register('st_count', { valueAsNumber: true })}
              placeholder="0"
            />
            {addForm.formState.errors.st_count && (
              <p className="text-red-500 text-xs mt-1">{addForm.formState.errors.st_count.message}</p>
            )}
          </div>
        </div>
      </FormDialog>

      {/* ── Dialog แก้ไข ─────────────────────────────────────────────────────── */}
      <FormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`แก้ไขจำนวนนักเรียน: ${editTarget?.class_lev}`}
        onSubmit={editForm.handleSubmit((d) => editMutation.mutate(d))}
        loading={editMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>จำนวนนักเรียน (คน) *</Label>
            <Input
              type="number"
              min="0"
              {...editForm.register('st_count', { valueAsNumber: true })}
              placeholder="0"
            />
            {editForm.formState.errors.st_count && (
              <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.st_count.message}</p>
            )}
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
