'use client'
import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Play, Send, Lock, LayoutGrid, List as ListIcon, UserPlus, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { AttachmentPanel } from '@/components/shared/attachment-panel'
import { KanbanBoard, type KanbanTask } from '@/components/shared/kanban-board'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'
import type {
  ProjectWorkspaceData, ProjectTask, UserOption,
} from '@/lib/types'

const fmt = (n: number) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

type Tab = 'overview' | 'tasks' | 'budget' | 'evidence' | 'report'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'tasks', label: 'งาน' },
  { key: 'budget', label: 'งบประมาณ' },
  { key: 'evidence', label: 'หลักฐาน' },
  { key: 'report', label: 'รายงานผล' },
]

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const projectId = Number(id)
  const { scId, syId, adminId, budgetYear } = useAppContext()
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  const wsKey = ['workspace', projectId]
  const { data: ws, isLoading } = useQuery({
    queryKey: wsKey,
    queryFn: () => apiGet<ProjectWorkspaceData>(`projects/${projectId}/workspace`),
    enabled: projectId > 0,
  })

  const { data: userOpts } = useQuery({
    queryKey: ['user-options', scId],
    queryFn: () => apiGet<{ data: UserOption[] }>(`B_admin/load_user_options/${scId}`),
    enabled: scId > 0,
  })
  const users = userOpts?.data ?? []

  const refresh = () => {
    qc.invalidateQueries({ queryKey: wsKey })
    qc.invalidateQueries({ queryKey: ['projects-dashboard'] })
  }

  if (isLoading || !ws) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
  }

  const p = ws.project
  const isClosed = p.execution_status === 5

  return (
    <div className="flex flex-col flex-auto min-w-0">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <button
          onClick={() => router.push('/sfmis/plan-menu/projects')}
          className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3 w-3" /> กลับรายการโครงการ
        </button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{p.proj_name}</h1>
            <p className="text-sm text-gray-500">
              รหัส #{p.proj_id} · {p.execution_status_name}
              {p.owner_admin_id
                ? ` · เจ้าของ: ${ws.members.find((m) => m.project_role === 'owner')?.admin_name ?? p.proj_owner ?? '-'}`
                : ''}
              {p.end_date ? ` · สิ้นสุด ${fmtDateTH(p.end_date)}` : ''}
            </p>
          </div>
          <ExecutionActions ws={ws} onDone={refresh} />
        </div>

        {/* Summary cards */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniCard label="ความก้าวหน้า" value={`${p.progress_percent}%`} />
          <MiniCard label="งานค้าง" value={String(ws.tasks.filter((t) => [1, 2, 3, 5].includes(t.status)).length)} />
          <MiniCard label="งบคงเหลือ" value={fmt(ws.budget.remaining)} />
          <MiniCard label="หลักฐาน" value={String(ws.evidence_count)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b bg-white px-4 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm ${tab === t.key ? 'border-indigo-600 font-medium text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'overview' && <OverviewTab ws={ws} users={users} onDone={refresh} readOnly={isClosed} />}
        {tab === 'tasks' && <TasksTab ws={ws} users={users} onDone={refresh} readOnly={isClosed} scId={scId} syId={syId} />}
        {tab === 'budget' && <BudgetTab ws={ws} onDone={refresh} readOnly={isClosed} />}
        {tab === 'evidence' && <EvidenceTab projectId={projectId} scId={scId} readOnly={isClosed} />}
        {tab === 'report' && <ReportTab projectId={projectId} ws={ws} scId={scId} syId={syId} budgetYear={budgetYear} adminId={adminId} onDone={refresh} />}
      </div>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
      <p className="text-base font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

// ───────────────────────── Execution actions ─────────────────────────

function ExecutionActions({ ws, onDone }: { ws: ProjectWorkspaceData; onDone: () => void }) {
  const p = ws.project
  const mut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPatch<{ flag: boolean; ms: string }>(`projects/${p.proj_id}/execution`, body),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone() }
      else toast.error(res?.ms || 'ไม่สำเร็จ')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'),
  })
  const closeMut = useMutation({
    mutationFn: () => apiPost<{ flag: boolean; ms: string }>(`projects/${p.proj_id}/close`, {}),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone() }
      else toast.error(res?.ms || 'ปิดโครงการไม่สำเร็จ')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'ปิดโครงการไม่สำเร็จ'),
  })

  if (p.execution_status === 5) {
    return <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">ปิดโครงการแล้ว</span>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {(p.execution_status === 1 || p.execution_status === 2) && (
        <Button size="sm" onClick={() => mut.mutate({ execution_status: 3 })} disabled={mut.isPending}>
          <Play className="h-4 w-4" /> เริ่มดำเนินงาน
        </Button>
      )}
      {(p.execution_status === 3 || p.execution_status === 6) && (
        <Button size="sm" variant="warning" onClick={() => mut.mutate({ execution_status: 4 })} disabled={mut.isPending}>
          <Send className="h-4 w-4" /> ส่งตรวจสรุป
        </Button>
      )}
      {p.execution_status === 4 && (
        <Button size="sm" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
          <Lock className="h-4 w-4" /> ปิดโครงการ
        </Button>
      )}
    </div>
  )
}

