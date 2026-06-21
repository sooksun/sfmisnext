'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Trash2,
  Printer,
  ClipboardCheck,
  Stamp,
  Banknote,
  Plane,
} from 'lucide-react'
import { openPrintWindow } from '@/lib/print-utils'
import { officialTravel8708, officialBor111, type Travel8708TravelerRow, type Bor111Row } from '@/lib/official-forms'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { DataTable } from '@/components/shared/data-table'
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
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { ExportButton } from '@/components/ui/export-button'
import { exportToXlsx } from '@/lib/export-xlsx'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TravelItem {
  tr_id: number
  requester_id: number
  requester_name: string | null
  requester_position: string | null
  affiliation: string | null
  province: string | null
  at_office: string | null
  order_ref: string | null
  order_date: string | null
  purpose: string | null
  companions: string | null
  depart_from: number
  depart_date: string | null
  depart_time: string | null
  return_date: string | null
  return_time: string | null
  total_days: number
  total_hours: number
  money_type_id: number
  money_type_name: string | null
  la_id: number | null
  la_no: string | null
  allowance_total: number
  lodging_total: number
  transport_total: number
  other_total: number
  grand_total: number
  evidence_count: number
  verify_name: string | null
  verify_date: string | null
  approve_name: string | null
  approve_date: string | null
  receipt_date: string | null
  type_offer_check: number
  bc_no: string | null
  status: number
  status_name: string
  note: string | null
}

interface AdminItem { admin_id: number; name?: string; username?: string }
interface BudgetTypeItem { bg_type_id: number; budget_type: string }
interface LoanItem {
  la_id: number
  la_no: string | null
  borrower_id: number
  loan_category: number
  amount: number
  borrow_date: string | null
  status: number
}
interface TravelerRow {
  trt_id: number
  seq: number
  name: string | null
  position: string | null
  allowance: number
  lodging: number
  transport: number
  other: number
  total: number
}

const ST = { PENDING_VERIFY: 10, PENDING_APPROVE: 11, PENDING_PAY: 12, PAID: 2, CANCELLED: 3 } as const
const DEPART_FROM = [
  { value: 1, label: 'บ้านพัก' },
  { value: 2, label: 'สำนักงาน' },
  { value: 3, label: 'ประเทศไทย' },
]

// ─── Zod ────────────────────────────────────────────────────────────────────

const travelerSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  allowance: z.number().min(0),
  lodging: z.number().min(0),
  transport: z.number().min(0),
  other: z.number().min(0),
})

