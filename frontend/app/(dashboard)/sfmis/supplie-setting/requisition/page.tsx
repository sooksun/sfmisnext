'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Send, CheckCircle, XCircle, PackageCheck, Trash2 } from 'lucide-react'
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

interface ReqRow {
  req_id: number
  req_no: string | null
  req_date: string | null
  requester_name: string | null
  department: string | null
  purpose: string | null
  status: number
  status_name: string
  create_date: string | null
}

interface Supplie {
  supp_id: number
  supp_name: string
  supp_no: string
}

interface DetailLine {
  supp_id: number | null
  supp_name?: string
  req_qty: number
  note: string
}

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600' },
  1: { label: 'ส่งคำขอ', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700' },
  3: { label: 'เบิกจ่ายแล้ว', color: 'bg-emerald-100 text-emerald-700' },
  9: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
}

const PAGE_SIZE = 25

export default function RequisitionPage() {
  const { scId, adminId, userType } = useAppContext()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ReqRow | null>(null)
  const [details, setDetails] = useState<DetailLine[]>([{ supp_id: null, req_qty: 1, note: '' }])
  const [issueTarget, setIssueTarget] = useState<ReqRow | null>(null)
  const [issueLines, setIssueLines] = useState<{ rqd_id: number; supp_name: string; req_qty: number; issued_qty: number }[]>([])
  const [rejectTarget, setRejectTarget] = useState<ReqRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState<ReqRow | null>(null)

  const [form, setForm] = useState({
    req_no: '', req_date: new Date().toISOString().substring(0, 10),
    requester_name: '', department: '', purpose: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['supplie-req', scId, page],
    queryFn: () => apiGet<{ data: ReqRow[]; count: number }>(`SupplieRequest/load/${scId}/${page}/${PAGE_SIZE}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []
  const total = data?.count ?? 0

  const { data: suppliesData } = useQuery({
    queryKey: ['supplies-list', scId],
    queryFn: () => apiGet<{ data: Supplie[] }>(`General_db/load_supplies/${scId}/1/999`),
    enabled: scId > 0,
  })
  const supplies: Supplie[] = suppliesData?.data ?? []

  const saveMutation = useMutation({
    mutationFn: (f: typeof form) =>
      apiPost(editing ? 'SupplieRequest/update' : 'SupplieRequest/add', {
        ...f,
        sc_id: scId,
        up_by: adminId,
        details: details.filter((d) => d.supp_id),
        ...(editing ? { req_id: editing.req_id } : {}),
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['supplie-req'] })
        setDialogOpen(false)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const submitMutation = useMutation({
    mutationFn: (req_id: number) => apiPost('SupplieRequest/submit', { req_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['supplie-req'] }) }
      else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const approveMutation = useMutation({
    mutationFn: (req_id: number) => apiPost('SupplieRequest/approve', { req_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['supplie-req'] }) }
      else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => apiPost('SupplieRequest/reject', { req_id: rejectTarget!.req_id, reason: rejectReason, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['supplie-req'] })
        setRejectTarget(null)
        setRejectReason('')
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const issueMutation = useMutation({
    mutationFn: () =>
      apiPost('SupplieRequest/issue', {
        req_id: issueTarget!.req_id,
        up_by: adminId,
        details: issueLines.map((l) => ({ rqd_id: l.rqd_id, issued_qty: l.issued_qty })),
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['supplie-req'] })
        setIssueTarget(null)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const cancelMutation = useMutation({
    mutationFn: (req_id: number) => apiPost('SupplieRequest/cancel', { req_id, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['supplie-req'] }) }
      else toast.error(res.ms)
      setCancelTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  async function openIssue(row: ReqRow) {
    const detail = await apiGet<any>(`SupplieRequest/detail/${row.req_id}`)
    const lines = (detail?.details ?? []).map((d: any) => ({
      rqd_id: d.rqd_id,
      supp_name: supplies.find((s) => s.supp_id === d.supp_id)?.supp_name ?? `#${d.supp_id}`,
      req_qty: d.req_qty,
      issued_qty: d.req_qty,
    }))
    setIssueLines(lines)
    setIssueTarget(row)
  }

  function openAdd() {
    setEditing(null)
    setForm({ req_no: '', req_date: new Date().toISOString().substring(0, 10), requester_name: '', department: '', purpose: '' })
    setDetails([{ supp_id: null, req_qty: 1, note: '' }])
    setDialogOpen(true)
  }

  const isSupplyHead = userType === 4 || userType === 7 || userType === 1 || userType === 2

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (r: ReqRow) => (
        <div className="flex flex-wrap gap-1">
          {r.status === 0 && (
            <>
              <Button size="sm" variant="warning" title="แก้ไข" onClick={() => {
                setEditing(r)
                setForm({ req_no: r.req_no ?? '', req_date: r.req_date?.substring(0, 10) ?? '', requester_name: r.requester_name ?? '', department: r.department ?? '', purpose: r.purpose ?? '' })
                setDetails([{ supp_id: null, req_qty: 1, note: '' }])
                setDialogOpen(true)
              }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-blue-600 h-7" title="ส่งคำขอ"
                onClick={() => submitMutation.mutate(r.req_id)}>
                <Send className="h-3 w-3" />
              </Button>
            </>
          )}
          {r.status === 1 && isSupplyHead && (
            <>
              <Button size="sm" variant="outline" className="text-green-600 h-7" title="อนุมัติ"
                onClick={() => approveMutation.mutate(r.req_id)}>
                <CheckCircle className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 h-7" title="ส่งกลับแก้ไข"
                onClick={() => { setRejectTarget(r); setRejectReason('') }}>
                <XCircle className="h-3 w-3" />
              </Button>
            </>
          )}
          {r.status === 2 && isSupplyHead && (
            <Button size="sm" variant="outline" className="text-emerald-600 h-7" title="จ่ายพัสดุ"
              onClick={() => openIssue(r)}>
              <PackageCheck className="h-3 w-3" />
            </Button>
          )}
          {(r.status === 0 || r.status === 1) && (
            <Button size="sm" variant="destructive" title="ยกเลิก" onClick={() => setCancelTarget(r)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
      headerClassName: 'w-32',
    },
    { header: 'เลขที่ใบเบิก', render: (r: ReqRow) => r.req_no ?? '-' },
    { header: 'วันที่', render: (r: ReqRow) => fmtDateTH(r.req_date) },
    { header: 'ผู้เบิก', render: (r: ReqRow) => r.requester_name ?? '-' },
    { header: 'ฝ่าย/หน่วยงาน', render: (r: ReqRow) => r.department ?? '-' },
    { header: 'วัตถุประสงค์', render: (r: ReqRow) => <span className="text-sm line-clamp-1">{r.purpose ?? '-'}</span> },
    {
      header: 'สถานะ',
      render: (r: ReqRow) => {
        const s = STATUS[r.status] ?? { label: String(r.status), color: 'bg-gray-100' }
        return <span className={`px-2 py-0.5 rounded text-xs ${s.color}`}>{s.label}</span>
      },
    },
  ], [isSupplyHead, submitMutation, approveMutation])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ใบเบิกพัสดุ"
        actions={<Button onClick={openAdd} disabled={scId === 0}><Plus className="h-4 w-4 mr-1" />สร้างใบเบิก</Button>}
      />

      <div className="p-4">
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

      {/* Form Dialog สร้าง/แก้ไขใบเบิก */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขใบเบิก' : 'สร้างใบเบิกพัสดุ'}
        onSubmit={() => {
          if (!form.requester_name.trim()) { toast.error('กรุณาระบุชื่อผู้เบิก'); return }
          if (details.filter((d) => d.supp_id).length === 0) { toast.error('กรุณาเลือกรายการพัสดุอย่างน้อย 1 รายการ'); return }
          saveMutation.mutate(form)
        }}
        loading={saveMutation.isPending}
        size="lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่ใบเบิก <span className="text-gray-400 text-xs">(ไม่บังคับ)</span></Label>
              <Input value={form.req_no} onChange={(e) => setForm({ ...form, req_no: e.target.value })} />
            </div>
            <div>
              <Label>วันที่ *</Label>
              <ThaiDatePicker value={form.req_date} onChange={(v) => setForm({ ...form, req_date: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ชื่อผู้เบิก *</Label>
              <Input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} />
            </div>
            <div>
              <Label>ฝ่าย/หน่วยงาน</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>วัตถุประสงค์</Label>
            <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">รายการพัสดุที่ขอเบิก</span>
              <Button
                size="sm" variant="outline" type="button"
                onClick={() => setDetails([...details, { supp_id: null, req_qty: 1, note: '' }])}
              >
                <Plus className="h-3 w-3 mr-1" />เพิ่ม
              </Button>
            </div>
            {details.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label className="text-xs">รายการ</Label>
                  <select
                    className="w-full border rounded-md h-9 px-2 text-sm"
                    value={d.supp_id ?? ''}
                    onChange={(e) => {
                      const updated = [...details]
                      updated[i] = { ...updated[i], supp_id: e.target.value ? Number(e.target.value) : null }
                      setDetails(updated)
                    }}
                  >
                    <option value="">-- เลือกพัสดุ --</option>
                    {supplies.map((s) => (
                      <option key={s.supp_id} value={s.supp_id}>{s.supp_no} {s.supp_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">จำนวน</Label>
                  <Input
                    type="number" min="1" value={d.req_qty}
                    onChange={(e) => {
                      const updated = [...details]
                      updated[i] = { ...updated[i], req_qty: Number(e.target.value) }
                      setDetails(updated)
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">หมายเหตุ</Label>
                  <Input value={d.note}
                    onChange={(e) => {
                      const updated = [...details]
                      updated[i] = { ...updated[i], note: e.target.value }
                      setDetails(updated)
                    }}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    size="sm" variant="ghost" type="button"
                    className="text-red-500"
                    disabled={details.length === 1}
                    onClick={() => setDetails(details.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormDialog>

      {/* Dialog จ่ายพัสดุ */}
      <FormDialog
        open={!!issueTarget}
        onClose={() => setIssueTarget(null)}
        title="บันทึกการจ่ายพัสดุ"
        onSubmit={() => issueMutation.mutate()}
        loading={issueMutation.isPending}
        submitLabel="บันทึกจ่าย"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">ใบเบิก: <strong>{issueTarget?.req_no || `#${issueTarget?.req_id}`}</strong></p>
          <div className="space-y-2">
            {issueLines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7">
                  <Label className="text-xs">รายการ</Label>
                  <div className="text-sm font-medium py-2">{l.supp_name}</div>
                </div>
                <div className="col-span-2 text-center">
                  <Label className="text-xs">ขอ</Label>
                  <div className="text-sm text-gray-600 py-2">{l.req_qty}</div>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">จ่ายจริง</Label>
                  <Input
                    type="number" min="0" max={l.req_qty} value={l.issued_qty}
                    onChange={(e) => {
                      const updated = [...issueLines]
                      updated[i] = { ...updated[i], issued_qty: Number(e.target.value) }
                      setIssueLines(updated)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600">ระบบจะหักสต็อกพัสดุตามจำนวนที่จ่ายจริง</p>
        </div>
      </FormDialog>

      {/* Dialog ส่งกลับแก้ไข */}
      <FormDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="ส่งกลับแก้ไข"
        onSubmit={() => {
          if (!rejectReason.trim()) { toast.error('กรุณาระบุเหตุผล'); return }
          rejectMutation.mutate()
        }}
        loading={rejectMutation.isPending}
        submitLabel="ส่งกลับ"
      >
        <div>
          <Label>เหตุผล *</Label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.req_id)}
        title="ยืนยันการยกเลิก"
        description={`ต้องการยกเลิกใบเบิก "${cancelTarget?.req_no || `#${cancelTarget?.req_id}`}" หรือไม่?`}
      />
    </div>
  )
}