// ───────────────────────── Overview tab ─────────────────────────

function OverviewTab({
  ws, users, onDone, readOnly,
}: { ws: ProjectWorkspaceData; users: UserOption[]; onDone: () => void; readOnly: boolean }) {
  const p = ws.project
  const [form, setForm] = useState({
    owner_admin_id: p.owner_admin_id ?? 0,
    start_date: p.start_date ?? '',
    end_date: p.end_date ?? '',
    expected_output: p.expected_output ?? '',
    success_indicator: p.success_indicator ?? '',
  })
  const [memberOpen, setMemberOpen] = useState(false)
  const [delMember, setDelMember] = useState<number | null>(null)

  const save = useMutation({
    mutationFn: () =>
      apiPatch<{ flag: boolean; ms: string }>(`projects/${p.proj_id}/execution`, {
        owner_admin_id: form.owner_admin_id || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        expected_output: form.expected_output,
        success_indicator: form.success_indicator,
      }),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone() }
      else toast.error(res?.ms || 'ไม่สำเร็จ')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'),
  })

  const removeMember = useMutation({
    mutationFn: (memberId: number) =>
      apiDelete<{ flag: boolean; ms: string }>(`projects/${p.proj_id}/members/${memberId}`),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone() } else toast.error(res?.ms || 'ไม่สำเร็จ')
      setDelMember(null)
    },
    onError: () => { toast.error('เกิดข้อผิดพลาด'); setDelMember(null) },
  })

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ข้อมูลดำเนินงาน */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-700">ข้อมูลการดำเนินงาน</h3>
        <div className="space-y-3">
          <div>
            <Label>เจ้าของโครงการ</Label>
            <Select
              value={form.owner_admin_id ? String(form.owner_admin_id) : ''}
              onValueChange={(v) => setForm((f) => ({ ...f, owner_admin_id: Number(v) }))}
              disabled={readOnly}
            >
              <SelectTrigger><SelectValue placeholder="เลือกเจ้าของโครงการ" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่เริ่ม</Label>
              <ThaiDatePicker value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <ThaiDatePicker value={form.end_date} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
            </div>
          </div>
          <div>
            <Label>ผลผลิตที่คาดหวัง</Label>
            <Input value={form.expected_output} onChange={(e) => setForm((f) => ({ ...f, expected_output: e.target.value }))} disabled={readOnly} />
          </div>
          <div>
            <Label>ตัวชี้วัดความสำเร็จ</Label>
            <Input value={form.success_indicator} onChange={(e) => setForm((f) => ({ ...f, success_indicator: e.target.value }))} disabled={readOnly} />
          </div>
          {!readOnly && (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>บันทึก</Button>
          )}
        </div>
      </div>

      {/* ทีมโครงการ */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">ทีมโครงการ</h3>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setMemberOpen(true)}>
              <UserPlus className="h-3 w-3" /> เพิ่มสมาชิก
            </Button>
          )}
        </div>
        {ws.members.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีสมาชิก</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ws.members.map((m) => (
              <li key={m.member_id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-800">{m.admin_name}</p>
                  <p className="text-xs text-gray-500">
                    {m.project_role === 'owner' ? 'เจ้าของโครงการ' : m.project_role === 'reviewer' ? 'ผู้ตรวจ/รับทราบ' : 'ผู้ร่วมโครงการ'}
                    {m.role_name ? ` · ${m.role_name}` : ''}
                  </p>
                </div>
                {!readOnly && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDelMember(m.member_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddMemberDialog
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        projectId={p.proj_id}
        users={users}
        onDone={onDone}
      />
      <ConfirmDialog
        open={delMember !== null}
        onConfirm={() => delMember !== null && removeMember.mutate(delMember)}
        onCancel={() => setDelMember(null)}
        title="นำสมาชิกออก"
        description="ต้องการนำสมาชิกรายนี้ออกจากโครงการหรือไม่?"
        confirmLabel="นำออก"
        variant="destructive"
      />
    </div>
  )
}

function AddMemberDialog({
  open, onClose, projectId, users, onDone,
}: { open: boolean; onClose: () => void; projectId: number; users: UserOption[]; onDone: () => void }) {
  const [adminId, setAdminId] = useState(0)
  const [role, setRole] = useState('member')
  const [roleName, setRoleName] = useState('')

  const add = useMutation({
    mutationFn: () =>
      apiPost<{ flag: boolean; ms: string }>(`projects/${projectId}/members`, {
        admin_id: adminId, project_role: role, role_name: roleName || undefined,
      }),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone(); onClose(); setAdminId(0); setRoleName('') }
      else toast.error(res?.ms || 'ไม่สำเร็จ')
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="เพิ่มสมาชิกโครงการ"
      onSubmit={() => { if (!adminId) { toast.error('เลือกผู้ใช้'); return } add.mutate() }}
      loading={add.isPending}
    >
      <div className="space-y-3">
        <div>
          <Label>ผู้ใช้ *</Label>
          <Select value={adminId ? String(adminId) : ''} onValueChange={(v) => setAdminId(Number(v))}>
            <SelectTrigger><SelectValue placeholder="เลือกผู้ใช้" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>บทบาทในโครงการ</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">เจ้าของโครงการ</SelectItem>
              <SelectItem value="member">ผู้ร่วมโครงการ</SelectItem>
              <SelectItem value="reviewer">ผู้ตรวจ/รับทราบ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>ชื่อบทบาท (ไม่บังคับ)</Label>
          <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="เช่น ผู้ประสานงาน" />
        </div>
      </div>
    </FormDialog>
  )
}

// ───────────────────────── Tasks tab ─────────────────────────

function TasksTab({
  ws, users, onDone, readOnly, scId, syId,
}: {
  ws: ProjectWorkspaceData; users: UserOption[]; onDone: () => void; readOnly: boolean; scId: number; syId: number
}) {
  const projectId = ws.project.proj_id
  const [listView, setListView] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectTask | null>(null)
  const [delTask, setDelTask] = useState<ProjectTask | null>(null)

  const empty = { title: '', detail: '', assignee_admin_id: 0, due_date: '', weight: 1, evidence_required: 0 }
  const [form, setForm] = useState(empty)

  const statusMut = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: number }) =>
      apiPatch<{ flag: boolean; ms: string }>(`projects/${projectId}/tasks/${taskId}`, { status }),
    onSuccess: (res) => {
      if (res?.flag) onDone()
      else { toast.error(res?.ms || 'เปลี่ยนสถานะไม่สำเร็จ'); onDone() }
    },
    onError: (e: unknown) => { toast.error(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ'); onDone() },
  })

  const saveTask = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title, detail: form.detail || undefined,
        assignee_admin_id: form.assignee_admin_id || undefined,
        due_date: form.due_date || undefined,
        weight: Number(form.weight) || 1,
        evidence_required: form.evidence_required ? 1 : 0,
      }
      if (editing) return apiPatch(`projects/${projectId}/tasks/${editing.task_id}`, body)
      return apiPost(`projects/${projectId}/tasks`, { ...body, sy_id: syId })
    },
    onSuccess: (res: unknown) => {
      const r = res as { flag?: boolean; ms?: string }
      if (r?.flag) { toast.success('บันทึกงานแล้ว'); onDone(); setDialogOpen(false) }
      else toast.error(r?.ms || 'ไม่สำเร็จ')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'),
  })

  const removeTask = useMutation({
    mutationFn: (taskId: number) => apiDelete<{ flag: boolean; ms: string }>(`projects/${projectId}/tasks/${taskId}`),
    onSuccess: (res) => { if (res?.flag) { toast.success('ลบงานแล้ว'); onDone() } else toast.error(res?.ms || ''); setDelTask(null) },
    onError: () => { toast.error('เกิดข้อผิดพลาด'); setDelTask(null) },
  })

  function openAdd() { setEditing(null); setForm(empty); setDialogOpen(true) }
  function openEdit(t: KanbanTask) {
    const full = ws.tasks.find((x) => x.task_id === t.task_id)
    if (!full) return
    setEditing(full)
    setForm({
      title: full.title, detail: full.detail ?? '',
      assignee_admin_id: full.assignee_admin_id ?? 0,
      due_date: full.due_date ?? '', weight: full.weight,
      evidence_required: full.evidence_required,
    })
    setDialogOpen(true)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-md border bg-white p-0.5">
          <button onClick={() => setListView(false)} className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${!listView ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
          <button onClick={() => setListView(true)} className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${listView ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
            <ListIcon className="h-4 w-4" /> รายการ
          </button>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> เพิ่มงาน</Button>
        )}
      </div>

      <KanbanBoard
        tasks={ws.tasks as KanbanTask[]}
        listView={listView}
        onStatusChange={(taskId, status) => !readOnly && statusMut.mutate({ taskId, status })}
        onEdit={readOnly ? undefined : openEdit}
        onDelete={readOnly ? undefined : (t) => { const full = ws.tasks.find((x) => x.task_id === t.task_id); if (full) setDelTask(full) }}
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขงาน' : 'เพิ่มงาน'}
        onSubmit={() => { if (!form.title.trim()) { toast.error('กรอกชื่องาน'); return } saveTask.mutate() }}
        loading={saveTask.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ชื่องาน *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Input value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ผู้รับผิดชอบ</Label>
              <Select value={form.assignee_admin_id ? String(form.assignee_admin_id) : ''} onValueChange={(v) => setForm((f) => ({ ...f, assignee_admin_id: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="เลือกผู้รับผิดชอบ" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>วันครบกำหนด</Label>
              <ThaiDatePicker value={form.due_date} onChange={(v) => setForm((f) => ({ ...f, due_date: v }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>น้ำหนักงาน (1-100)</Label>
              <Input type="number" min={1} max={100} value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form.evidence_required} onChange={(e) => setForm((f) => ({ ...f, evidence_required: e.target.checked ? 1 : 0 }))} />
                ต้องมีหลักฐานก่อนปิดงาน
              </label>
            </div>
          </div>
          {editing && editing.evidence_required === 1 && (
            <div className="rounded border border-gray-100 bg-gray-50 p-2">
              <p className="mb-1 text-xs text-gray-500">หลักฐานของงานนี้</p>
              <AttachmentPanel refType="project_task" refId={editing.task_id} scId={scId} title="หลักฐานงาน" />
            </div>
          )}
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!delTask}
        onConfirm={() => delTask && removeTask.mutate(delTask.task_id)}
        onCancel={() => setDelTask(null)}
        title="ลบงาน"
        description={`ต้องการลบงาน "${delTask?.title}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}

// ───────────────────────── Budget tab ─────────────────────────

const ORDER_STATUS: Record<number, string> = {
  0: 'ทบทวน', 1: 'รออนุมัติ (แผน)', 2: 'แผน', 3: 'การเงิน', 4: 'พัสดุ',
  5: 'ผอ.', 6: 'ตั้งกรรมการ', 7: 'จัดซื้อ', 8: 'สำเร็จ', 9: 'ยกเลิก',
}

function BudgetTab({ ws, onDone, readOnly }: { ws: ProjectWorkspaceData; onDone: () => void; readOnly: boolean }) {
  const b = ws.budget
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ project_type: 1, details: '', budgets: 0 })

  const create = useMutation({
    mutationFn: () =>
      apiPost<{ flag: boolean; ms: string }>(`projects/${ws.project.proj_id}/procurements`, {
        project_type: form.project_type,
        details: form.details || undefined,
        budgets: Number(form.budgets) || 0,
      }),
    onSuccess: (res) => {
      if (res?.flag) { toast.success(res.ms); onDone(); setOpen(false); setForm({ project_type: 1, details: '', budgets: 0 }) }
      else toast.error(res?.ms || 'ไม่สำเร็จ')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BudgetCard label="งบอนุมัติ" value={b.allocated} color="text-gray-800" />
        <BudgetCard label="ผูกพัน" value={b.committed} color="text-amber-600" />
        <BudgetCard label="ใช้จริง" value={b.actual} color="text-blue-600" />
        <BudgetCard label="คงเหลือ" value={b.remaining} color={b.remaining < 0 ? 'text-red-600' : 'text-green-600'} />
      </div>
      {b.over_threshold && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ ใช้จริง + ผูกพันรวม {b.used_percent}% ของงบ (เกิน 80%)
        </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">รายการจัดซื้อ/จัดจ้าง ({b.orders.length} ครั้ง)</h3>
          {!readOnly && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> สร้างรายการจัดซื้อ/จัดจ้าง
            </Button>
          )}
        </div>
        {b.orders.length === 0 ? (
          <p className="py-3 text-center text-sm text-gray-400">ยังไม่มีรายการจัดซื้อ/จัดจ้างในโครงการนี้</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {b.orders.map((o) => (
              <li key={o.order_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">คำสั่งซื้อ #{o.order_id}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {ORDER_STATUS[o.order_status] ?? o.order_status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-800">{fmt(o.budgets)} บาท</span>
                  <button
                    onClick={() => router.push('/sfmis/plan-menu/proj-approve')}
                    className="text-indigo-600 hover:underline"
                  >
                    ดำเนินการ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-400">
          1 โครงการสร้างรายการจัดซื้อ/จัดจ้างได้หลายครั้ง — ยอดใช้จริง/ผูกพันรวมจากทุกใบโดยอัตโนมัติ
          (แก้ยอดผ่าน workflow จัดซื้อ/การเงินเท่านั้น)
        </p>
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="สร้างรายการจัดซื้อ/จัดจ้าง"
        onSubmit={() => create.mutate()}
        loading={create.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ประเภท</Label>
            <Select value={String(form.project_type)} onValueChange={(v) => setForm((f) => ({ ...f, project_type: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">จัดซื้อ</SelectItem>
                <SelectItem value="2">จัดจ้าง</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Input value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} placeholder="เว้นว่าง = ใช้ชื่อโครงการ" />
          </div>
          <div>
            <Label>วงเงิน (บาท)</Label>
            <Input type="number" min={0} step="0.01" value={form.budgets} onChange={(e) => setForm((f) => ({ ...f, budgets: Number(e.target.value) }))} />
          </div>
          <p className="text-xs text-gray-500">
            ระบบจะสร้างใบจัดซื้อใหม่และส่งเข้าขั้นตอนอนุมัติ (หน้า "อนุมัติโครงการ") โดยอัตโนมัติ
          </p>
        </div>
      </FormDialog>
    </div>
  )
}

function BudgetCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

// ───────────────────────── Evidence tab ─────────────────────────

function EvidenceTab({ projectId, scId, readOnly }: { projectId: number; scId: number; readOnly: boolean }) {
  return (
    <div className="space-y-4">
      <AttachmentPanel refType="project" refId={projectId} scId={scId} title="หลักฐานโครงการ" readOnly={readOnly} category="โครงการ" />
      <p className="text-xs text-gray-400">
        หลักฐานของงานย่อยและจัดซื้อ ดูได้ในแท็บ "งาน" และเอกสารจัดซื้อตามลำดับ
      </p>
    </div>
  )
}

// ───────────────────────── Report tab ─────────────────────────

interface FollowupRow {
  pf_id: number
  report_period: number
  report_period_name: string
  report_date: string
  percent_complete: number
  actual_amount: number
  outcome: string | null
  status: number
  status_name: string
}

function ReportTab({
  projectId, ws, scId, syId, budgetYear, adminId, onDone,
}: {
  projectId: number; ws: ProjectWorkspaceData; scId: number; syId: number; budgetYear: number; adminId: number; onDone: () => void
}) {
  const qc = useQueryClient()
  const fKey = ['followup', projectId]
  const { data: list } = useQuery({
    queryKey: fKey,
    queryFn: () => apiGet<FollowupRow[]>(`ProjectFollowup/load/${projectId}`),
    enabled: projectId > 0,
  })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    report_period: 1,
    report_date: '',
    percent_complete: ws.project.progress_percent,
    actual_amount: ws.budget.actual,
    outcome: '',
  })

  const add = useMutation({
    mutationFn: () =>
      apiPost<{ flag: boolean; ms: string }>('ProjectFollowup/add', {
        project_id: projectId, sc_id: scId, sy_id: syId, budget_year: budgetYear,
        report_period: form.report_period, report_date: form.report_date,
        percent_complete: form.percent_complete, actual_amount: form.actual_amount,
        outcome: form.outcome || undefined, status: 2, reported_by: adminId,
      }),
    onSuccess: (res) => {
      if (res?.flag) {
        toast.success(res.ms); qc.invalidateQueries({ queryKey: fKey }); onDone(); setOpen(false)
      } else toast.error(res?.ms || 'ไม่สำเร็จ')
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setForm({
      report_period: 1, report_date: '',
      percent_complete: ws.project.progress_percent,
      actual_amount: ws.budget.actual, outcome: '',
    })
    setOpen(true)
  }

  const rows = list ?? []
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> เพิ่มรายงานผล</Button>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">ยังไม่มีรายงานผล</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-sm text-blue-900">
              <tr>
                <th className="px-4 py-2 text-left">ช่วงรายงาน</th>
                <th className="px-4 py-2 text-left">วันที่</th>
                <th className="px-4 py-2 text-right">ก้าวหน้า</th>
                <th className="px-4 py-2 text-right">ใช้จริงสะสม</th>
                <th className="px-4 py-2 text-left">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {rows.map((r) => (
                <tr key={r.pf_id}>
                  <td className="px-4 py-2">{r.report_period_name}</td>
                  <td className="px-4 py-2">{fmtDateTH(r.report_date)}</td>
                  <td className="px-4 py-2 text-right">{r.percent_complete}%</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(r.actual_amount)}</td>
                  <td className="px-4 py-2">{r.status_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มรายงานผล"
        onSubmit={() => { if (!form.report_date) { toast.error('เลือกวันที่รายงาน'); return } add.mutate() }}
        loading={add.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>ช่วงรายงาน</Label>
            <Select value={String(form.report_period)} onValueChange={(v) => setForm((f) => ({ ...f, report_period: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ไตรมาส 1</SelectItem>
                <SelectItem value="2">ไตรมาส 2</SelectItem>
                <SelectItem value="3">ไตรมาส 3</SelectItem>
                <SelectItem value="4">ไตรมาส 4</SelectItem>
                <SelectItem value="5">สรุปปลายปี</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>วันที่รายงาน *</Label>
            <ThaiDatePicker value={form.report_date} onChange={(v) => setForm((f) => ({ ...f, report_date: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ความก้าวหน้า (%)</Label>
              <Input type="number" value={form.percent_complete} onChange={(e) => setForm((f) => ({ ...f, percent_complete: Number(e.target.value) }))} />
              <p className="mt-0.5 text-xs text-gray-400">ดึงอัตโนมัติจากงาน</p>
            </div>
            <div>
              <Label>ใช้จริงสะสม (บาท)</Label>
              <Input type="number" value={form.actual_amount} onChange={(e) => setForm((f) => ({ ...f, actual_amount: Number(e.target.value) }))} />
              <p className="mt-0.5 text-xs text-gray-400">ดึงจากการเงิน</p>
            </div>
          </div>
          <div>
            <Label>ผลลัพธ์/สรุป</Label>
            <Input value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
