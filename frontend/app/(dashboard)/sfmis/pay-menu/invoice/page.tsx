'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Send, AlertTriangle, RotateCcw, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeSignatures, fmtBaht, numberToThaiBaht, esc, thaiFullDate } from '@/lib/print-utils'
import { getLastEntryDate, setLastEntryDate } from '@/lib/last-entry-date'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DeleteWithReasonDialog } from '@/components/shared/delete-with-reason-dialog'
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
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { useAppContext } from '@/hooks/use-app-context'

interface InvoiceRow {
  rw_id: number
  sc_id: number
  no_doc: string
  bg_type_id: number
  rw_type: number
  p_id: number
  order_id: number
  user_request: number
  project_name: string
  partner_name: string
  budget_type_name: string
  user_request_name: string
  detail: string
  amount: number | string
  status: number
  date_request: string
  up_by: string | number
  up_date: string
  remark: string
  precheck_note?: string
  sy_id: number
  year: string
}

interface LoanRow {
  rw_id: number
  no_doc: string
  detail: string
  amount: number
  loan_type: number | null
  loan_start_date: string | null
  loan_return_due_date: string | null
  loan_returned_date: string | null
  loan_return_cash: number
  loan_return_voucher_amount: number
  return_total: number
  loan_status: 'active' | 'overdue' | 'returned'
  requester_name: string
}

interface Partner {
  p_id: number
  p_name: string
}

interface BudgetType {
  bg_type_id: number
  budget_type_name: string
}

interface UserRequest {
  admin_id: number
  name: string
}

const invoiceSchema = z
  .object({
    no_doc: z.string().min(1, 'กรุณากรอกเลขที่ใบสำคัญ'),
    bg_type_id: z.number().min(1, 'กรุณาเลือกประเภทงบ'),
    rw_type: z.number().min(1, 'กรุณาเลือกประเภทการจ่าย'),
    p_id: z.number().optional(), // ผู้รับเงิน (partner) — บังคับเฉพาะค่าพัสดุ/บริการ
    detail: z.string().min(1, 'กรุณากรอกรายละเอียด'),
    amount: z.number().min(0.01, 'กรุณากรอกจำนวนเงิน'),
    date_request: z.string().min(1, 'กรุณาเลือกวันที่'),
    user_request: z.number().min(1, 'กรุณาเลือกผู้ขอเบิก'),
    order_id: z.number().optional(), // ลิงก์มูลหนี้จากพัสดุที่ตรวจรับแล้ว
    tr_id: z.number().optional(), // ลิงก์ใบขอเบิกค่าเดินทางที่อนุมัติแล้ว
    la_id: z.number().optional(), // ลิงก์ใบยืมเงินที่อนุมัติแล้ว
    loan_type: z.number().optional(),
    loan_start_date: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // ค่าพัสดุ/บริการ (3) ผู้รับเงินเป็นร้านค้า → บังคับเลือก
    if (val.rw_type === 3 && (!val.p_id || val.p_id < 1)) {
      ctx.addIssue({ code: 'custom', path: ['p_id'], message: 'กรุณาเลือกผู้รับเงิน' })
    }
  })
type InvoiceForm = z.infer<typeof invoiceSchema>

// มูลหนี้จากพัสดุที่ตรวจรับแล้ว (พร้อมขอเบิก)
interface PayableParcel {
  order_id: number
  ct_id: number | null
  p_id: number
  partner_name: string
  amount: number
  bg_type_id: number
  budget_type_name: string
  project_id: number
  project_name: string
  insp_date: string | null
}

// ใบขอเบิกค่าเดินทางที่ ผอ. อนุมัติแล้ว (รอจ่าย)
interface PayableTravel {
  tr_id: number
  requester_name: string
  purpose: string
  amount: number
  bg_type_id: number
  budget_type_name: string
}
// ใบยืมเงินที่ ผอ. อนุมัติแล้ว (รอรับเงิน)
interface PayableLoan {
  la_id: number
  la_no: string
  borrower_name: string
  purpose: string
  amount: number
  bg_type_id: number
  budget_type_name: string
}

const returnSchema = z.object({
  loan_returned_date: z.string().min(1, 'กรุณาเลือกวันที่คืน'),
  loan_return_cash: z.number().min(0, 'กรอกเงินสดคืน'),
  loan_return_voucher_amount: z.number().min(0, 'กรอกใบสำคัญคืน'),
})
type ReturnForm = z.infer<typeof returnSchema>

