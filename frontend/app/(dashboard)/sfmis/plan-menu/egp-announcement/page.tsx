'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Globe, X, Archive, Trash2, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface Announcement {
  ea_id: number
  announce_type: number
  announce_type_name: string
  ref_no: string | null
  egp_ref: string | null
  announce_date: string | null
  title: string
  description: string | null
  estimated_price: number
  winner_name: string | null
  winning_price: number
  file_url: string | null
  egp_url: string | null
  status: number
  status_name: string
  plan_id: number | null
  order_id: number | null
  create_date: string | null
}

const ANNOUNCE_TYPES = [
  { value: 1, label: 'ประกาศแผนจัดซื้อ' },
  { value: 2, label: 'ประกาศราคากลาง' },
  { value: 3, label: 'ประกาศเชิญชวน' },
  { value: 4, label: 'ประกาศผู้ชนะ' },
  { value: 5, label: 'ประกาศยกเลิก' },
  { value: 6, label: 'ร่างขอบเขตงาน (TOR)' },
]
const STATUS_COLOR: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  9: 'bg-red-100 text-red-600',
}
const TYPE_COLOR: Record<number, string> = {
  1: 'bg-indigo-100 text-indigo-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-blue-100 text-blue-700',
  4: 'bg-green-100 text-green-700',
  5: 'bg-red-100 text-red-600',
  6: 'bg-purple-100 text-purple-700',
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function EgpAnnouncementPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const { yearData } = useAppContext()
  const budgetYear = yearData?.budget_date?.budget_year ?? new Date().getFullYear() + 543

  const [filterType, setFilterType] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [publishTarget, setPublishTarget] = useState<Announcement | null>(null)
  const [publishUrl, setPublishUrl] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Announcement | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const defaultForm = {
    announce_type: 1, ref_no: '', egp_ref: '',
    announce_date: new Date().toISOString().substring(0, 10),
    title: '', description: '', estimated_price: 0,
    winner_name: '', winning_price: 0, file_url: '', egp_url: '',
    plan_id: '', order_id: '', note: '',
  }
  const [form, setForm] = useState(defaultForm)

  const { data, isLoading } = useQuery({
    queryKey: ['egp-announce', scId, budgetYear, filterType],
    queryFn: () =>
      apiGet<{ data: Announcement[] }>(
        `EgpAnnouncement/load/${scId}/${budgetYear}${filterType ? `?type=${filterType}` : ''}`
      ),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  const saveMutation = useMutation({
    mutationFn: (f: typeof form) =>
      apiPost(editing ? 'EgpAnnouncement/update' : 'EgpAnnouncement/add', {
        ...f,
        sc_id: scId,
        budget_year: budgetYear,
        up_by: adminId,
        estimated_price: Number(f.estimated_price),
        winning_price: Number(f.winning_price),
        plan_id: f.plan_id ? Number(f.plan_id) : null,
        order_id: f.order_id ? Number(f.order_id) : null,
        ...(editing ? { ea_id: editing.ea_id } : {}),
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['egp-announce'] })
        setDialogOpen(false)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const publishMutation = useMutation({
    mutationFn: () =>
      apiPost('EgpAnnouncement/publish', { ea_id: publishTarget!.ea_id, egp_url: publishUrl || undefined, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['egp-announce'] })
        setPublishTarget(null)
        setPublishUrl('')
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const closeMutation = useMutation({
    mutationFn: (ea_id: number) => apiPost('EgpAnnouncement/close', { ea_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['egp-announce'] }) }
      else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiPost('EgpAnnouncement/cancel', { ea_id: cancelTarget!.ea_id, reason: cancelReason, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['egp-announce'] })
        setCancelTarget(null)
        setCancelReason('')
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const removeMutation = useMutation({
    mutationFn: (ea_id: number) => apiPost('EgpAnnouncement/remove', { ea_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['egp-announce'] }) }
      else toast.error(res.ms)
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(a: Announcement) {
    setEditing(a)
    setForm({
      announce_type: a.announce_type,
      ref_no: a.ref_no ?? '',
      egp_ref: a.egp_ref ?? '',
      announce_date: a.announce_date ? a.announce_date.substring(0, 10) : '',
      title: a.title,
      description: a.description ?? '',
      estimated_price: a.estimated_price,
      winner_name: a.winner_name ?? '',
      winning_price: a.winning_price,
      file_url: a.file_url ?? '',
      egp_url: a.egp_url ?? '',
      plan_id: String(a.plan_id ?? ''),
      order_id: String(a.order_id ?? ''),
      note: '',
    })
    setDialogOpen(true)
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (a: Announcement) => (
        <div className="flex flex-wrap gap-1">
          {a.status === 0 && (
            <>
              <Button size="sm" variant="warning" title="แก้ไข" onClick={() => openEdit(a)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-green-600 h-7" title="เผยแพร่"
                onClick={() => { setPublishTarget(a); setPublishUrl(a.egp_url ?? '') }}>
                <Globe className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" title="ลบ" onClick={() => setDeleteTarget(a)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          {a.status === 1 && (
            <>
              <Button size="sm" variant="outline" className="text-blue-600 h-7" title="ปิดประกาศ"
                onClick={() => closeMutation.mutate(a.ea_id)}>
                <Archive className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 h-7" title="ยกเลิก"
                onClick={() => { setCancelTarget(a); setCancelReason('') }}>
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      headerClassName: 'w-28',
    },
    {
      header: 'ประเภท',
      render: (a: Announcement) => (
        <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLOR[a.announce_type] ?? 'bg-gray-100'}`}>
          {a.announce_type_name}
        </span>
      ),
    },
    {
      header: 'หัวข้อประกาศ',
      render: (a: Announcement) => (
        <div>
          <div className="text-sm font-medium line-clamp-2">{a.title}</div>
          {a.ref_no && <div className="text-xs text-gray-500">เลขที่: {a.ref_no}</div>}
          {a.egp_ref && <div className="text-xs text-gray-500">e-GP: {a.egp_ref}</div>}
        </div>
      ),
    },
    { header: 'วันที่ประกาศ', render: (a: Announcement) => fmtDateTH(a.announce_date) },
    {
      header: 'ราคากลาง (บาท)',
      render: (a: Announcement) =>
        a.estimated_price > 0
          ? <span className="font-mono text-right block">{fmt(a.estimated_price)}</span>
          : <span className="text-gray-300">-</span>,
    },
    {
      header: 'ผู้ชนะ / ราคาที่ชนะ',
      render: (a: Announcement) =>
        a.winner_name ? (
          <div className="text-xs">
            <div>{a.winner_name}</div>
            <div className="font-mono text-green-700">{fmt(a.winning_price)} บาท</div>
          </div>
        ) : <span className="text-gray-300">-</span>,
    },
    {
      header: 'ลิงก์',
      render: (a: Announcement) =>
        a.egp_url ? (
          <a href={a.egp_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline">
            e-GP <ExternalLink className="h-3 w-3" />
          </a>
        ) : null,
    },
    {
      header: 'สถานะ',
      render: (a: Announcement) => (
        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[a.status] ?? 'bg-gray-100'}`}>
          {a.status_name}
        </span>
      ),
    },
  ], [closeMutation])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title={`ประกาศ e-GP ปีงบประมาณ ${budgetYear}`}
        actions={<Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4 mr-1" />สร้างประกาศ</Button>}
      />

      <div className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm" variant={filterType === 0 ? 'default' : 'outline'}
            onClick={() => setFilterType(0)}
          >ทั้งหมด ({rows.length})</Button>
          {ANNOUNCE_TYPES.map((t) => {
            const count = rows.filter((r) => r.announce_type === t.value).length
            if (count === 0) return null
            return (
              <Button
                key={t.value} size="sm"
                variant={filterType === t.value ? 'default' : 'outline'}
                onClick={() => setFilterType(t.value)}
              >{t.label} ({count})</Button>
            )
          })}
        </div>

        <DataTable
          columns={columns}
          data={filterType ? rows.filter((r) => r.announce_type === filterType) : rows}
          total={rows.length}
          page={0}
          pageSize={rows.length || 50}
          onPageChange={() => {}}
          loading={isLoading}
        />
      </div>

      {/* Form Dialog เพิ่ม/แก้ไข */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขประกาศ' : 'สร้างประกาศ'}
        onSubmit={() => {
          if (!form.title.trim()) { toast.error('กรุณาระบุหัวข้อประกาศ'); return }
          if (!form.announce_date) { toast.error('กรุณาระบุวันที่ประกาศ'); return }
          saveMutation.mutate(form)
        }}
        loading={saveMutation.isPending}
        size="lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทประกาศ *</Label>
              <select className="w-full border rounded-md h-9 px-2" value={form.announce_type}
                onChange={(e) => setForm({ ...form, announce_type: Number(e.target.value) })}>
                {ANNOUNCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>วันที่ประกาศ *</Label>
              <ThaiDatePicker value={form.announce_date} onChange={(v) => setForm({ ...form, announce_date: v })} />
            </div>
          </div>
          <div>
            <Label>หัวข้อประกาศ *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่เอกสาร</Label>
              <Input value={form.ref_no} onChange={(e) => setForm({ ...form, ref_no: e.target.value })} placeholder="เช่น ว.1234/2569" />
            </div>
            <div>
              <Label>เลขที่อ้างอิง e-GP</Label>
              <Input value={form.egp_ref} onChange={(e) => setForm({ ...form, egp_ref: e.target.value })} placeholder="เช่น 68017000000-1-0001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ราคากลาง / ราคาประมาณการ (บาท)</Label>
              <Input type="number" step="0.01" value={form.estimated_price}
                onChange={(e) => setForm({ ...form, estimated_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>ราคาที่ชนะการเสนอราคา (บาท)</Label>
              <Input type="number" step="0.01" value={form.winning_price}
                onChange={(e) => setForm({ ...form, winning_price: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>ชื่อผู้ชนะการเสนอราคา</Label>
            <Input value={form.winner_name} onChange={(e) => setForm({ ...form, winner_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ลิงก์ไฟล์แนบ (URL)</Label>
              <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>ลิงก์ e-GP (URL)</Label>
              <Input value={form.egp_url} onChange={(e) => setForm({ ...form, egp_url: e.target.value })} placeholder="https://process3.gprocurement.go.th/..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>อ้างอิงแผนจัดซื้อ (pp_id)</Label>
              <Input type="number" value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} />
            </div>
            <div>
              <Label>อ้างอิงใบขอซื้อ (order_id)</Label>
              <Input type="number" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} />
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Dialog เผยแพร่ */}
      <FormDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="เผยแพร่ประกาศ"
        onSubmit={() => publishMutation.mutate()}
        loading={publishMutation.isPending}
        submitLabel="เผยแพร่"
      >
        <div className="space-y-3">
          <p className="text-sm">เผยแพร่: <strong>{publishTarget?.title}</strong></p>
          <div>
            <Label>ลิงก์ e-GP (ถ้ามี)</Label>
            <Input value={publishUrl} onChange={(e) => setPublishUrl(e.target.value)}
              placeholder="https://process3.gprocurement.go.th/..." />
          </div>
          <p className="text-xs text-amber-600">เมื่อเผยแพร่แล้วจะไม่สามารถแก้ไขข้อมูลหลักได้</p>
        </div>
      </FormDialog>

      {/* Dialog ยกเลิก */}
      <FormDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="ยกเลิกประกาศ"
        onSubmit={() => {
          if (!cancelReason.trim()) { toast.error('กรุณาระบุเหตุผล'); return }
          cancelMutation.mutate()
        }}
        loading={cancelMutation.isPending}
        submitLabel="ยืนยันยกเลิก"
      >
        <div className="space-y-3">
          <p className="text-sm text-red-700">ยกเลิก: <strong>{cancelTarget?.title}</strong></p>
          <div>
            <Label>เหตุผล *</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMutation.mutate(deleteTarget.ea_id)}
        title="ยืนยันการลบ"
        description={`ต้องการลบประกาศ "${deleteTarget?.title}" หรือไม่?`}
      />
    </div>
  )
}
