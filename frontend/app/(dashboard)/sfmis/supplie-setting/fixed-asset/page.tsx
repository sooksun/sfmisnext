'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, TrendingDown } from 'lucide-react'
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

interface FixedAsset {
  fa_id: number
  fa_code: string
  fa_name: string
  fa_category: number
  fa_category_name: string
  fa_brand: string | null
  fa_model: string | null
  fa_serial_no: string | null
  acquired_date: string | null
  acquired_price: number
  useful_life_years: number
  accumulated_depreciation: number
  book_value: number
  location: string | null
  responsible_name: string | null
  source: number
  source_name: string
  status: number
  status_name: string
  warranty_end_date?: string | null
}

const CATEGORIES = [
  { value: 1, label: 'ครุภัณฑ์สำนักงาน' },
  { value: 2, label: 'คอมพิวเตอร์' },
  { value: 3, label: 'ยานพาหนะ' },
  { value: 4, label: 'ครุภัณฑ์การศึกษา' },
  { value: 5, label: 'อื่นๆ' },
]
const SOURCES = [
  { value: 1, label: 'งบประมาณ' },
  { value: 2, label: 'เงินรายได้สถานศึกษา' },
  { value: 3, label: 'เงินบริจาค' },
  { value: 4, label: 'โอนมา' },
]
const STATUSES: Record<number, { label: string; color: string }> = {
  1: { label: 'ใช้งาน', color: 'text-green-700' },
  2: { label: 'ชำรุด', color: 'text-red-700' },
  3: { label: 'ซ่อม', color: 'text-amber-700' },
  4: { label: 'จำหน่ายแล้ว', color: 'text-gray-500' },
  9: { label: 'ยกเลิก', color: 'text-gray-400' },
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

const PAGE_SIZE = 25

export default function FixedAssetPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [filterCat, setFilterCat] = useState(0)
  const [filterStatus, setFilterStatus] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FixedAsset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FixedAsset | null>(null)
  const [depYear, setDepYear] = useState(() => new Date().getFullYear() + 543)
  const [depOpen, setDepOpen] = useState(false)

  // form state
  const [form, setForm] = useState({
    fa_code: '', fa_name: '', fa_category: 1, fa_brand: '', fa_model: '',
    fa_serial_no: '', acquired_date: '', acquired_price: 0, useful_life_years: 5,
    salvage_value: 1, location: '', responsible_name: '', source: 1,
    warranty_end_date: '', note: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['fixed-asset', scId, page, filterCat, filterStatus],
    queryFn: () => apiGet<{ data: FixedAsset[]; count: number }>(
      `FixedAsset/load/${scId}/${page}/${PAGE_SIZE}?${filterCat ? `category=${filterCat}&` : ''}${filterStatus ? `status=${filterStatus}` : ''}`
    ),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []
  const total = data?.count ?? 0

  const saveMutation = useMutation({
    mutationFn: (f: typeof form) =>
      apiPost(editing ? 'FixedAsset/update' : 'FixedAsset/add', {
        ...f,
        sc_id: scId,
        up_by: adminId,
        ...(editing ? { fa_id: editing.fa_id } : {}),
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['fixed-asset'] })
        setDialogOpen(false)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const removeMutation = useMutation({
    mutationFn: (fa: FixedAsset) => apiPost('FixedAsset/remove', { fa_id: fa.fa_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['fixed-asset'] }) }
      else toast.error(res.ms)
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const depMutation = useMutation({
    mutationFn: () => apiPost('FixedAsset/calcDepreciation', { sc_id: scId, budget_year: depYear, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['fixed-asset'] }); setDepOpen(false) }
      else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    setForm({ fa_code: '', fa_name: '', fa_category: 1, fa_brand: '', fa_model: '',
      fa_serial_no: '', acquired_date: '', acquired_price: 0, useful_life_years: 5,
      salvage_value: 1, location: '', responsible_name: '', source: 1,
      warranty_end_date: '', note: '' })
    setDialogOpen(true)
  }

  function openEdit(fa: FixedAsset) {
    setEditing(fa)
    setForm({
      fa_code: fa.fa_code,
      fa_name: fa.fa_name,
      fa_category: fa.fa_category,
      fa_brand: fa.fa_brand ?? '',
      fa_model: fa.fa_model ?? '',
      fa_serial_no: fa.fa_serial_no ?? '',
      acquired_date: fa.acquired_date ? fa.acquired_date.substring(0, 10) : '',
      acquired_price: fa.acquired_price,
      useful_life_years: fa.useful_life_years,
      salvage_value: 1,
      location: fa.location ?? '',
      responsible_name: fa.responsible_name ?? '',
      source: fa.source,
      warranty_end_date: fa.warranty_end_date ? fa.warranty_end_date.substring(0, 10) : '',
      note: '',
    })
    setDialogOpen(true)
  }

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (fa: FixedAsset) => (
        <div className="flex gap-1">
          <Button size="sm" variant="warning" onClick={() => openEdit(fa)} title="แก้ไข">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(fa)} title="ลบ">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      headerClassName: 'w-20',
    },
    { header: 'เลขครุภัณฑ์', render: (fa: FixedAsset) => <span className="font-mono text-xs">{fa.fa_code}</span> },
    {
      header: 'รายการ',
      render: (fa: FixedAsset) => (
        <div>
          <div className="font-medium text-sm">{fa.fa_name}</div>
          <div className="text-xs text-gray-500">{fa.fa_category_name} · {fa.source_name}</div>
        </div>
      ),
    },
    { header: 'วันที่รับ', render: (fa: FixedAsset) => fmtDateTH(fa.acquired_date) },
    {
      header: 'ราคาทุน (บาท)',
      render: (fa: FixedAsset) => <span className="font-mono text-right block">{fmt(fa.acquired_price)}</span>,
    },
    {
      header: 'ค่าเสื่อมสะสม',
      render: (fa: FixedAsset) => <span className="font-mono text-right block text-amber-700">{fmt(fa.accumulated_depreciation)}</span>,
    },
    {
      header: 'มูลค่าสุทธิ',
      render: (fa: FixedAsset) => <span className="font-mono text-right block font-semibold text-blue-700">{fmt(fa.book_value)}</span>,
    },
    { header: 'สถานที่', render: (fa: FixedAsset) => <span className="text-xs">{fa.location ?? '-'}</span> },
    {
      header: 'สถานะ',
      render: (fa: FixedAsset) => {
        const s = STATUSES[fa.status] ?? { label: String(fa.status), color: '' }
        return <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
      },
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ทะเบียนครุภัณฑ์"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDepOpen(true)}>
              <TrendingDown className="h-4 w-4 mr-1" />คำนวณค่าเสื่อมราคา
            </Button>
            <Button onClick={openAdd} disabled={scId === 0}>
              <Plus className="h-4 w-4 mr-1" />เพิ่มครุภัณฑ์
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={filterCat}
            onChange={(e) => { setFilterCat(Number(e.target.value)); setPage(1) }}
          >
            <option value={0}>ทุกประเภท</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(Number(e.target.value)); setPage(1) }}
          >
            <option value={0}>ทุกสถานะ</option>
            {Object.entries(STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          total={total}
          page={page - 1}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => setPage(p + 1)}
          loading={isLoading}
        />
      </div>

      {/* Form Dialog เพิ่ม/แก้ไข */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขครุภัณฑ์' : 'เพิ่มครุภัณฑ์'}
        onSubmit={() => {
          if (!form.fa_name.trim()) { toast.error('กรุณาระบุชื่อครุภัณฑ์'); return }
          saveMutation.mutate(form)
        }}
        loading={saveMutation.isPending}
        size="lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขครุภัณฑ์ <span className="text-gray-400 text-xs">(ว่าง=ออกให้อัตโนมัติ)</span></Label>
              <Input value={form.fa_code} onChange={(e) => setForm({ ...form, fa_code: e.target.value })} placeholder="เช่น A01/2569/0001" />
            </div>
            <div>
              <Label>ประเภท *</Label>
              <select className="w-full border rounded-md h-9 px-2" value={form.fa_category}
                onChange={(e) => setForm({ ...form, fa_category: Number(e.target.value) })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>ชื่อครุภัณฑ์ *</Label>
            <Input value={form.fa_name} onChange={(e) => setForm({ ...form, fa_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>ยี่ห้อ</Label>
              <Input value={form.fa_brand} onChange={(e) => setForm({ ...form, fa_brand: e.target.value })} />
            </div>
            <div>
              <Label>รุ่น</Label>
              <Input value={form.fa_model} onChange={(e) => setForm({ ...form, fa_model: e.target.value })} />
            </div>
            <div>
              <Label>Serial No.</Label>
              <Input value={form.fa_serial_no} onChange={(e) => setForm({ ...form, fa_serial_no: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่ได้รับ</Label>
              <ThaiDatePicker value={form.acquired_date} onChange={(v) => setForm({ ...form, acquired_date: v })} />
            </div>
            <div>
              <Label>ราคาทุน (บาท) *</Label>
              <Input type="number" step="0.01" value={form.acquired_price}
                onChange={(e) => setForm({ ...form, acquired_price: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>อายุการใช้งาน (ปี)</Label>
              <Input type="number" min="1" value={form.useful_life_years}
                onChange={(e) => setForm({ ...form, useful_life_years: Number(e.target.value) })} />
            </div>
            <div>
              <Label>มูลค่าซาก (บาท)</Label>
              <Input type="number" step="0.01" value={form.salvage_value}
                onChange={(e) => setForm({ ...form, salvage_value: Number(e.target.value) })} />
            </div>
            <div>
              <Label>แหล่งที่มา</Label>
              <select className="w-full border rounded-md h-9 px-2" value={form.source}
                onChange={(e) => setForm({ ...form, source: Number(e.target.value) })}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>สถานที่ตั้ง</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>ผู้รับผิดชอบ</Label>
              <Input value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>วันหมดรับประกัน</Label>
            <ThaiDatePicker value={form.warranty_end_date} onChange={(v) => setForm({ ...form, warranty_end_date: v })} />
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
      </FormDialog>

      {/* Dialog คำนวณค่าเสื่อมราคา */}
      <FormDialog
        open={depOpen}
        onClose={() => setDepOpen(false)}
        title="คำนวณค่าเสื่อมราคาประจำปี"
        onSubmit={() => depMutation.mutate()}
        loading={depMutation.isPending}
        submitLabel="คำนวณ"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">คำนวณค่าเสื่อมราคา (Straight-Line) สำหรับครุภัณฑ์ทุกรายการที่ยังใช้งานอยู่</p>
          <div>
            <Label>ปีงบประมาณ (พ.ศ.) *</Label>
            <Input type="number" value={depYear} onChange={(e) => setDepYear(Number(e.target.value))} />
          </div>
          <p className="text-xs text-amber-600">ระบบจะคำนวณเฉพาะรายการที่ยังไม่มีการบันทึกค่าเสื่อมสำหรับปีที่เลือก</p>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMutation.mutate(deleteTarget)}
        title="ยืนยันการลบ"
        description={`ต้องการลบครุภัณฑ์ "${deleteTarget?.fa_name}" หรือไม่?`}
      />
    </div>
  )
}