const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'ร่าง', color: 'text-gray-500' },
  50: { label: 'รอเจ้าหน้าที่ตรวจฎีกา', color: 'text-amber-600' },
  51: { label: 'ตรวจไม่ผ่าน — แก้ไขแล้วส่งใหม่', color: 'text-orange-600' },
  100: { label: 'ตรวจแล้ว รอหัวหน้าอนุมัติ', color: 'text-blue-600' },
  101: { label: 'หัวหน้าไม่อนุมัติ', color: 'text-red-500' },
  102: { label: 'หัวหน้าอนุมัติ / รอ ผอ.', color: 'text-indigo-600' },
  200: { label: 'ผอ. อนุมัติ', color: 'text-green-600' },
  201: { label: 'ยกเลิกเช็ค', color: 'text-red-500' },
  202: { label: 'ออกเช็คแล้ว', color: 'text-green-700' },
}

// สถานะที่เจ้าของใบสามารถแก้ไข/ส่งใหม่/ลบได้
const EDITABLE_STATUSES = new Set([0, 51])

const rwTypeLabel: Record<number, string> = {
  1: 'เงินยืม',
  2: 'ค่าเดินทาง',
  3: 'ค่าพัสดุ/บริการ',
  4: 'หัก ณ ที่จ่าย',
}

const loanTypeLabel: Record<number, string> = {
  1: 'เงินสวัสดิการ',
  2: 'โครงการ',
  3: 'กิจกรรม',
}

const loanStatusStyle: Record<string, { label: string; cls: string }> = {
  active: { label: 'ปกติ', cls: 'bg-blue-100 text-blue-700' },
  overdue: { label: 'เกินกำหนด', cls: 'bg-red-100 text-red-700' },
  returned: { label: 'คืนแล้ว', cls: 'bg-green-100 text-green-700' },
}

