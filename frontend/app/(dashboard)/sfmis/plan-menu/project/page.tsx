'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { toBE, fmtDateTH } from '@/lib/utils'
import type { UserOption } from '@/lib/types'
import { AiProjectDialog, type AiParsedFields } from './ai-project-dialog'

// ── Types ─────────────────────────────────────────────────────────────────────
// field names ตรงกับสิ่งที่ backend project.service.ts map ออกมา

interface ProjectRow {
  proj_id: number
  project_code: string       // auto-gen PROJ-XXXXXX จาก backend
  proj_name: string
  proj_detail: string | null
  proj_policy: string | null
  policies?: { scp_id: number; sp_name: string }[]
  policy_ids?: number[]
  proj_budget_type: string | null
  proj_owner: string | null
  owner_admin_id: number | null
  proj_budget: number
  proj_status: number
  sc_id: number
  sy_id: number
  budget_year: number | null
  start_date: string | null
  end_date: string | null
  sy_year: number | null
  semester: number | null
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
  proj_name:        z.string().min(1, 'กรุณากรอกชื่อโครงการ'),
  proj_detail:      z.string().optional(),
  proj_budget_type: z.string().optional(),
  proj_budget:      z.number().min(0, 'กรุณากรอกวงเงิน'),
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
  const { scId, adminId, syId, budgetYear, syYear } = useAppContext()
  const userId = adminId
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null)
  const [editing, setEditing] = useState<ProjectRow | null>(null)
  // นโยบายหลายข้อ (scp_id) + ผู้รับผิดชอบ (admin_id) จัดการแยกจาก RHF
  const [policyIds, setPolicyIds] = useState<number[]>([])
  const [ownerAdminId, setOwnerAdminId] = useState<number>(0)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [aiOpen, setAiOpen] = useState(false)

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

  // ── Dropdown sources: นโยบายโรงเรียน + ประเภทเงิน ─────────────────────────
  const { data: policyData } = useQuery({
    queryKey: ['school-policy-list', scId],
    queryFn: () =>
      apiGet<{ data: { sp_id: number; sp_name: string }[] }>(
        `B_school_policy/load_school_policy/${scId}/0/500`,
      ),
    enabled: scId > 0,
  })
  const policyList = policyData?.data ?? []

  // ประเภทเงินที่ "กำหนดรายหัวได้" (ตั้งค่าหน้า 1.4 ตั้งค่าเงินรายหัว) — perhead === 1
  const { data: moneyTypeData } = useQuery({
    queryKey: ['perhead-budget-types', scId],
    queryFn: () =>
      apiGet<{ bg_type_id: number; budget_type: string; perhead: number }[]>(
        `Student/loadPerheadBudgetTypes/${scId}`,
      ),
    enabled: scId > 0,
  })
  const moneyTypeList = (Array.isArray(moneyTypeData) ? moneyTypeData : []).filter(
    (m) => m.perhead === 1,
  )

  // ผู้ใช้ในโรงเรียน (สำหรับเลือกผู้รับผิดชอบ — ผูกกับโรงเรียน)
  const { data: userData } = useQuery({
    queryKey: ['user-options', scId],
    queryFn: () => apiGet<{ data: UserOption[] }>(`B_admin/load_user_options/${scId}`),
    enabled: scId > 0,
  })
  const userList = userData?.data ?? []

  function togglePolicy(id: number) {
    setPolicyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { proj_name: '', proj_detail: '', proj_budget_type: '', proj_budget: 0 },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (form: ProjectForm) => {
      const payload = {
        ...form,
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        owner_admin_id: ownerAdminId || undefined,
        policy_ids: policyIds,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        up_by: userId,
      }
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
    reset({ proj_name: '', proj_detail: '', proj_budget_type: '', proj_budget: 0 })
    setPolicyIds([])
    setOwnerAdminId(0)
    setStartDate('')
    setEndDate('')
    setDialogOpen(true)
  }

  function openEdit(item: ProjectRow) {
    setEditing(item)
    reset({
      proj_name:        item.proj_name ?? '',
      proj_detail:      item.proj_detail ?? '',
      proj_budget_type: item.proj_budget_type ?? '',
      proj_budget:      Number(item.proj_budget),
    })
    setPolicyIds(item.policy_ids ?? [])
    setOwnerAdminId(item.owner_admin_id ?? 0)
    setStartDate(item.start_date ?? '')
    setEndDate(item.end_date ?? '')
    setDialogOpen(true)
  }

  // นำผลที่ AI สกัดได้ มาเติมในฟอร์ม (ผู้ใช้ตรวจ/แก้ก่อนบันทึก)
  function applyAi(f: AiParsedFields) {
    if (f.proj_name != null) setValue('proj_name', f.proj_name, { shouldValidate: true })
    if (f.proj_detail != null) setValue('proj_detail', f.proj_detail)
    if (f.proj_budget != null) setValue('proj_budget', f.proj_budget, { shouldValidate: true })
    if (f.proj_budget_type != null) setValue('proj_budget_type', f.proj_budget_type)
    if (Array.isArray(f.policy_ids)) setPolicyIds(f.policy_ids)
    if (f.start_date != null) setStartDate(f.start_date)
    if (f.end_date != null) setEndDate(f.end_date)
    setAiOpen(false)
    toast.success('นำข้อมูลจาก AI มากรอกฟอร์มแล้ว — ตรวจสอบและกดบันทึก')
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo(() => [
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
          {item.policies && item.policies.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.policies.map((p) => (
                <span key={p.scp_id} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">
                  {p.sp_name}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'ผู้รับผิดชอบ',
      render: (item: ProjectRow) => (
        <span className="text-sm text-gray-700">{item.proj_owner || '-'}</span>
      ),
    },
    {
      header: 'ช่วงเวลา',
      render: (item: ProjectRow) =>
        item.start_date || item.end_date ? (
          <span className="text-xs text-gray-600">
            {item.start_date ? fmtDateTH(item.start_date) : '—'}
            {' – '}
            {item.end_date ? fmtDateTH(item.end_date) : '—'}
          </span>
        ) : (
          <span className="text-xs text-gray-400">ยังไม่กำหนด</span>
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
  ], [])

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
      <ProcessFlow flow="plan" />
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
        size="2xl"
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              สร้างโครงการด้วย AI
            </Button>
          </div>
          <div>
            <Label>ชื่อโครงการ *</Label>
            <Input {...register('proj_name')} placeholder="ชื่อโครงการ" />
            {errors.proj_name && (
              <p className="text-red-500 text-xs mt-1">{errors.proj_name.message}</p>
            )}
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Textarea {...register('proj_detail')} rows={4} placeholder="รายละเอียดโครงการ (ไม่บังคับ)" />
          </div>
          <div>
            <Label>สอดคล้องกับนโยบายโรงเรียน (เลือกได้หลายข้อ)</Label>
            {policyList.length === 0 ? (
              <p className="rounded border border-dashed border-gray-200 p-2 text-xs text-gray-400">
                ยังไม่มีนโยบายโรงเรียน (เพิ่มที่หน้านโยบายโรงเรียน)
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
                {policyList.map((p) => (
                  <label key={p.sp_id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={policyIds.includes(p.sp_id)}
                      onChange={() => togglePolicy(p.sp_id)}
                    />
                    <span>{p.sp_name}</span>
                  </label>
                ))}
              </div>
            )}
            {policyIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">เลือกแล้ว {policyIds.length} ข้อ</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทงบประมาณที่ใช้</Label>
              <Select
                value={watch('proj_budget_type') || ''}
                onValueChange={(v) => setValue('proj_budget_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทเงิน" />
                </SelectTrigger>
                <SelectContent>
                  {moneyTypeList.map((m) => (
                    <SelectItem key={m.bg_type_id} value={m.budget_type}>{m.budget_type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ผู้รับผิดชอบโครงการ</Label>
              <Select
                value={ownerAdminId ? String(ownerAdminId) : ''}
                onValueChange={(v) => setOwnerAdminId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
                </SelectTrigger>
                <SelectContent>
                  {userList.map((u) => (
                    <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่เริ่มต้นโครงการ</Label>
              <ThaiDatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <Label>วันที่สิ้นสุดโครงการ</Label>
              <ThaiDatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>
          <div className="rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-500">
            ผูกกับ: โรงเรียนปัจจุบัน · ปีการศึกษา {toBE(syYear)} · ปีงบประมาณ {toBE(budgetYear)}
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

      {/* ── AI: สร้างโครงการด้วย AI ─────────────────────────────────────────── */}
      <AiProjectDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        scId={scId}
        syId={syId}
        budgetYear={budgetYear}
        policies={policyList.map((p) => ({ scp_id: p.sp_id, name: p.sp_name }))}
        budgetTypes={moneyTypeList.map((m) => m.budget_type)}
        onApply={applyAi}
      />

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
