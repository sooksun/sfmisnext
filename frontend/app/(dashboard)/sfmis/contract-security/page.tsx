'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, RotateCcw, ShieldOff } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface Contract {
  ctId: number
  ctNo: string | null
  ctType: number
  ctDate: string | null
  ctTotal: number
  ctStatus: number
}

interface Security {
  cs_id: number
  ct_id: number
  security_type: number
  security_type_name: string
  security_form: number
  security_form_name: string
  amount: number
  percent_of_contract: number
  bank_name: string | null
  document_no: string | null
  received_date: string | null
  expiry_date: string | null
  return_date: string | null
  return_evidence_no: string | null
  status: number
  status_name: string
  note: string | null
}

const SECURITY_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'ถือครอง', color: 'bg-blue-100 text-blue-800' },
  2: { label: 'คืนแล้ว', color: 'bg-green-100 text-green-800' },
  3: { label: 'ยึด', color: 'bg-red-100 text-red-800' },
  9: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-500' },
}
const CT_STATUS: Record<number, string> = {
  0: 'ร่าง', 1: 'ลงนาม', 2: 'ส่งมอบครบ', 3: 'ปิด', 9: 'ยกเลิก',
}
const SECURITY_TYPES = [
  { value: 1, label: 'หลักประกันซอง' },
  { value: 2, label: 'หลักประกันสัญญา' },
  { value: 3, label: 'หลักประกันผลงาน' },
  { value: 4, label: 'มัดจำ' },
]
const SECURITY_FORMS = [
  { value: 1, label: 'เงินสด' },
  { value: 2, label: 'แคชเชียร์เช็ค' },
  { value: 3, label: 'หนังสือค้ำประกัน' },
  { value: 4, label: 'พันธบัตร' },
]

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function ContractSecurityPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()

  const [selected, setSelected] = useState<Contract | null>(null)

  // Add security
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    security_type: 2, security_form: 1, amount: 0, percent_of_contract: 0,
    bank_name: '', document_no: '', received_date: '', expiry_date: '', note: '',
  })

  // Return security
  const [returnTarget, setReturnTarget] = useState<Security | null>(null)
  const [returnDate, setReturnDate] = useState('')
  const [returnEvidenceNo, setReturnEvidenceNo] = useState('')
  const [returnNote, setReturnNote] = useState('')

  // Confiscate security
  const [confiscateTarget, setConfiscateTarget] = useState<Security | null>(null)
  const [confiscateNote, setConfiscateNote] = useState('')

  const { data: contractData, isLoading: ctLoading } = useQuery({
    queryKey: ['contracts', scId],
    queryFn: () => apiGet<{ data: Contract[] }>(`Supplie_contract/load/${scId}`),
    enabled: scId > 0,
  })
  const contracts = contractData?.data ?? []

  const { data: securityData, isLoading: secLoading } = useQuery({
    queryKey: ['securities', selected?.ctId],
    queryFn: () => apiGet<Security[]>(`ContractSecurity/load/${selected!.ctId}`),
    enabled: !!selected,
  })
  const securities = Array.isArray(securityData) ? securityData : []

  const addMutation = useMutation({
    mutationFn: (f: typeof addForm) =>
      apiPost('ContractSecurity/add', { ...f, ct_id: selected!.ctId, sc_id: scId, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['securities'] })
        setAddOpen(false)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const returnMutation = useMutation({
    mutationFn: () =>
      apiPost('ContractSecurity/return', {
        cs_id: returnTarget!.cs_id,
        return_date: returnDate,
        return_evidence_no: returnEvidenceNo || undefined,
        note: returnNote || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['securities'] })
        setReturnTarget(null)
        setReturnDate('')
        setReturnEvidenceNo('')
        setReturnNote('')
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const confiscateMutation = useMutation({
    mutationFn: () =>
      apiPost('ContractSecurity/confiscate', {
        cs_id: confiscateTarget!.cs_id,
        note: confiscateNote || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['securities'] })
        setConfiscateTarget(null)
        setConfiscateNote('')
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const contractColumns = useMemo(() => [
    {
      header: 'เลขที่สัญญา',
      render: (c: Contract) => <span className="font-mono text-sm">{c.ctNo ?? `#${c.ctId}`}</span>,
    },
    { header: 'วันที่ทำ', render: (c: Contract) => fmtDateTH(c.ctDate) },
    {
      header: 'ยอดรวม (บาท)',
      render: (c: Contract) => <span className="font-mono">{fmt(c.ctTotal)}</span>,
    },
    {
      header: 'สถานะ',
      render: (c: Contract) => <span className="text-xs">{CT_STATUS[c.ctStatus] ?? c.ctStatus}</span>,
    },
    {
      header: 'จัดการ',
      render: (c: Contract) => (
        <Button
          size="sm"
          variant={selected?.ctId === c.ctId ? 'default' : 'outline'}
          onClick={() => setSelected(c)}
        >
          ดูหลักประกัน
        </Button>
      ),
      headerClassName: 'w-28',
    },
  ], [selected])

  const securityColumns = useMemo(() => [
    {
      header: 'ประเภท',
      render: (s: Security) => (
        <div>
          <div className="text-sm font-medium">{s.security_type_name}</div>
          <div className="text-xs text-gray-500">{s.security_form_name}</div>
        </div>
      ),
    },
    {
      header: 'จำนวน (บาท)',
      render: (s: Security) => (
        <div>
          <span className="font-mono font-semibold">{fmt(s.amount)}</span>
          {s.percent_of_contract > 0 && (
            <span className="text-xs text-gray-500 ml-1">({s.percent_of_contract}%)</span>
          )}
        </div>
      ),
    },
    {
      header: 'เอกสาร',
      render: (s: Security) => (
        <div className="text-xs">
          {s.document_no && <div>เลขที่: {s.document_no}</div>}
          {s.bank_name && <div>ธนาคาร: {s.bank_name}</div>}
          {s.expiry_date && <div>หมดอายุ: {fmtDateTH(s.expiry_date)}</div>}
        </div>
      ),
    },
    { header: 'วันที่รับ', render: (s: Security) => fmtDateTH(s.received_date) },
    {
      header: 'สถานะ',
      render: (s: Security) => {
        const st = SECURITY_STATUS[s.status] ?? { label: String(s.status), color: 'bg-gray-100' }
        return <span className={`px-2 py-0.5 rounded text-xs ${st.color}`}>{st.label}</span>
      },
    },
    {
      header: 'รายละเอียด',
      render: (s: Security) => (
        <div className="text-xs text-gray-600">
          {s.return_date && <div>คืน: {fmtDateTH(s.return_date)} {s.return_evidence_no ? `(${s.return_evidence_no})` : ''}</div>}
          {s.note && <div>{s.note}</div>}
        </div>
      ),
    },
    {
      header: 'จัดการ',
      render: (s: Security) =>
        s.status === 1 ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 h-7"
              title="คืนหลักประกัน"
              onClick={() => {
                setReturnTarget(s)
                setReturnDate(new Date().toISOString().substring(0, 10))
                setReturnEvidenceNo('')
                setReturnNote('')
              }}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 h-7"
              title="ยึดหลักประกัน"
              onClick={() => { setConfiscateTarget(s); setConfiscateNote('') }}
            >
              <ShieldOff className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
      headerClassName: 'w-20',
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="หลักประกันสัญญา" />

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">สัญญา/ใบสั่งซื้อ</h3>
          <DataTable
            columns={contractColumns}
            data={contracts}
            total={contracts.length}
            page={0}
            pageSize={50}
            onPageChange={() => {}}
            loading={ctLoading}
          />
        </div>

        {selected && (
          <div className="rounded-md border p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium">
                  หลักประกันสัญญา: <strong>{selected.ctNo ?? `#${selected.ctId}`}</strong>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">มูลค่าสัญญา {fmt(selected.ctTotal)} บาท</p>
              </div>
              <Button size="sm" onClick={() => {
                setAddForm({ security_type: 2, security_form: 1, amount: 0, percent_of_contract: 0,
                  bank_name: '', document_no: '', received_date: '', expiry_date: '', note: '' })
                setAddOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-1" />เพิ่มหลักประกัน
              </Button>
            </div>
            <DataTable
              columns={securityColumns}
              data={securities}
              total={securities.length}
              page={0}
              pageSize={50}
              onPageChange={() => {}}
              loading={secLoading}
            />
          </div>
        )}
      </div>

      {/* Dialog เพิ่มหลักประกัน */}
      <FormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="เพิ่มหลักประกัน"
        onSubmit={() => {
          if (addForm.amount <= 0) { toast.error('กรุณาระบุจำนวนเงินหลักประกัน'); return }
          addMutation.mutate(addForm)
        }}
        loading={addMutation.isPending}
        submitLabel="บันทึก"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทหลักประกัน *</Label>
              <select className="w-full border rounded-md h-9 px-2" value={addForm.security_type}
                onChange={(e) => setAddForm({ ...addForm, security_type: Number(e.target.value) })}>
                {SECURITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>รูปแบบ *</Label>
              <select className="w-full border rounded-md h-9 px-2" value={addForm.security_form}
                onChange={(e) => setAddForm({ ...addForm, security_form: Number(e.target.value) })}>
                {SECURITY_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input type="number" step="0.01" value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>% ของมูลค่าสัญญา</Label>
              <Input type="number" step="0.01" value={addForm.percent_of_contract}
                onChange={(e) => setAddForm({ ...addForm, percent_of_contract: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่เอกสาร</Label>
              <Input value={addForm.document_no} onChange={(e) => setAddForm({ ...addForm, document_no: e.target.value })} />
            </div>
            <div>
              <Label>ธนาคาร/สถาบัน</Label>
              <Input value={addForm.bank_name} onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่รับ</Label>
              <ThaiDatePicker value={addForm.received_date} onChange={(v) => setAddForm({ ...addForm, received_date: v })} />
            </div>
            <div>
              <Label>วันหมดอายุ</Label>
              <ThaiDatePicker value={addForm.expiry_date} onChange={(v) => setAddForm({ ...addForm, expiry_date: v })} />
            </div>
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} />
          </div>
        </div>
      </FormDialog>

      {/* Dialog คืนหลักประกัน */}
      <FormDialog
        open={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        title="คืนหลักประกัน"
        onSubmit={() => {
          if (!returnDate) { toast.error('กรุณาระบุวันที่คืน'); return }
          returnMutation.mutate()
        }}
        loading={returnMutation.isPending}
        submitLabel="บันทึกคืน"
      >
        <div className="space-y-3">
          <p className="text-sm">
            จำนวน: <strong className="text-blue-700">{fmt(returnTarget?.amount ?? 0)} บาท</strong>
            <span className="text-gray-500 ml-2">({returnTarget?.security_type_name})</span>
          </p>
          <div>
            <Label>วันที่คืน *</Label>
            <ThaiDatePicker value={returnDate} onChange={setReturnDate} />
          </div>
          <div>
            <Label>เลขที่หลักฐานการคืน</Label>
            <Input value={returnEvidenceNo} onChange={(e) => setReturnEvidenceNo(e.target.value)} />
          </div>
          <div>
            <Label>หมายเหตุ</Label>
            <Input value={returnNote} onChange={(e) => setReturnNote(e.target.value)} />
          </div>
        </div>
      </FormDialog>

      {/* Dialog ยึดหลักประกัน */}
      <FormDialog
        open={!!confiscateTarget}
        onClose={() => setConfiscateTarget(null)}
        title="ยึดหลักประกัน"
        onSubmit={() => confiscateMutation.mutate()}
        loading={confiscateMutation.isPending}
        submitLabel="ยืนยันยึด"
      >
        <div className="space-y-3">
          <p className="text-sm text-red-700">
            ยืนยันการยึดหลักประกัน <strong>{fmt(confiscateTarget?.amount ?? 0)} บาท</strong> ({confiscateTarget?.security_type_name})
          </p>
          <div>
            <Label>เหตุผล/หมายเหตุ</Label>
            <Input value={confiscateNote} onChange={(e) => setConfiscateNote(e.target.value)} />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