export default function InvoicePage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const upBy = adminId
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loanDialogOpen, setLoanDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState<LoanRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null)
  const [submitTarget, setSubmitTarget] = useState<InvoiceRow | null>(null)
  const [editing, setEditing] = useState<InvoiceRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', scId, syId],
    queryFn: () => apiGet<InvoiceRow[]>(`Invoice/loadInvoiceOrder/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: loanData, isLoading: loanLoading } = useQuery({
    queryKey: ['loan-status', scId, syId],
    queryFn: () => apiGet<LoanRow[]>(`Invoice/loadLoanStatus/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: partners } = useQuery({
    queryKey: ['partners-invoice', scId],
    queryFn: () => apiGet<Partner[]>(`Invoice/loadPartner/${scId}`),
    enabled: scId > 0,
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-type-invoice', scId, syId, apiYear],
    queryFn: () => apiGet<BudgetType[]>(`Invoice/loadBudgetType/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && apiYear !== '',
  })

  const { data: userRequests } = useQuery({
    queryKey: ['user-request', scId],
    queryFn: () => apiGet<UserRequest[]>(`Invoice/loadUserRequest/${scId}`),
    enabled: scId > 0,
  })

  // มูลหนี้จากพัสดุที่ตรวจรับแล้ว (สะพานพัสดุ→การเงิน) — โหลดเมื่อเปิดฟอร์มสร้างใหม่
  const { data: payableParcels } = useQuery({
    queryKey: ['payable-parcels', scId, dialogOpen],
    queryFn: () => apiGet<PayableParcel[]>(`Invoice/loadPayableParcels/${scId}`),
    enabled: scId > 0 && dialogOpen && !editing,
  })

  // ใบขอเบิกค่าเดินทาง + ใบยืมเงิน ที่ ผอ. อนุมัติแล้ว (เชื่อมเป็นต้นเรื่องการจ่าย)
  const { data: payableTravel } = useQuery({
    queryKey: ['payable-travel', scId, syId, apiYear, dialogOpen],
    queryFn: () => apiGet<PayableTravel[]>(`Invoice/loadPayableTravel/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear && dialogOpen && !editing,
  })
  const { data: payableLoans } = useQuery({
    queryKey: ['payable-loans', scId, syId, apiYear, dialogOpen],
    queryFn: () => apiGet<PayableLoan[]>(`Invoice/loadPayableLoans/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear && dialogOpen && !editing,
  })

  // เลขที่เอกสารถัดไป (preview) — backend ออกให้อัตโนมัติตอนบันทึก
  const { data: docCounters } = useQuery({
    queryKey: ['doc-counters', scId, apiYear, dialogOpen],
    queryFn: () => apiGet<{ data: { formatted_next: string }[] }>(`DocCounter/loadCounters/${scId}/${apiYear}`),
    enabled: scId > 0 && !!apiYear && dialogOpen && !editing,
  })
  const nextDoc = (prefix: string) =>
    docCounters?.data?.find((c) => c.formatted_next.startsWith(prefix))?.formatted_next

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<InvoiceForm>({
      resolver: zodResolver(invoiceSchema),
      defaultValues: {
        no_doc: '', bg_type_id: 0, rw_type: 0, p_id: 0,
        detail: '', amount: 0, date_request: '', user_request: 0,
        loan_type: undefined, loan_start_date: '',
      },
    })

  const {
    register: regReturn, handleSubmit: handleReturn,
    reset: resetReturn, setValue: setReturnVal, watch: watchReturn,
    formState: { errors: returnErrors },
  } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
    defaultValues: { loan_returned_date: '', loan_return_cash: 0, loan_return_voucher_amount: 0 },
  })

  const bgTypeId = watch('bg_type_id')
  const pId = watch('p_id') ?? 0
  const rwType = watch('rw_type')
  const userRequest = watch('user_request')
  const dateRequest = watch('date_request')
  const loanStartDate = watch('loan_start_date')
  const loanType = watch('loan_type')
  const returnedDate = watchReturn('loan_returned_date')

  const saveMutation = useMutation({
    mutationFn: (form: InvoiceForm) => {
      const payload: Record<string, unknown> = { ...form, sc_id: scId, sy_id: syId, year: apiYear, up_by: upBy }
      if (editing) return apiPost('Invoice/updateInvoice', { ...payload, rw_id: editing.rw_id })
      return apiPost('Invoice/addInvoice', payload)
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
        qc.invalidateQueries({ queryKey: ['loan-status'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const returnMutation = useMutation({
    mutationFn: (form: ReturnForm) =>
      apiPost('Invoice/returnLoan', { ...form, rw_id: returnTarget!.rw_id, up_by: upBy }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'บันทึกการคืนเงินเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['loan-status'] })
        setReturnDialogOpen(false)
        setReturnTarget(null)
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const submitMutation = useMutation({
    mutationFn: (item: InvoiceRow) =>
      apiPost('Invoice/updateInvoice', {
        rw_id: item.rw_id, status: 50, sc_id: item.sc_id ?? scId,
        no_doc: item.no_doc, bg_type_id: item.bg_type_id, rw_type: item.rw_type,
        p_id: item.p_id, detail: item.detail, amount: item.amount,
        date_request: item.date_request, user_request: item.user_request,
        sy_id: item.sy_id, year: item.year,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ส่งตรวจฎีกาเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการส่งตรวจ')
      }
      setSubmitTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ item }: { item: InvoiceRow; reason: string }) =>
      apiPost('Invoice/deleteInvoice', {
        rw_id: item.rw_id,
        sc_id: item.sc_id ?? scId,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['invoice'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openAdd() {
    setEditing(null)
    reset({
      no_doc: '', bg_type_id: 0, rw_type: 0, p_id: 0, detail: '', amount: 0,
      date_request: getLastEntryDate('pay'), user_request: 0,
      order_id: 0, tr_id: 0, la_id: 0, loan_type: undefined, loan_start_date: '',
    })
    setDialogOpen(true)
  }

  // เลือกมูลหนี้จากพัสดุที่ตรวจรับแล้ว → เติม ร้านค้า/จำนวน/ประเภทงบ/รายละเอียด/order_id อัตโนมัติ
  function applyParcel(orderId: string) {
    const pp = payableList.find((p) => String(p.order_id) === orderId)
    if (!pp) return
    setValue('order_id', pp.order_id)
    setValue('tr_id', 0)
    setValue('la_id', 0)
    if (pp.p_id) setValue('p_id', pp.p_id, { shouldValidate: true })
    if (pp.bg_type_id) setValue('bg_type_id', pp.bg_type_id, { shouldValidate: true })
    if (pp.amount) setValue('amount', pp.amount, { shouldValidate: true })
    setValue('rw_type', 3, { shouldValidate: true }) // ค่าพัสดุ/บริการ
    setValue(
      'detail',
      `จ่ายค่าจัดซื้อ/จัดจ้าง${pp.project_name ? ' โครงการ' + pp.project_name : ''}${pp.partner_name ? ' ร้าน ' + pp.partner_name : ''} (ตรวจรับแล้ว)`,
      { shouldValidate: true },
    )
    toast.success('เติมข้อมูลมูลหนี้จากพัสดุอัตโนมัติแล้ว')
  }

  // เชื่อมใบขอเบิกค่าเดินทางที่ ผอ. อนุมัติแล้ว → เติมอัตโนมัติ (ผู้รับเป็นบุคคลภายใน)
  function applyTravel(trId: string) {
    const t = travelList.find((x) => String(x.tr_id) === trId)
    if (!t) return
    setValue('tr_id', t.tr_id)
    setValue('order_id', 0)
    setValue('la_id', 0)
    setValue('p_id', 0)
    if (t.bg_type_id) setValue('bg_type_id', t.bg_type_id, { shouldValidate: true })
    if (t.amount) setValue('amount', t.amount, { shouldValidate: true })
    setValue('rw_type', 2, { shouldValidate: true })
    setValue('detail', `ค่าใช้จ่ายเดินทางไปราชการ ${t.requester_name}${t.purpose ? ' — ' + t.purpose : ''}`, { shouldValidate: true })
    toast.success('เติมข้อมูลจากใบขอเบิกค่าเดินทางแล้ว')
  }

  // เชื่อมใบยืมเงินที่ ผอ. อนุมัติแล้ว → เติมอัตโนมัติ
  function applyLoan(laId: string) {
    const l = loanList.find((x) => String(x.la_id) === laId)
    if (!l) return
    setValue('la_id', l.la_id)
    setValue('order_id', 0)
    setValue('tr_id', 0)
    setValue('p_id', 0)
    if (l.bg_type_id) setValue('bg_type_id', l.bg_type_id, { shouldValidate: true })
    if (l.amount) setValue('amount', l.amount, { shouldValidate: true })
    setValue('rw_type', 1, { shouldValidate: true })
    setValue('detail', `จ่ายเงินยืมตามสัญญา ${l.la_no} — ${l.borrower_name}${l.purpose ? ' (' + l.purpose + ')' : ''}`, { shouldValidate: true })
    toast.success('เติมข้อมูลจากใบยืมเงินแล้ว')
  }

  function openEdit(item: InvoiceRow) {
    setEditing(item)
    reset({
      no_doc: item.no_doc ?? '',
      bg_type_id: item.bg_type_id,
      rw_type: item.rw_type,
      p_id: item.p_id,
      detail: item.detail ?? '',
      amount: Number(item.amount),
      date_request: item.date_request ? String(item.date_request).substring(0, 10) : '',
      user_request: item.user_request,
    })
    setDialogOpen(true)
  }

  function printInvoice(item: InvoiceRow) {
    const header = makeHeader({
      title: 'ใบสำคัญจ่าย',
      subtitle: 'หลักฐานการจ่ายเงินของทางราชการ',
      docNo: item.no_doc,
      docDate: item.date_request,
    })
    const body = `
<p><b>ปีงบประมาณ:</b> ${esc(item.year ?? '-')} &nbsp; <b>ประเภทงบ:</b> ${esc(item.budget_type_name ?? '-')}</p>
<p><b>โครงการ:</b> ${esc(item.project_name ?? '-')}</p>
<p><b>ผู้รับเงิน:</b> ${esc(item.partner_name ?? '-')}</p>
<p><b>ผู้เสนอขอเบิก:</b> ${esc(item.user_request_name ?? '-')}</p>
<table>
  <tr><th style="width:70%">รายการ</th><th>จำนวนเงิน (บาท)</th></tr>
  <tr><td>${esc(item.detail ?? '-')}</td><td class="num">${fmtBaht(Number(item.amount))}</td></tr>
  <tr><td class="right"><b>รวมทั้งสิ้น</b></td><td class="num"><b>${fmtBaht(Number(item.amount))}</b></td></tr>
</table>
<p class="mt-6"><b>จำนวนเงินเป็นอักษร:</b> ${esc(numberToThaiBaht(Number(item.amount)))}</p>
<p><b>วันที่ขอเบิก:</b> ${esc(thaiFullDate(item.date_request))}</p>
${item.remark ? `<p><b>หมายเหตุ:</b> ${esc(item.remark)}</p>` : ''}`
    openPrintWindow({
      title: `ใบสำคัญจ่าย_${item.no_doc}`,
      body: header + body + makeSignatures(['ผู้รับเงิน', 'ผู้จ่ายเงิน', 'ผู้อนุมัติจ่าย']),
    })
  }

  function openReturn(loan: LoanRow) {
    setReturnTarget(loan)
    resetReturn({
      loan_returned_date: getLastEntryDate('pay'),
      loan_return_cash: 0,
      loan_return_voucher_amount: 0,
    })
    setReturnDialogOpen(true)
  }

  const fmt = (n: number | string) =>
    Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  const rows = Array.isArray(data) ? data : []
  const loans = Array.isArray(loanData) ? loanData : []
  const overdueLoans = loans.filter((l) => l.loan_status === 'overdue')
  const activeLoans = loans.filter((l) => l.loan_status !== 'returned')

  const partnerList = Array.isArray(partners) ? partners : []
  const budgetTypeList = Array.isArray(budgetTypes) ? budgetTypes : []
  const userRequestList = Array.isArray(userRequests) ? userRequests : []
  const payableList = Array.isArray(payableParcels) ? payableParcels : []
  const travelList = Array.isArray(payableTravel) ? payableTravel : []
  const loanList = Array.isArray(payableLoans) ? payableLoans : []

  const columns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (item: InvoiceRow) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => printInvoice(item)} title="พิมพ์ใบสำคัญจ่าย">
            <Printer className="h-3 w-3" />
          </Button>
          {EDITABLE_STATUSES.has(item.status) && (
            <>
              <Button size="sm" variant="warning" onClick={() => openEdit(item)} title="แก้ไข">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubmitTarget(item)}
                title={item.status === 51 ? 'ส่งตรวจใหม่' : 'ส่งตรวจฎีกา'}
              >
                <Send className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} title="ลบ">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
      headerClassName: 'w-36',
    },
    { header: 'เลขที่', key: 'no_doc' as keyof InvoiceRow },
    { header: 'ประเภทงบ', key: 'budget_type_name' as keyof InvoiceRow },
    { header: 'ผู้รับเงิน', key: 'partner_name' as keyof InvoiceRow },
    { header: 'รายละเอียด', key: 'detail' as keyof InvoiceRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: InvoiceRow) => <span className="text-right block">{fmt(item.amount)}</span>,
    },
    {
      header: 'ประเภทจ่าย',
      render: (item: InvoiceRow) => <span>{rwTypeLabel[item.rw_type] ?? String(item.rw_type)}</span>,
    },
    {
      header: 'สถานะ',
      render: (item: InvoiceRow) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: 'text-gray-500' }
        return (
          <div>
            <span className={s.color}>{s.label}</span>
            {item.status === 51 && item.precheck_note && (
              <div className="text-xs text-red-600 mt-0.5" title={item.precheck_note}>
                เหตุผล: {item.precheck_note}
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'วันที่ขอเบิก',
      render: (item: InvoiceRow) => <span>{fmtDateTH(item.date_request)}</span>,
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: InvoiceRow) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ], [])

  // ── คอลัมน์ตารางเงินยืม ────────────────────────────────────────────────────
  const loanColumns = useMemo(() => [
    {
      header: 'จัดการ',
      render: (item: LoanRow) =>
        item.loan_status !== 'returned' ? (
          <Button size="sm" variant="outline" onClick={() => openReturn(item)} title="บันทึกการคืนเงิน">
            <RotateCcw className="h-3 w-3 mr-1" />
            คืนเงิน
          </Button>
        ) : null,
      headerClassName: 'w-24',
    },
    { header: 'เลขที่', key: 'no_doc' as keyof LoanRow },
    { header: 'ผู้ยืม', key: 'requester_name' as keyof LoanRow },
    { header: 'รายละเอียด', key: 'detail' as keyof LoanRow },
    {
      header: 'ยอดยืม (บาท)',
      render: (item: LoanRow) => <span className="text-right block">{fmt(item.amount)}</span>,
    },
    {
      header: 'ประเภทเงินยืม',
      render: (item: LoanRow) => <span>{item.loan_type ? loanTypeLabel[item.loan_type] : '—'}</span>,
    },
    {
      header: 'วันที่ยืม',
      render: (item: LoanRow) => <span>{fmtDateTH(item.loan_start_date)}</span>,
    },
    {
      header: 'กำหนดคืน',
      render: (item: LoanRow) => <span>{fmtDateTH(item.loan_return_due_date)}</span>,
    },
    {
      header: 'วันที่คืนจริง',
      render: (item: LoanRow) => <span>{item.loan_returned_date ? fmtDateTH(item.loan_returned_date) : '—'}</span>,
    },
    {
      header: 'ยอดส่งคืน (บาท)',
      render: (item: LoanRow) =>
        item.loan_status === 'returned' ? (
          <span className="text-right block">{fmt(item.return_total)}</span>
        ) : <span className="text-gray-400">—</span>,
    },
    {
      header: 'สถานะ',
      render: (item: LoanRow) => {
        const s = loanStatusStyle[item.loan_status]
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
      },
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <ProcessFlow flow="pay" />
      <PageHeader
        title="ใบสำคัญจ่าย (ขอเบิก)"
        actions={
          <div className="flex gap-2">
            {activeLoans.length > 0 && (
              <Button variant="outline" onClick={() => setLoanDialogOpen(true)} className="relative">
                <RotateCcw className="h-4 w-4 mr-1" />
                เงินยืม
                {overdueLoans.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {overdueLoans.length}
                  </span>
                )}
              </Button>
            )}
            <Button onClick={openAdd} disabled={scId === 0}>
              <Plus className="h-4 w-4" />
              สร้างใบสำคัญจ่าย
            </Button>
          </div>
        }
      />

      {/* Banner เงินยืมเกินกำหนด */}
      {overdueLoans.length > 0 && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">มีเงินยืมเกินกำหนดส่งคืน {overdueLoans.length} รายการ</span>
            {' — '}
            {overdueLoans.map((l) => `${l.requester_name} (${fmt(l.amount)} บ.)`).join(', ')}
          </div>
        </div>
      )}

      <div className="p-4">
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      {/* ── Dialog เพิ่ม/แก้ไขใบสำคัญ ─────────────────────────────────────── */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'แก้ไขใบสำคัญจ่าย' : 'สร้างใบสำคัญจ่าย'}
        onSubmit={handleSubmit((d) =>
          saveMutation.mutate(d, {
            onSuccess: (res: any) => {
              if (res?.flag && !editing) setLastEntryDate(d.date_request, 'pay')
            },
          }),
        )}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">
          {/* เชื่อมเอกสารต้นเรื่องที่ ผอ. อนุมัติแล้ว → เติมอัตโนมัติ (ตามประเภทการจ่าย) */}
          {!editing && (rwType === 0 || rwType === 3) && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <Label className="text-indigo-800 font-semibold">
                เลือกมูลหนี้จากพัสดุที่ตรวจรับแล้ว (ใบจัดซื้อ/จัดจ้าง)
              </Label>
              {payableList.length > 0 ? (
                <>
                  <Select onValueChange={applyParcel}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder={`มี ${payableList.length} รายการพร้อมเบิก — เลือกเพื่อเติมอัตโนมัติ`} />
                    </SelectTrigger>
                    <SelectContent>
                      {payableList.map((pp) => (
                        <SelectItem key={pp.order_id} value={String(pp.order_id)}>
                          {pp.partner_name || 'ร้านค้า'} · {fmt(pp.amount)} บาท
                          {pp.project_name ? ` · ${pp.project_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-indigo-600 mt-1">
                    ระบบจะเติม ร้านค้า / จำนวนเงิน / ประเภทงบ / รายละเอียด ให้อัตโนมัติ (แก้ไขได้)
                  </p>
                </>
              ) : (
                <p className="text-xs text-indigo-600 mt-1">
                  ยังไม่มีพัสดุที่ตรวจรับแล้วรอตั้งเบิก — รายการจะปรากฏเองเมื่อพัสดุ &quot;ตรวจรับผ่าน + ลงบัญชีวัสดุ&quot; แล้ว
                </p>
              )}
            </div>
          )}

          {/* ค่าเดินทาง → เลือกใบขอเบิกค่าเดินทางที่ ผอ. อนุมัติแล้ว */}
          {!editing && rwType === 2 && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <Label className="text-sky-800 font-semibold">
                เลือกใบขอเบิกค่าเดินทางที่ ผอ. อนุมัติแล้ว (แบบ 8708)
              </Label>
              {travelList.length > 0 ? (
                <>
                  <Select onValueChange={applyTravel}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder={`มี ${travelList.length} ใบรออนุมัติจ่าย — เลือกเพื่อเติมอัตโนมัติ`} />
                    </SelectTrigger>
                    <SelectContent>
                      {travelList.map((t) => (
                        <SelectItem key={t.tr_id} value={String(t.tr_id)}>
                          {t.requester_name} · {fmt(t.amount)} บาท{t.purpose ? ` · ${t.purpose}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-sky-700 mt-1">
                    ออกเช็ค/เงินสดแล้ว ระบบจะปิดใบขอเบิกค่าเดินทางให้อัตโนมัติ (ลงเป็น บค.)
                  </p>
                </>
              ) : (
                <p className="text-xs text-sky-700 mt-1">
                  ยังไม่มีใบขอเบิกค่าเดินทางที่ ผอ. อนุมัติแล้วรอจ่าย
                </p>
              )}
            </div>
          )}

          {/* เงินยืม → เลือกใบยืมเงินที่ ผอ. อนุมัติแล้ว */}
          {!editing && rwType === 1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Label className="text-amber-800 font-semibold">
                เลือกใบยืมเงินที่ ผอ. อนุมัติแล้ว (สัญญายืมเงิน)
              </Label>
              {loanList.length > 0 ? (
                <>
                  <Select onValueChange={applyLoan}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder={`มี ${loanList.length} ใบรอรับเงิน — เลือกเพื่อเติมอัตโนมัติ`} />
                    </SelectTrigger>
                    <SelectContent>
                      {loanList.map((l) => (
                        <SelectItem key={l.la_id} value={String(l.la_id)}>
                          {l.la_no} · {l.borrower_name} · {fmt(l.amount)} บาท
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-700 mt-1">
                    ออกเช็ค/เงินสดแล้ว ระบบจะบันทึกรับเงินยืม (ค้างชำระ) + คำนวณกำหนดส่งใช้ให้อัตโนมัติ
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-700 mt-1">
                  ยังไม่มีใบยืมเงินที่ ผอ. อนุมัติแล้วรอรับเงิน
                </p>
              )}
            </div>
          )}

          <div>
            <Label>เลขที่ใบสำคัญ *</Label>
            <Input {...register('no_doc')} placeholder="เลขที่ใบสำคัญ" />
            {errors.no_doc && <p className="text-red-500 text-xs mt-1">{errors.no_doc.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทงบ *</Label>
              <Select value={bgTypeId > 0 ? String(bgTypeId) : ''} onValueChange={(v) => setValue('bg_type_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทงบ" /></SelectTrigger>
                <SelectContent>
                  {budgetTypeList.map((bt) => (
                    <SelectItem key={bt.bg_type_id} value={String(bt.bg_type_id)}>
                      {bt.budget_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bg_type_id && <p className="text-red-500 text-xs mt-1">{errors.bg_type_id.message}</p>}
            </div>
            <div>
              <Label>ประเภทการจ่าย *</Label>
              <Select value={rwType > 0 ? String(rwType) : ''} onValueChange={(v) => setValue('rw_type', Number(v))}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภทการจ่าย" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">เงินยืม</SelectItem>
                  <SelectItem value="2">ค่าเดินทาง</SelectItem>
                  <SelectItem value="3">ค่าพัสดุ/บริการ</SelectItem>
                </SelectContent>
              </Select>
              {errors.rw_type && <p className="text-red-500 text-xs mt-1">{errors.rw_type.message}</p>}
            </div>
          </div>

          {/* ── ส่วนเงินยืม (แสดงเมื่อ rw_type = 1) ── */}
          {rwType === 1 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-3">
              <p className="text-sm font-medium text-blue-700">ข้อมูลเงินยืม</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ประเภทเงินยืม</Label>
                  <Select
                    value={loanType ? String(loanType) : ''}
                    onValueChange={(v) => setValue('loan_type', Number(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">เงินสวัสดิการ</SelectItem>
                      <SelectItem value="2">โครงการ</SelectItem>
                      <SelectItem value="3">กิจกรรม</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>วันที่ยืม</Label>
                  <ThaiDatePicker
                    value={loanStartDate ?? ''}
                    onChange={(v) => setValue('loan_start_date', v, { shouldValidate: true })}
                  />
                  {loanStartDate && (
                    <p className="text-xs text-blue-600 mt-1">
                      กำหนดคืน: {(() => {
                        const d = new Date(loanStartDate)
                        d.setDate(d.getDate() + 30)
                        return fmtDateTH(d.toISOString().substring(0, 10))
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>ผู้รับเงิน *</Label>
            <Select value={pId > 0 ? String(pId) : ''} onValueChange={(v) => setValue('p_id', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้รับเงิน" /></SelectTrigger>
              <SelectContent>
                {partnerList.map((p) => (
                  <SelectItem key={p.p_id} value={String(p.p_id)}>{p.p_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.p_id && <p className="text-red-500 text-xs mt-1">{errors.p_id.message}</p>}
          </div>
          <div>
            <Label>ผู้ขอเบิก *</Label>
            <Select value={userRequest > 0 ? String(userRequest) : ''} onValueChange={(v) => setValue('user_request', Number(v))}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้ขอเบิก" /></SelectTrigger>
              <SelectContent>
                {userRequestList.map((u) => (
                  <SelectItem key={u.admin_id} value={String(u.admin_id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.user_request && <p className="text-red-500 text-xs mt-1">{errors.user_request.message}</p>}
          </div>
          <div>
            <Label>รายละเอียด *</Label>
            <Input {...register('detail')} placeholder="รายละเอียดการเบิก" />
            {errors.detail && <p className="text-red-500 text-xs mt-1">{errors.detail.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} placeholder="จำนวนเงิน" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label>วันที่ขอเบิก *</Label>
              <ThaiDatePicker
                value={dateRequest}
                onChange={(v) => setValue('date_request', v, { shouldValidate: true })}
              />
              {errors.date_request && <p className="text-red-500 text-xs mt-1">{errors.date_request.message}</p>}
            </div>
          </div>
          {!editing && (nextDoc('บจ') || nextDoc('บค')) && (
            <p className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
              ระบบจะออกเลขที่เอกสาร + เลขเช็คให้อัตโนมัติเมื่อบันทึก (ไม่ต้องกรอกเอง)
              {nextDoc('บจ') && <> — จ่ายเช็ค: <b>{nextDoc('บจ')}</b></>}
              {nextDoc('บค') && <> · จ่ายเงินสด: <b>{nextDoc('บค')}</b></>}
            </p>
          )}
        </div>
      </FormDialog>

      {/* ── Dialog ตารางเงินยืม ────────────────────────────────────────────── */}
      <FormDialog
        open={loanDialogOpen}
        onClose={() => setLoanDialogOpen(false)}
        title="ทะเบียนเงินยืม"
        size="xl"
      >
        <DataTable
          columns={loanColumns}
          data={loans}
          total={loans.length}
          page={0}
          pageSize={50}
          onPageChange={() => {}}
          loading={loanLoading}
        />
      </FormDialog>

      {/* ── Dialog บันทึกการคืนเงิน ───────────────────────────────────────── */}
      <FormDialog
        open={returnDialogOpen}
        onClose={() => { setReturnDialogOpen(false); setReturnTarget(null) }}
        title={`บันทึกการคืนเงิน — ${returnTarget?.no_doc ?? ''}`}
        onSubmit={() =>
          handleReturn((d) =>
            returnMutation.mutate(d, {
              onSuccess: (res: any) => {
                if (res?.flag) setLastEntryDate(d.loan_returned_date, 'pay')
              },
            }),
          )()
        }
        loading={returnMutation.isPending}
        submitLabel="บันทึกการคืน"
      >
        {returnTarget && (
          <div className="space-y-3">
            <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm space-y-1">
              <div>ผู้ยืม: <strong>{returnTarget.requester_name}</strong></div>
              <div>ยอดยืม: <strong>{fmt(returnTarget.amount)} บาท</strong></div>
              <div>กำหนดคืน: <strong>{fmtDateTH(returnTarget.loan_return_due_date)}</strong></div>
            </div>
            <div>
              <Label>วันที่คืน *</Label>
              <ThaiDatePicker
                value={returnedDate}
                onChange={(v) => setReturnVal('loan_returned_date', v, { shouldValidate: true })}
              />
              {returnErrors.loan_returned_date && (
                <p className="text-red-500 text-xs mt-1">{returnErrors.loan_returned_date.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>เงินสดคืน (บาท)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  {...regReturn('loan_return_cash', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>ใบสำคัญคืน (บาท)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  {...regReturn('loan_return_voucher_amount', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        )}
      </FormDialog>

      {/* ส่งอนุมัติ */}
      <ConfirmDialog
        open={!!submitTarget}
        onConfirm={() => submitTarget && submitMutation.mutate(submitTarget)}
        onCancel={() => setSubmitTarget(null)}
        title={submitTarget?.status === 51 ? 'ส่งตรวจฎีกาใหม่' : 'ส่งตรวจฎีกา'}
        description={`ส่งใบสำคัญ "${submitTarget?.no_doc}" ให้เจ้าหน้าที่การเงินตรวจฎีกาหรือไม่?`}
        confirmLabel="ส่งตรวจฎีกา"
        variant="default"
      />

      {/* ลบ */}
      <DeleteWithReasonDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => { if (deleteTarget) deleteMutation.mutate({ item: deleteTarget, reason }) }}
        itemLabel={`ใบสำคัญ "${deleteTarget?.no_doc}"`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