const addSchema = z.object({
  requester_id: z.number({ error: 'กรุณาเลือกผู้เดินทาง' }).min(1, 'กรุณาเลือกผู้เดินทาง'),
  requester_position: z.string().optional(),
  affiliation: z.string().optional(),
  province: z.string().optional(),
  order_ref: z.string().optional(),
  order_date: z.string().optional(),
  purpose: z.string().optional(),
  companions: z.string().optional(),
  depart_from: z.number(),
  depart_date: z.string().optional(),
  depart_time: z.string().optional(),
  return_date: z.string().optional(),
  return_time: z.string().optional(),
  total_days: z.number().min(0).optional(),
  total_hours: z.number().min(0).optional(),
  money_type_id: z.number({ error: 'กรุณาเลือกประเภทเงิน' }).min(1, 'กรุณาเลือกประเภทเงิน'),
  la_id: z.number().optional(),
  evidence_count: z.number().min(0).optional(),
  travelers: z.array(travelerSchema).min(1, 'ต้องมีผู้เดินทางอย่างน้อย 1 คน'),
  note: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

const verifySchema = z.object({ verify_date: z.string().min(1, 'ระบุวันที่'), verify_name: z.string().optional() })
const approveSchema = z.object({ approve_date: z.string().min(1, 'ระบุวันที่'), approve_name: z.string().optional() })
const disburseSchema = z.object({ receipt_date: z.string().min(1, 'ระบุวันที่'), type_offer_check: z.number() })
type VerifyForm = z.infer<typeof verifySchema>
type ApproveForm = z.infer<typeof approveSchema>
type DisburseForm = z.infer<typeof disburseSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
  if (status === ST.PENDING_VERIFY) return <span className={`${base} bg-slate-100 text-slate-700`}>รอตรวจสอบ</span>
  if (status === ST.PENDING_APPROVE) return <span className={`${base} bg-indigo-100 text-indigo-700`}>รออนุมัติ</span>
  if (status === ST.PENDING_PAY) return <span className={`${base} bg-sky-100 text-sky-700`}>รอจ่ายเงิน</span>
  if (status === ST.PAID) return <span className={`${base} bg-green-100 text-green-700`}>จ่ายแล้ว</span>
  return <span className={`${base} bg-gray-100 text-gray-600`}>ยกเลิก</span>
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TravelReimbursementPage() {
  const { scId, syId, adminId, userName, userType, budgetYear: byRaw, scName } = useAppContext()
  const budgetYear = String(byRaw >= 2400 ? byRaw : byRaw + 543)
  const apiYear = String(byRaw < 2400 ? byRaw : byRaw - 543)
  const qc = useQueryClient()
  const isFinance = [1, 2, 5, 8].includes(userType)
  const isDirector = [1, 2].includes(userType)
  const todayISO = () => new Date().toISOString().substring(0, 10)

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const [addOpen, setAddOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [selected, setSelected] = useState<TravelItem | null>(null)

  const { data: listData, isLoading } = useQuery({
    queryKey: ['travel-reimb', scId, syId, apiYear],
    queryFn: () => apiGet<{ data: TravelItem[]; count: number }>(`TravelReimbursement/loadList/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })
  const { data: adminsData } = useQuery({
    queryKey: ['admins', scId],
    queryFn: () => apiGet<{ data: AdminItem[] }>(`B_admin/load_user_options/${scId}`),
    enabled: scId > 0,
  })
  const { data: budgetTypesData } = useQuery({
    queryKey: ['budget-types', scId],
    queryFn: () => apiGet<{ data: BudgetTypeItem[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })
  const { data: loansData } = useQuery({
    queryKey: ['loan-agreements', scId, syId, apiYear],
    queryFn: () => apiGet<{ data: LoanItem[] }>(`LoanAgreement/loadLoanAgreements/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })

  const items = listData?.data ?? []
  const admins = adminsData?.data ?? []
  const budgetTypes = budgetTypesData?.data ?? []
  // เงินยืมค่าเดินทาง (loan_category=1) ที่ยังค้างชำระ — ใช้เชื่อมเพื่อส่งใช้
  const travelLoans = (loansData?.data ?? []).filter((l) => l.loan_category === 1 && l.status === 1)

  const paged = useMemo(() => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [items, page])

  // ─── Add form ──────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      requester_id: 0, requester_position: '', affiliation: '', province: '',
      order_ref: '', order_date: '', purpose: '', companions: '',
      depart_from: 2, depart_date: '', depart_time: '', return_date: '', return_time: '',
      total_days: 0, total_hours: 0, money_type_id: 0, la_id: 0, evidence_count: 0,
      travelers: [{ name: '', position: '', allowance: 0, lodging: 0, transport: 0, other: 0 }],
      note: '',
    },
  })
  const { fields, append, remove } = useFieldArray({ control: addForm.control, name: 'travelers' })
  const watchTravelers = addForm.watch('travelers')
  const grandTotal = useMemo(
    () => (watchTravelers ?? []).reduce(
      (s, t) => s + (Number(t.allowance) || 0) + (Number(t.lodging) || 0) + (Number(t.transport) || 0) + (Number(t.other) || 0), 0,
    ),
    [watchTravelers],
  )

  function openAdd() {
    addForm.reset({
      requester_id: adminId || 0,
      requester_position: '', affiliation: scName ? `โรงเรียน${scName}` : '', province: '',
      order_ref: '', order_date: '', purpose: '', companions: '',
      depart_from: 2, depart_date: todayISO(), depart_time: '', return_date: todayISO(), return_time: '',
      total_days: 1, total_hours: 0, money_type_id: 0, la_id: 0, evidence_count: 0,
      travelers: [{ name: userName ?? '', position: '', allowance: 0, lodging: 0, transport: 0, other: 0 }],
      note: '',
    })
    setAddOpen(true)
  }

  const addMutation = useMutation({
    mutationFn: (v: AddForm) =>
      apiPost<{ flag: boolean; ms: string }>('TravelReimbursement/add', {
        sc_id: scId, sy_id: syId, budget_year: apiYear,
        requester_id: v.requester_id, requester_position: v.requester_position ?? '',
        affiliation: v.affiliation ?? '', province: v.province ?? '',
        order_ref: v.order_ref ?? '', order_date: v.order_date || null,
        purpose: v.purpose ?? '', companions: v.companions ?? '',
        depart_from: v.depart_from, depart_date: v.depart_date || null, depart_time: v.depart_time ?? '',
        return_date: v.return_date || null, return_time: v.return_time ?? '',
        total_days: v.total_days ?? 0, total_hours: v.total_hours ?? 0,
        money_type_id: v.money_type_id, la_id: v.la_id && v.la_id > 0 ? v.la_id : undefined,
        evidence_count: v.evidence_count ?? 0,
        travelers: v.travelers,
        note: v.note ?? '', up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['travel-reimb'] }); setAddOpen(false) }
      else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Workflow forms ──────────────────────────────────────────────────────────

  const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(verifySchema), defaultValues: { verify_date: '', verify_name: '' } })
  const approveForm = useForm<ApproveForm>({ resolver: zodResolver(approveSchema), defaultValues: { approve_date: '', approve_name: '' } })
  const disburseForm = useForm<DisburseForm>({ resolver: zodResolver(disburseSchema), defaultValues: { receipt_date: '', type_offer_check: 1 } })

  const verifyMutation = useMutation({
    mutationFn: (v: VerifyForm) => apiPost<{ flag: boolean; ms: string }>('TravelReimbursement/verify', {
      tr_id: selected!.tr_id, verify_by: adminId, verify_name: v.verify_name ?? '', verify_date: v.verify_date, up_by: adminId,
    }),
    onSuccess: (res) => { if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['travel-reimb'] }); setVerifyOpen(false); setSelected(null) } else toast.error(res.ms) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })
  const approveMutation = useMutation({
    mutationFn: (v: ApproveForm) => apiPost<{ flag: boolean; ms: string }>('TravelReimbursement/approve', {
      tr_id: selected!.tr_id, approve_by: adminId, approve_name: v.approve_name ?? '', approve_date: v.approve_date, up_by: adminId,
    }),
    onSuccess: (res) => { if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['travel-reimb'] }); setApproveOpen(false); setSelected(null) } else toast.error(res.ms) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })
  const disburseMutation = useMutation({
    mutationFn: (v: DisburseForm) => apiPost<{ flag: boolean; ms: string }>('TravelReimbursement/disburse', {
      tr_id: selected!.tr_id, receipt_date: v.receipt_date, type_offer_check: v.type_offer_check, up_by: adminId,
    }),
    onSuccess: (res) => { if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['travel-reimb'] }); qc.invalidateQueries({ queryKey: ['loan-agreements'] }); setDisburseOpen(false); setSelected(null) } else toast.error(res.ms) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })
  const cancelMutation = useMutation({
    mutationFn: (it: TravelItem) => apiPost<{ flag: boolean; ms: string }>('TravelReimbursement/cancel', { tr_id: it.tr_id, up_by: adminId }),
    onSuccess: (res) => { if (res.flag) { toast.success(res.ms); qc.invalidateQueries({ queryKey: ['travel-reimb'] }) } else toast.error(res.ms) },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openVerify(it: TravelItem) { setSelected(it); verifyForm.reset({ verify_date: todayISO(), verify_name: userName ?? '' }); setVerifyOpen(true) }
  function openApprove(it: TravelItem) { setSelected(it); approveForm.reset({ approve_date: todayISO(), approve_name: '' }); setApproveOpen(true) }
  function openDisburse(it: TravelItem) { setSelected(it); disburseForm.reset({ receipt_date: todayISO(), type_offer_check: 1 }); setDisburseOpen(true) }
  function handleCancel(it: TravelItem) { if (window.confirm(`ยืนยันยกเลิกใบขอเบิกของ ${it.requester_name} หรือไม่?`)) cancelMutation.mutate(it) }

  async function printForm(it: TravelItem) {
    const travelers = await apiGet<TravelerRow[]>(`TravelReimbursement/loadTravelers/${it.tr_id}`)
    const loan = travelLoans.find((l) => l.la_id === it.la_id) ?? (loansData?.data ?? []).find((l) => l.la_id === it.la_id)
    const rows: Travel8708TravelerRow[] = (travelers ?? []).map((t) => ({
      seq: t.seq, name: t.name, position: t.position,
      allowance: t.allowance, lodging: t.lodging, transport: t.transport, other: t.other, total: t.total,
    }))
    const body = officialTravel8708({
      scName, atOffice: it.at_office, docDate: it.order_date ?? it.depart_date,
      loanNo: it.la_no, loanDate: loan?.borrow_date ?? null, loanAmount: loan?.amount ?? null,
      requesterName: it.requester_name, requesterPosition: it.requester_position,
      affiliation: it.affiliation, province: it.province, companions: it.companions,
      orderRef: it.order_ref, orderDate: it.order_date,
      purpose: it.purpose, departFrom: it.depart_from,
      departDate: it.depart_date, departTime: it.depart_time, returnDate: it.return_date, returnTime: it.return_time,
      totalDays: it.total_days, totalHours: it.total_hours,
      allowanceTotal: it.allowance_total, lodgingTotal: it.lodging_total, transportTotal: it.transport_total,
      otherTotal: it.other_total, grandTotal: it.grand_total, evidenceCount: it.evidence_count,
      verifyName: it.verify_name, verifyDate: it.verify_date, approveName: it.approve_name, approveDate: it.approve_date,
      receiptDate: it.receipt_date, payerName: it.verify_name, bcNo: it.bc_no,
      travelers: rows.length ? rows : [{ name: it.requester_name, position: it.requester_position, total: it.grand_total }],
    })
    openPrintWindow({ title: `แบบ8708_${it.bc_no || it.tr_id}`, body })
  }

  // แบบ บก.111 — ใบรับรองแทนใบเสร็จรับเงิน (รายจ่ายที่ไม่มีใบเสร็จ: ค่าพาหนะ/ค่าใช้จ่ายอื่น)
  async function printBor111(it: TravelItem) {
    const travelers = await apiGet<TravelerRow[]>(`TravelReimbursement/loadTravelers/${it.tr_id}`)
    const list = travelers ?? []
    const rows: Bor111Row[] = []
    for (const t of list) {
      const who = t.name || it.requester_name || ''
      if (Number(t.transport) > 0) rows.push({ date: it.depart_date, detail: `ค่าพาหนะเดินทาง — ${who}`, amount: t.transport })
      if (Number(t.other) > 0) rows.push({ date: it.depart_date, detail: `ค่าใช้จ่ายอื่น — ${who}`, amount: t.other })
    }
    if (!rows.length) {
      if (Number(it.transport_total) > 0) rows.push({ date: it.depart_date, detail: 'ค่าพาหนะเดินทาง', amount: it.transport_total })
      if (Number(it.other_total) > 0) rows.push({ date: it.depart_date, detail: 'ค่าใช้จ่ายอื่น', amount: it.other_total })
    }
    const body = officialBor111({
      scName, rows,
      certifierName: it.requester_name, certifierPosition: it.requester_position,
      affiliation: it.affiliation, signDate: it.receipt_date ?? it.depart_date,
    })
    openPrintWindow({ title: `บก111_${it.bc_no || it.tr_id}`, body })
  }

  function handleExport() {
    exportToXlsx(items.map((l) => ({
      'เลขที่ บค.': l.bc_no ?? '-', 'ผู้เดินทาง': l.requester_name ?? '-',
      'ประเภทเงิน': l.money_type_name ?? '-', 'เงินยืม': l.la_no ?? '-',
      'วันเดินทาง': l.depart_date ? fmtDateTH(l.depart_date) : '-',
      'จำนวนเงิน (บาท)': Number(l.grand_total), 'สถานะ': l.status_name,
    })), 'ขอเบิกค่าเดินทาง', `travel-8708-${budgetYear}`)
  }

  const columns = [
    { header: 'ผู้เดินทาง', render: (it: TravelItem) => <span className="font-medium">{it.requester_name ?? '-'}</span> },
    { header: 'ไปปฏิบัติราชการ', render: (it: TravelItem) => <span className="text-gray-600 text-xs">{it.purpose ?? '-'}</span> },
    { header: 'ประเภทเงิน', render: (it: TravelItem) => <span className="text-gray-600">{it.money_type_name ?? '-'}</span> },
    { header: 'เงินยืม', render: (it: TravelItem) => <span className="text-blue-700">{it.la_no ?? '-'}</span> },
    { header: 'วันเดินทาง', render: (it: TravelItem) => <span>{it.depart_date ? fmtDateTH(it.depart_date) : '-'}</span> },
    {
      header: 'จำนวนเงิน (บาท)', headerClassName: 'text-right', className: 'text-right',
      render: (it: TravelItem) => <span className="font-semibold">{it.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>,
    },
    { header: 'บค.', render: (it: TravelItem) => <span className="text-emerald-700">{it.bc_no ?? '-'}</span> },
    { header: 'สถานะ', render: (it: TravelItem) => <StatusBadge status={it.status} /> },
    {
      header: 'จัดการ',
      render: (it: TravelItem) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => printForm(it)} title="พิมพ์แบบ 8708"><Printer className="h-3 w-3" /></Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => printBor111(it)} title="พิมพ์แบบ บก.111 (ใบรับรองแทนใบเสร็จรับเงิน)"><Printer className="h-3 w-3 mr-1" />บก.111</Button>
          {it.status === ST.PENDING_VERIFY && isFinance && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-indigo-600" onClick={() => openVerify(it)}><ClipboardCheck className="h-3 w-3 mr-1" />ตรวจสอบ</Button>
          )}
          {it.status === ST.PENDING_APPROVE && isDirector && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-violet-600" onClick={() => openApprove(it)}><Stamp className="h-3 w-3 mr-1" />อนุมัติ</Button>
          )}
          {it.status === ST.PENDING_PAY && isFinance && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-emerald-600" onClick={() => openDisburse(it)}><Banknote className="h-3 w-3 mr-1" />จ่ายเงิน</Button>
          )}
          {(it.status === ST.PENDING_VERIFY || it.status === ST.PENDING_APPROVE || it.status === ST.PENDING_PAY) && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-red-600" onClick={() => handleCancel(it)}>ยกเลิก</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="ขอเบิกค่าใช้จ่ายเดินทางไปราชการ (แบบ 8708)"
        subtitle={budgetYear ? `ปีงบประมาณ ${budgetYear} — ครูยื่นเอง → เจ้าหน้าที่การเงินตรวจสอบ → ผอ.อนุมัติ → จ่าย (บค.)` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton onExport={handleExport} loading={items.length === 0} />
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />ยื่นขอเบิกค่าเดินทาง</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={paged} total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} loading={isLoading} emptyText="ยังไม่มีใบขอเบิกค่าเดินทาง" />

      {/* ─── Add Dialog ─────────────────────────────────────────── */}
      <FormDialog
        open={addOpen} onClose={() => setAddOpen(false)}
        title="ยื่นขอเบิกค่าใช้จ่ายเดินทางไปราชการ (แบบ 8708)" size="2xl"
        submitLabel="ยื่นขอเบิก" loading={addMutation.isPending}
        onSubmit={addForm.handleSubmit((v) => addMutation.mutate(v))}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ผู้เดินทาง (ผู้ขอเบิก) <span className="text-red-500">*</span></Label>
              <Select value={addForm.watch('requester_id') ? String(addForm.watch('requester_id')) : ''} onValueChange={(x) => addForm.setValue('requester_id', Number(x), { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="เลือกผู้เดินทาง" /></SelectTrigger>
                <SelectContent>{admins.map((a) => <SelectItem key={a.admin_id} value={String(a.admin_id)}>{a.name ?? a.username ?? `ID ${a.admin_id}`}</SelectItem>)}</SelectContent>
              </Select>
              {addForm.formState.errors.requester_id && <p className="text-xs text-red-500">{addForm.formState.errors.requester_id.message}</p>}
            </div>
            <div className="space-y-1"><Label>ตำแหน่ง</Label><Input {...addForm.register('requester_position')} placeholder="เช่น ครู คศ.1" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>สังกัด</Label><Input {...addForm.register('affiliation')} /></div>
            <div className="space-y-1"><Label>จังหวัด</Label><Input {...addForm.register('province')} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>ตามคำสั่ง/บันทึก ที่</Label><Input {...addForm.register('order_ref')} placeholder="เลขที่คำสั่ง" /></div>
            <div className="space-y-1">
              <Label>ลงวันที่ (คำสั่ง)</Label>
              <ThaiDatePicker value={addForm.watch('order_date') ?? ''} onChange={(x) => addForm.setValue('order_date', x)} />
            </div>
          </div>

          <div className="space-y-1"><Label>เดินทางไปปฏิบัติราชการ (วัตถุประสงค์/สถานที่)</Label>
            <Input {...addForm.register('purpose')} placeholder="เช่น เข้าร่วมอบรม ณ สพป...." /></div>
          <div className="space-y-1"><Label>พร้อมด้วย (ผู้ร่วมเดินทาง)</Label><Input {...addForm.register('companions')} placeholder="ชื่อผู้ร่วมเดินทาง (ถ้ามี)" /></div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>ออกเดินทางจาก</Label>
              <Select value={String(addForm.watch('depart_from'))} onValueChange={(x) => addForm.setValue('depart_from', Number(x))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPART_FROM.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>วันที่ออกเดินทาง</Label>
              <ThaiDatePicker value={addForm.watch('depart_date') ?? ''} onChange={(x) => addForm.setValue('depart_date', x)} /></div>
            <div className="space-y-1"><Label>เวลา (น.)</Label><Input {...addForm.register('depart_time')} placeholder="07:00" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>รวมเวลา (วัน)</Label>
              <Input type="number" min={0} {...addForm.register('total_days', { setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)) })} /></div>
            <div className="space-y-1"><Label>วันที่กลับถึง</Label>
              <ThaiDatePicker value={addForm.watch('return_date') ?? ''} onChange={(x) => addForm.setValue('return_date', x)} /></div>
            <div className="space-y-1"><Label>เวลา (น.)</Label><Input {...addForm.register('return_time')} placeholder="18:00" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ประเภทเงิน (เบิกจาก) <span className="text-red-500">*</span></Label>
              <Select value={addForm.watch('money_type_id') ? String(addForm.watch('money_type_id')) : ''} onValueChange={(x) => addForm.setValue('money_type_id', Number(x), { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทเงิน" /></SelectTrigger>
                <SelectContent>{budgetTypes.map((b) => <SelectItem key={b.bg_type_id} value={String(b.bg_type_id)}>{b.budget_type}</SelectItem>)}</SelectContent>
              </Select>
              {addForm.formState.errors.money_type_id && <p className="text-xs text-red-500">{addForm.formState.errors.money_type_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>เชื่อมเงินยืมค่าเดินทาง (ถ้ามี)</Label>
              <Select value={addForm.watch('la_id') ? String(addForm.watch('la_id')) : '0'} onValueChange={(x) => addForm.setValue('la_id', Number(x))}>
                <SelectTrigger><SelectValue placeholder="ไม่เชื่อมเงินยืม" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">— ไม่เชื่อมเงินยืม —</SelectItem>
                  {travelLoans.map((l) => <SelectItem key={l.la_id} value={String(l.la_id)}>{l.la_no} ({l.amount.toLocaleString('th-TH')} บาท)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* travelers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>รายการค่าใช้จ่ายรายคน (ส่วนที่ 2)</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => append({ name: '', position: '', allowance: 0, lodging: 0, transport: 0, other: 0 })}>
                <Plus className="h-3 w-3 mr-1" />เพิ่มผู้เดินทาง
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">ชื่อ</th>
                    <th className="px-2 py-1 text-left">ตำแหน่ง</th>
                    <th className="px-2 py-1 text-right">เบี้ยเลี้ยง</th>
                    <th className="px-2 py-1 text-right">ที่พัก</th>
                    <th className="px-2 py-1 text-right">พาหนะ</th>
                    <th className="px-2 py-1 text-right">อื่นๆ</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => (
                    <tr key={f.id} className="border-t">
                      <td className="px-1 py-1"><Input className="h-7 text-xs" {...addForm.register(`travelers.${i}.name`)} /></td>
                      <td className="px-1 py-1"><Input className="h-7 text-xs" {...addForm.register(`travelers.${i}.position`)} /></td>
                      <td className="px-1 py-1"><Input className="h-7 text-xs text-right w-20" type="number" min={0} step={0.01} {...addForm.register(`travelers.${i}.allowance`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><Input className="h-7 text-xs text-right w-20" type="number" min={0} step={0.01} {...addForm.register(`travelers.${i}.lodging`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><Input className="h-7 text-xs text-right w-20" type="number" min={0} step={0.01} {...addForm.register(`travelers.${i}.transport`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><Input className="h-7 text-xs text-right w-20" type="number" min={0} step={0.01} {...addForm.register(`travelers.${i}.other`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1 text-center">
                        {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center rounded-lg bg-blue-50 px-3 py-2 text-sm">
              <span className="text-gray-600">รวมทั้งสิ้น</span>
              <span className="font-semibold text-blue-700">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>จำนวนหลักฐานแนบ (ฉบับ)</Label>
              <Input type="number" min={0} {...addForm.register('evidence_count', { setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)) })} /></div>
            <div className="space-y-1"><Label>หมายเหตุ</Label><Input {...addForm.register('note')} /></div>
          </div>
        </div>
      </FormDialog>

      {/* ─── Verify ─────────────────────────────────────────── */}
      <FormDialog open={verifyOpen} onClose={() => { setVerifyOpen(false); setSelected(null) }}
        title={`ตรวจสอบใบขอเบิกค่าเดินทาง — ${selected?.requester_name ?? ''}`} size="sm"
        submitLabel="ยืนยันการตรวจสอบ" loading={verifyMutation.isPending}
        onSubmit={verifyForm.handleSubmit((v) => verifyMutation.mutate(v))}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-50 p-3 text-sm">ยอดเบิก: <b className="text-indigo-700">{selected.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</b></div>
            <div className="space-y-1"><Label>ชื่อผู้ตรวจสอบ</Label><Input {...verifyForm.register('verify_name')} placeholder="เจ้าหน้าที่การเงิน" /></div>
            <div className="space-y-1"><Label>วันที่ตรวจสอบ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={verifyForm.watch('verify_date') ?? ''} onChange={(x) => verifyForm.setValue('verify_date', x, { shouldValidate: true })} /></div>
          </div>
        )}
      </FormDialog>

      {/* ─── Approve ─────────────────────────────────────────── */}
      <FormDialog open={approveOpen} onClose={() => { setApproveOpen(false); setSelected(null) }}
        title={`อนุมัติให้จ่ายได้ — ${selected?.requester_name ?? ''}`} size="sm"
        submitLabel="อนุมัติ" loading={approveMutation.isPending}
        onSubmit={approveForm.handleSubmit((v) => approveMutation.mutate(v))}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-violet-50 p-3 text-sm">ยอดเบิก: <b className="text-violet-700">{selected.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</b>
              {selected.verify_name && <div className="text-xs text-gray-500 mt-1">ตรวจสอบโดย {selected.verify_name} ({fmtDateTH(selected.verify_date)})</div>}</div>
            <div className="space-y-1"><Label>ชื่อผู้อนุมัติ (ผอ.)</Label><Input {...approveForm.register('approve_name')} placeholder="ผู้อำนวยการ" /></div>
            <div className="space-y-1"><Label>วันที่อนุมัติ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={approveForm.watch('approve_date') ?? ''} onChange={(x) => approveForm.setValue('approve_date', x, { shouldValidate: true })} /></div>
          </div>
        )}
      </FormDialog>

      {/* ─── Disburse ─────────────────────────────────────────── */}
      <FormDialog open={disburseOpen} onClose={() => { setDisburseOpen(false); setSelected(null) }}
        title={`จ่ายเงินค่าเดินทาง — ${selected?.requester_name ?? ''}`} size="sm"
        submitLabel="ยืนยันการจ่าย (ออก บค.)" loading={disburseMutation.isPending}
        onSubmit={disburseForm.handleSubmit((v) => disburseMutation.mutate(v))}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-sm space-y-1">
              <div>ยอดเบิก: <b className="text-emerald-700">{selected.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</b></div>
              {selected.la_no ? <div className="text-xs text-gray-600">เชื่อมเงินยืม {selected.la_no} — ระบบจะส่งใช้เงินยืมและคืน/เบิกเพิ่มส่วนต่างให้อัตโนมัติ</div>
                : <div className="text-xs text-gray-600">จะตัดยอดเงินออกจากประเภทเงินที่เบิก และลงเป็นใบสำคัญจ่าย บค.</div>}
            </div>
            <div className="space-y-1">
              <Label>ช่องทางจ่าย</Label>
              <Select value={String(disburseForm.watch('type_offer_check'))} onValueChange={(x) => disburseForm.setValue('type_offer_check', Number(x))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">เงินสด (บค.)</SelectItem>
                  <SelectItem value="2">เช็ค/ธนาคาร (บจ.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>วันที่จ่าย/รับเงิน <span className="text-red-500">*</span></Label>
              <ThaiDatePicker value={disburseForm.watch('receipt_date') ?? ''} onChange={(x) => disburseForm.setValue('receipt_date', x, { shouldValidate: true })} /></div>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
