'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  RotateCcw,
  Eye,
  AlertTriangle,
  Printer,
  ClipboardCheck,
  Stamp,
  Banknote,
} from 'lucide-react'
import { openPrintWindow } from '@/lib/print-utils'
import {
  officialLoanDebtorRegister,
  officialLoanAgreement,
  officialCashEquivalentRegister,
  officialVoucherReceipt,
  type LoanSettlementRow,
} from '@/lib/official-forms'
import { loanRequestMemo, loanReturnMemo } from '@/lib/official-finance-forms'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoanItem {
  la_id: number
  la_no: string | null
  la_seq: number
  borrower_id: number
  borrower_name: string | null
  borrower_position: string | null
  affiliation: string | null
  province: string | null
  money_type_id: number
  money_type_name: string | null
  loan_category: number
  loan_category_name: string
  purpose: string | null
  expense_detail: string | null
  amount: number
  due_days: number
  borrow_date: string | null
  due_date: string | null
  // workflow
  verify_name: string | null
  verify_date: string | null
  approve_name: string | null
  approve_date: string | null
  approve_amount: number | null
  receipt_date: string | null
  // ส่งใช้
  returned_date: string | null
  return_cash: number | null
  return_voucher_amount: number | null
  return_total: number
  status: number
  status_name: string
  is_overdue: boolean
  note: string | null
  rw_id: number | null
}

interface AdminItem {
  admin_id: number
  name?: string
  username?: string
}

interface BudgetTypeItem {
  bg_type_id: number
  budget_type: string
}

interface EvidenceItem {
  lre_id: number
  la_id: number
  evidence_no: string | null
  evidence_date: string | null
  cash_amount: number
  voucher_amount: number
  total: number
  note: string | null
  create_date: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOAN_CATEGORIES = [
  { value: 1, label: 'ค่าเดินทาง (15 วัน)', days: 15 },
  { value: 2, label: 'โครงการ (30 วัน)', days: 30 },
  { value: 3, label: 'กิจกรรม (30 วัน)', days: 30 },
  { value: 4, label: 'อื่นๆ (30 วัน)', days: 30 },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().substring(0, 10)
}

// สถานะ workflow
const ST = {
  PENDING_VERIFY: 10,
  PENDING_APPROVE: 11,
  PENDING_DISBURSE: 12,
  OUTSTANDING: 1,
  RETURNED: 2,
  CANCELLED: 3,
} as const

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const addSchema = z.object({
  borrower_id: z.number({ error: 'กรุณาเลือกผู้ยืม' }).min(1, 'กรุณาเลือกผู้ยืม'),
  borrower_position: z.string().optional(),
  affiliation: z.string().optional(),
  province: z.string().optional(),
  money_type_id: z.number({ error: 'กรุณาเลือกประเภทเงิน' }).min(1, 'กรุณาเลือกประเภทเงิน'),
  loan_category: z.number({ error: 'กรุณาเลือกประเภทการยืม' }).min(1, 'กรุณาเลือกประเภทการยืม'),
  purpose: z.string().optional(),
  expense_detail: z.string().optional(),
  amount: z.number({ error: 'กรุณาระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  due_days: z.number().int().min(0).optional(),
  borrow_date: z.string().min(1, 'กรุณาระบุวันที่ยืม'),
  note: z.string().optional(),
})

type AddForm = z.infer<typeof addSchema>

const returnSchema = z.object({
  returned_date: z.string().min(1, 'กรุณาระบุวันที่ส่งใช้'),
  return_cash: z.number().min(0, 'จำนวนเงินสดต้องไม่ติดลบ'),
  return_voucher_amount: z.number().min(0, 'จำนวนใบสำคัญต้องไม่ติดลบ'),
  evidence_no: z.string().optional(),
  note: z.string().optional(),
})

type ReturnForm = z.infer<typeof returnSchema>

const verifySchema = z.object({
  verify_date: z.string().min(1, 'กรุณาระบุวันที่ตรวจสอบ'),
  verify_name: z.string().optional(),
})
type VerifyForm = z.infer<typeof verifySchema>

const approveSchema = z.object({
  approve_date: z.string().min(1, 'กรุณาระบุวันที่อนุมัติ'),
  approve_name: z.string().optional(),
  approve_amount: z.number().min(0.01, 'จำนวนเงินอนุมัติต้องมากกว่า 0'),
})
type ApproveForm = z.infer<typeof approveSchema>

const disburseSchema = z.object({
  receipt_date: z.string().min(1, 'กรุณาระบุวันที่รับเงิน'),
})
type DisburseForm = z.infer<typeof disburseSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isOverdue }: { status: number; isOverdue: boolean }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium'
  if (status === ST.PENDING_VERIFY)
    return <span className={`${base} bg-slate-100 text-slate-700`}>รอตรวจสอบ</span>
  if (status === ST.PENDING_APPROVE)
    return <span className={`${base} bg-indigo-100 text-indigo-700`}>รออนุมัติ</span>
  if (status === ST.PENDING_DISBURSE)
    return <span className={`${base} bg-sky-100 text-sky-700`}>รอรับเงิน</span>
  if (status === ST.OUTSTANDING && isOverdue)
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        <AlertTriangle className="h-3 w-3" />
        เกินกำหนด
      </span>
    )
  if (status === ST.OUTSTANDING)
    return <span className={`${base} bg-amber-100 text-amber-700`}>ค้างชำระ</span>
  if (status === ST.RETURNED)
    return <span className={`${base} bg-green-100 text-green-700`}>คืนแล้ว</span>
  return <span className={`${base} bg-gray-100 text-gray-600`}>ยกเลิก</span>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** สร้างรายการส่งใช้ (ด้านหลังสัญญา) จากข้อมูลการคืนเงิน */
function buildSettlements(item: LoanItem): LoanSettlementRow[] {
  const rows: LoanSettlementRow[] = []
  let outstanding = Number(item.amount)
  const cash = Number(item.return_cash || 0)
  const voucher = Number(item.return_voucher_amount || 0)
  if (cash > 0) {
    outstanding -= cash
    rows.push({ date: item.returned_date, type: 'เงินสด', amount: cash, outstanding: Math.max(0, outstanding) })
  }
  if (voucher > 0) {
    outstanding -= voucher
    rows.push({ date: item.returned_date, type: 'ใบสำคัญ', amount: voucher, outstanding: Math.max(0, outstanding) })
  }
  return rows
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LoanAgreementPage() {
  const { scId, syId, adminId, userName, budgetYear: budgetYearRaw, scName } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const todayISO = () => new Date().toISOString().substring(0, 10)

  // dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [selectedLoanForEvidence, setSelectedLoanForEvidence] = useState<LoanItem | null>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['loan-agreements', scId, syId, apiYear],
    queryFn: () => apiGet<{ data: LoanItem[]; count: number }>(`LoanAgreement/loadLoanAgreements/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })

  const { data: adminsData } = useQuery({
    queryKey: ['admins', scId],
    queryFn: () => apiGet<{ data: AdminItem[]; count: number }>(`B_admin/load_user_options/${scId}`),
    enabled: scId > 0,
  })

  const { data: budgetTypesData } = useQuery({
    queryKey: ['budget-types', scId],
    queryFn: () => apiGet<{ data: BudgetTypeItem[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })

  const { data: evidenceData, isLoading: evidenceLoading } = useQuery({
    queryKey: ['loan-evidence', selectedLoanForEvidence?.la_id],
    queryFn: () => apiGet<EvidenceItem[]>(`LoanAgreement/loadEvidence/${selectedLoanForEvidence!.la_id}`),
    enabled: evidenceOpen && selectedLoanForEvidence != null,
  })

  const loans = loansData?.data ?? []
  const totalLoans = loansData?.count ?? 0
  const admins = adminsData?.data ?? []
  const budgetTypes = budgetTypesData?.data ?? []

  // พิมพ์แบบฟอร์ม "ทะเบียนคุมลูกหนี้เงินยืม" (สพฐ. 2544)
  function handlePrintRegister() {
    if (loans.length === 0) return
    const body = officialLoanDebtorRegister({
      scName,
      budgetYear,
      rows: loans.map((l) => ({
        no: l.la_seq,
        borrower: l.borrower_name,
        contractNo: `${l.la_no ?? ''}`,
        borrowDate: l.borrow_date,
        amount: l.amount,
        purpose: l.purpose,
        dueDate: l.due_date,
        returnDate: l.returned_date,
        outstanding: l.status === ST.OUTSTANDING ? l.amount : 0,
        note: l.is_overdue ? 'เกินกำหนด' : l.status_name,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมลูกหนี้เงินยืม_${budgetYear}`, body })
  }

  // พิมพ์แบบฟอร์ม "ทะเบียนคุมเอกสารแทนตัวเงิน" (ตย.4 — เงินยืมถือเป็นเอกสารแทนตัวเงิน)
  function handlePrintCashEquivalent() {
    if (loans.length === 0) return
    const body = officialCashEquivalentRegister({
      scName,
      budgetYear,
      rows: loans.map((l) => ({
        date: l.borrow_date,
        kind: l.loan_category_name || l.purpose,
        docNo: l.la_no,
        amount: l.amount,
        convertedDate: l.returned_date, // วันที่เปลี่ยนสภาพ = วันที่ส่งใช้/ล้างหนี้ครบ
        note: l.borrower_name,
      })),
    })
    openPrintWindow({ title: `ทะเบียนคุมเอกสารแทนตัวเงิน_${budgetYear}`, body })
  }

  const pagedLoans = useMemo(
    () => loans.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [loans, page],
  )

  // ─── Add Form ─────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      borrower_id: 0,
      borrower_position: '',
      affiliation: '',
      province: '',
      money_type_id: 0,
      loan_category: 2,
      purpose: '',
      expense_detail: '',
      amount: 0,
      due_days: 0,
      borrow_date: '',
      note: '',
    },
  })

  const watchLoanCategory = addForm.watch('loan_category')
  const watchDueDays = addForm.watch('due_days')

  const effectiveDueDays = useMemo(() => {
    if (watchDueDays && watchDueDays > 0) return watchDueDays
    const cat = LOAN_CATEGORIES.find((c) => c.value === watchLoanCategory)
    return cat?.days ?? 30
  }, [watchDueDays, watchLoanCategory])

  function openAddDialog() {
    addForm.reset({
      borrower_id: 0,
      borrower_position: '',
      affiliation: scName ? `โรงเรียน${scName}` : '',
      province: '',
      money_type_id: 0,
      loan_category: 2,
      purpose: '',
      expense_detail: '',
      amount: 0,
      due_days: 0,
      borrow_date: todayISO(),
      note: '',
    })
    setAddOpen(true)
  }

  const addMutation = useMutation({
    mutationFn: (values: AddForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/addLoanAgreement', {
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        borrower_id: values.borrower_id,
        borrower_position: values.borrower_position ?? '',
        affiliation: values.affiliation ?? '',
        province: values.province ?? '',
        money_type_id: values.money_type_id,
        loan_category: values.loan_category,
        purpose: values.purpose ?? '',
        expense_detail: values.expense_detail ?? '',
        amount: values.amount,
        due_days: values.due_days ?? 0,
        borrow_date: values.borrow_date,
        note: values.note ?? '',
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
        setAddOpen(false)
        addForm.reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Verify / Approve / Disburse forms ──────────────────────────────────────

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { verify_date: '', verify_name: '' },
  })
  const approveForm = useForm<ApproveForm>({
    resolver: zodResolver(approveSchema),
    defaultValues: { approve_date: '', approve_name: '', approve_amount: 0 },
  })
  const disburseForm = useForm<DisburseForm>({
    resolver: zodResolver(disburseSchema),
    defaultValues: { receipt_date: '' },
  })

  const verifyMutation = useMutation({
    mutationFn: (values: VerifyForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/verifyLoan', {
        la_id: selectedLoan!.la_id,
        verify_by: adminId,
        verify_name: values.verify_name ?? '',
        verify_date: values.verify_date,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
        setVerifyOpen(false)
        setSelectedLoan(null)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  const approveMutation = useMutation({
    mutationFn: (values: ApproveForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/approveLoan', {
        la_id: selectedLoan!.la_id,
        approve_by: adminId,
        approve_name: values.approve_name ?? '',
        approve_date: values.approve_date,
        approve_amount: values.approve_amount,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
        setApproveOpen(false)
        setSelectedLoan(null)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  const disburseMutation = useMutation({
    mutationFn: (values: DisburseForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/disburseLoan', {
        la_id: selectedLoan!.la_id,
        receipt_date: values.receipt_date,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
        setDisburseOpen(false)
        setSelectedLoan(null)
      } else toast.error(res.ms)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Return Form ──────────────────────────────────────────────────────────

  const returnForm = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      returned_date: '',
      return_cash: 0,
      return_voucher_amount: 0,
      evidence_no: '',
      note: '',
    },
  })

  const watchReturnCash = returnForm.watch('return_cash')
  const watchReturnVoucher = returnForm.watch('return_voucher_amount')
  const returnTotal = (Number(watchReturnCash) || 0) + (Number(watchReturnVoucher) || 0)

  const returnMutation = useMutation({
    mutationFn: (values: ReturnForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/returnLoan', {
        la_id: selectedLoan!.la_id,
        returned_date: values.returned_date,
        return_cash: values.return_cash,
        return_voucher_amount: values.return_voucher_amount,
        evidence_no: values.evidence_no ?? '',
        note: values.note ?? '',
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
        setReturnOpen(false)
        setSelectedLoan(null)
        returnForm.reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Cancel ───────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: (loan: LoanItem) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/cancelLoan', {
        la_id: loan.la_id,
        note: '',
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['loan-agreements'] })
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Actions ──────────────────────────────────────────────────────────────

  function printLoan(item: LoanItem) {
    const body = officialLoanAgreement({
      laNo: item.la_no,
      scName,
      financeDate: item.verify_date ?? item.approve_date ?? null,
      borrowerName: item.borrower_name,
      borrowerPosition: item.borrower_position,
      affiliation: item.affiliation,
      province: item.province,
      moneyTypeName: item.money_type_name,
      purpose: item.purpose,
      expenseDetail: item.expense_detail,
      amount: Number(item.amount),
      dueDays: item.due_days || effectiveDays(item),
      borrowDate: item.borrow_date,
      verifyName: item.verify_name,
      verifyDate: item.verify_date,
      approveName: item.approve_name,
      approveDate: item.approve_date,
      approveAmount: item.approve_amount,
      receiptDate: item.receipt_date,
      settlements: buildSettlements(item),
    })
    openPrintWindow({ title: `สัญญายืมเงิน_${item.la_no || item.la_id}`, body })
  }

  // บันทึกข้อความ "ขออนุมัติยืมเงิน" (ตย.22/33) — พิมพ์ตอนยืม
  function printLoanRequest(item: LoanItem) {
    const { title, body } = loanRequestMemo({
      scName,
      loanNo: item.la_no,
      borrowDate: item.borrow_date,
      borrowerName: item.borrower_name,
      borrowerPosition: item.borrower_position,
      moneyType: item.money_type_name,
      purpose: item.purpose,
      budgetYear,
      amount: Number(item.amount),
      financeOfficer: item.verify_name,
      director: item.approve_name,
    })
    openPrintWindow({ title, body })
  }

  // บันทึกข้อความ "ขออนุมัติส่งใช้เงินยืม" (ตย.35) — พิมพ์ตอนคืนเงิน
  function printLoanReturn(item: LoanItem) {
    const { title, body } = loanReturnMemo({
      scName,
      returnNo: item.la_no,
      returnDate: item.returned_date,
      borrowerName: item.borrower_name,
      moneyType: item.money_type_name,
      purpose: item.purpose,
      loanNo: item.la_no,
      loanAmount: Number(item.amount),
      dueDate: item.due_date,
      returnVoucher: Number(item.return_voucher_amount ?? 0),
      returnCash: Number(item.return_cash ?? 0),
      returnTotal: Number(item.return_total ?? 0),
      financeOfficer: item.verify_name,
      director: item.approve_name,
    })
    openPrintWindow({ title, body })
  }

  // ใบรับใบสำคัญ (ตย.37) — ออกเมื่อส่งใช้เงินยืมด้วยใบสำคัญ
  function printVoucherReceipt(item: LoanItem) {
    const body = officialVoucherReceipt({
      scName,
      affiliation: item.affiliation,
      receivedFrom: item.borrower_name,
      position: item.borrower_position,
      loanNo: item.la_no,
      loanDate: item.borrow_date,
      amount: Number(item.return_voucher_amount ?? 0),
      receiverName: item.verify_name,
      receiverPosition: 'เจ้าหน้าที่การเงิน',
      date: item.returned_date,
    })
    openPrintWindow({ title: `ใบรับใบสำคัญ_${item.la_no || item.la_id}`, body })
  }

  function effectiveDays(item: LoanItem): number {
    if (item.due_days && item.due_days > 0) return item.due_days
    const cat = LOAN_CATEGORIES.find((c) => c.value === item.loan_category)
    return cat?.days ?? 30
  }

  function handleOpenVerify(loan: LoanItem) {
    setSelectedLoan(loan)
    verifyForm.reset({ verify_date: todayISO(), verify_name: userName ?? '' })
    setVerifyOpen(true)
  }

  function handleOpenApprove(loan: LoanItem) {
    setSelectedLoan(loan)
    approveForm.reset({ approve_date: todayISO(), approve_name: '', approve_amount: Number(loan.amount) })
    setApproveOpen(true)
  }

  function handleOpenDisburse(loan: LoanItem) {
    setSelectedLoan(loan)
    disburseForm.reset({ receipt_date: todayISO() })
    setDisburseOpen(true)
  }

  function handleOpenReturn(loan: LoanItem) {
    setSelectedLoan(loan)
    returnForm.reset({
      returned_date: todayISO(),
      return_cash: 0,
      return_voucher_amount: 0,
      evidence_no: '',
      note: '',
    })
    setReturnOpen(true)
  }

  function handleOpenEvidence(loan: LoanItem) {
    setSelectedLoanForEvidence(loan)
    setEvidenceOpen(true)
  }

  function handleCancel(loan: LoanItem) {
    if (window.confirm(`ยืนยันยกเลิกสัญญา ${loan.la_no} หรือไม่?`)) {
      cancelMutation.mutate(loan)
    }
  }

  function handleExport() {
    const exportRows = loans.map((l) => ({
      'เลขที่บย.': l.la_no ?? '-',
      'ผู้ยืม': l.borrower_name ?? '-',
      'ประเภทเงิน': l.money_type_name ?? '-',
      'ประเภทการยืม': l.loan_category_name,
      'ยอดเงิน (บาท)': Number(l.amount),
      'วันยืม': fmtDateTH(l.borrow_date),
      'วันรับเงิน': l.receipt_date ? fmtDateTH(l.receipt_date) : '-',
      'วันครบกำหนด': l.due_date ? fmtDateTH(l.due_date) : '-',
      'วันส่งใช้': l.returned_date ? fmtDateTH(l.returned_date) : '-',
      'สถานะ': l.status_name,
    }))
    exportToXlsx(exportRows, 'สัญญายืมเงิน', `loan-agreement-${budgetYear}`)
  }

  // ─── Table columns ────────────────────────────────────────────────────────

  const watchDueDaysPreview = disburseForm.watch('receipt_date')

  const columns = [
    {
      header: 'บย.ที่',
      render: (item: LoanItem) => (
        <span className="font-medium text-blue-700">{item.la_no ?? '-'}</span>
      ),
      headerClassName: 'w-20',
    },
    {
      header: 'ผู้ยืม',
      render: (item: LoanItem) => <span>{item.borrower_name ?? '-'}</span>,
    },
    {
      header: 'ประเภทเงิน',
      render: (item: LoanItem) => <span className="text-gray-600">{item.money_type_name ?? '-'}</span>,
    },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: LoanItem) => (
        <span className="font-semibold">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
      ),
      headerClassName: 'text-right',
      className: 'text-right',
    },
    {
      header: 'วันยืม',
      render: (item: LoanItem) => <span>{fmtDateTH(item.borrow_date)}</span>,
    },
    {
      header: 'กำหนดส่งใช้',
      render: (item: LoanItem) => (
        <span className={item.is_overdue ? 'text-red-600 font-medium' : ''}>
          {item.due_date ? fmtDateTH(item.due_date) : '-'}
        </span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: LoanItem) => <StatusBadge status={item.status} isOverdue={item.is_overdue} />,
    },
    {
      header: 'จัดการ',
      render: (item: LoanItem) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => printLoan(item)}
            title="พิมพ์สัญญายืมเงิน (ตัวอย่างที่ 34)"
          >
            <Printer className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => printLoanRequest(item)}
            title="พิมพ์บันทึกข้อความขออนุมัติยืมเงิน (ตัวอย่างที่ 22/33)"
          >
            <Printer className="h-3 w-3 mr-1" />
            ขออนุมัติยืม
          </Button>

          {item.status === ST.PENDING_VERIFY && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-indigo-600 hover:border-indigo-300"
              onClick={() => handleOpenVerify(item)}
              title="ตรวจสอบ"
            >
              <ClipboardCheck className="h-3 w-3 mr-1" />
              ตรวจสอบ
            </Button>
          )}

          {item.status === ST.PENDING_APPROVE && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-violet-600 hover:border-violet-300"
              onClick={() => handleOpenApprove(item)}
              title="อนุมัติ"
            >
              <Stamp className="h-3 w-3 mr-1" />
              อนุมัติ
            </Button>
          )}

          {item.status === ST.PENDING_DISBURSE && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-emerald-600 hover:border-emerald-300"
              onClick={() => handleOpenDisburse(item)}
              title="จ่าย/รับเงิน"
            >
              <Banknote className="h-3 w-3 mr-1" />
              รับเงิน
            </Button>
          )}

          {item.status === ST.OUTSTANDING && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleOpenReturn(item)}
              title="บันทึกการส่งใช้เงินยืม"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              ส่งใช้
            </Button>
          )}

          {item.status === ST.RETURNED && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleOpenEvidence(item)}
              title="ดูใบรับใบสำคัญ"
            >
              <Eye className="h-3 w-3 mr-1" />
              ใบสำคัญ
            </Button>
          )}

          {item.status === ST.RETURNED && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => printLoanReturn(item)}
              title="พิมพ์บันทึกข้อความส่งใช้เงินยืม (ตัวอย่างที่ 35)"
            >
              <Printer className="h-3 w-3 mr-1" />
              บันทึกส่งใช้
            </Button>
          )}

          {item.status === ST.RETURNED && Number(item.return_voucher_amount ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => printVoucherReceipt(item)}
              title="พิมพ์ใบรับใบสำคัญ (ตัวอย่างที่ 37)"
            >
              <Printer className="h-3 w-3 mr-1" />
              ใบรับใบสำคัญ
            </Button>
          )}

          {(item.status === ST.PENDING_VERIFY ||
            item.status === ST.PENDING_APPROVE ||
            item.status === ST.PENDING_DISBURSE ||
            item.status === ST.OUTSTANDING) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
              onClick={() => handleCancel(item)}
              title="ยกเลิกสัญญา"
            >
              ยกเลิก
            </Button>
          )}
        </div>
      ),
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="ทะเบียนคุมสัญญายืมเงิน (บย.)"
        subtitle={budgetYear ? `ปีงบประมาณ ${budgetYear} — ขั้นตอน: ตรวจสอบ → อนุมัติ → รับเงิน → ส่งใช้` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrintRegister} disabled={loans.length === 0}>
              <Printer className="h-4 w-4 mr-1" />
              พิมพ์ทะเบียนคุม
            </Button>
            <Button variant="outline" onClick={handlePrintCashEquivalent} disabled={loans.length === 0}>
              <Printer className="h-4 w-4 mr-1" />
              เอกสารแทนตัวเงิน (ตย.4)
            </Button>
            <ExportButton
              onExport={handleExport}
              loading={loans.length === 0}
            />
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มสัญญายืมเงิน
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={pagedLoans}
        total={totalLoans}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loansLoading}
        emptyText="ไม่พบสัญญายืมเงิน"
      />

      {/* ─── Add Dialog ─────────────────────────────────────────────────────── */}
      <FormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="เพิ่มสัญญายืมเงิน (ตัวอย่างที่ 34)"
        size="xl"
        submitLabel="สร้างสัญญา"
        loading={addMutation.isPending}
        onSubmit={addForm.handleSubmit((v) => addMutation.mutate(v))}
      >
        <div className="space-y-4">
          {/* ผู้ยืม */}
          <div className="space-y-1">
            <Label>ผู้ยืม <span className="text-red-500">*</span></Label>
            <Select
              value={addForm.watch('borrower_id') ? String(addForm.watch('borrower_id')) : ''}
              onValueChange={(v) => addForm.setValue('borrower_id', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกผู้ยืม" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((a) => (
                  <SelectItem key={a.admin_id} value={String(a.admin_id)}>
                    {a.name ?? a.username ?? `ID ${a.admin_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addForm.formState.errors.borrower_id && (
              <p className="text-xs text-red-500">{addForm.formState.errors.borrower_id.message}</p>
            )}
          </div>

          {/* ตำแหน่งผู้ยืม */}
          <div className="space-y-1">
            <Label>ตำแหน่งผู้ยืม</Label>
            <Input {...addForm.register('borrower_position')} placeholder="เช่น ครู คศ.2" />
          </div>

          {/* สังกัด + จังหวัด */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>สังกัด</Label>
              <Input {...addForm.register('affiliation')} placeholder="เช่น โรงเรียน... สพป.... เขต..." />
            </div>
            <div className="space-y-1">
              <Label>จังหวัด</Label>
              <Input {...addForm.register('province')} placeholder="จังหวัด" />
            </div>
          </div>

          {/* ประเภทเงิน */}
          <div className="space-y-1">
            <Label>ขอยืมเงินจาก (ประเภทเงิน) <span className="text-red-500">*</span></Label>
            <Select
              value={addForm.watch('money_type_id') ? String(addForm.watch('money_type_id')) : ''}
              onValueChange={(v) => addForm.setValue('money_type_id', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทเงิน" />
              </SelectTrigger>
              <SelectContent>
                {budgetTypes.map((bt) => (
                  <SelectItem key={bt.bg_type_id} value={String(bt.bg_type_id)}>
                    {bt.budget_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addForm.formState.errors.money_type_id && (
              <p className="text-xs text-red-500">{addForm.formState.errors.money_type_id.message}</p>
            )}
          </div>

          {/* ประเภทการยืม + จำนวนวันส่งใช้ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ประเภทการยืม <span className="text-red-500">*</span></Label>
              <Select
                value={String(addForm.watch('loan_category'))}
                onValueChange={(v) => addForm.setValue('loan_category', Number(v), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทการยืม" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={String(c.value)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>จำนวนวันส่งใช้</Label>
              <Input
                type="number"
                min={0}
                {...addForm.register('due_days', {
                  setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)),
                })}
                placeholder="0 = ตามประเภท"
              />
            </div>
          </div>

          {/* วัตถุประสงค์ */}
          <div className="space-y-1">
            <Label>เพื่อเป็นค่าใช้จ่ายในการ (วัตถุประสงค์)</Label>
            <Input {...addForm.register('purpose')} placeholder="เช่น จัดค่ายกลางวัน" />
          </div>

          {/* รายละเอียดการใช้เงิน */}
          <div className="space-y-1">
            <Label>รายละเอียดการใช้เงิน</Label>
            <textarea
              {...addForm.register('expense_detail')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="เช่น จัดทำค่ายกลางวันให้นักเรียน 215 คน วันละ 13 บาท จำนวน 5 วัน"
            />
          </div>

          {/* จำนวนเงิน */}
          <div className="space-y-1">
            <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              {...addForm.register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {addForm.formState.errors.amount && (
              <p className="text-xs text-red-500">{addForm.formState.errors.amount.message}</p>
            )}
          </div>

          {/* วันที่ยืม */}
          <div className="space-y-1">
            <Label>วันที่ทำสัญญายืม <span className="text-red-500">*</span></Label>
            <ThaiDatePicker
              value={addForm.watch('borrow_date') ?? ''}
              onChange={(v) => addForm.setValue('borrow_date', v, { shouldValidate: true })}
            />
            {addForm.formState.errors.borrow_date && (
              <p className="text-xs text-red-500">{addForm.formState.errors.borrow_date.message}</p>
            )}
            <p className="text-xs text-blue-600 mt-1">
              กำหนดส่งใช้ภายใน <span className="font-medium">{effectiveDueDays}</span> วัน นับแต่วันรับเงิน
            </p>
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Input {...addForm.register('note')} placeholder="หมายเหตุ..." />
          </div>
        </div>
      </FormDialog>

      {/* ─── Verify Dialog ──────────────────────────────────────────────────── */}
      <FormDialog
        open={verifyOpen}
        onClose={() => { setVerifyOpen(false); setSelectedLoan(null) }}
        title={`ตรวจสอบสัญญายืมเงิน ${selectedLoan?.la_no ?? ''}`}
        size="sm"
        submitLabel="ยืนยันการตรวจสอบ"
        loading={verifyMutation.isPending}
        onSubmit={verifyForm.handleSubmit((v) => verifyMutation.mutate(v))}
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-50 p-3 text-sm space-y-1">
              <p><span className="text-gray-500">ผู้ยืม:</span> <span className="font-medium">{selectedLoan.borrower_name ?? '-'}</span></p>
              <p><span className="text-gray-500">ยอดยืม:</span> <span className="font-semibold text-indigo-700">{selectedLoan.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span></p>
            </div>
            <div className="space-y-1">
              <Label>ชื่อผู้ตรวจสอบ</Label>
              <Input {...verifyForm.register('verify_name')} placeholder="ชื่อ-สกุล เจ้าหน้าที่การเงิน" />
            </div>
            <div className="space-y-1">
              <Label>วันที่ตรวจสอบ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker
                value={verifyForm.watch('verify_date') ?? ''}
                onChange={(v) => verifyForm.setValue('verify_date', v, { shouldValidate: true })}
              />
              {verifyForm.formState.errors.verify_date && (
                <p className="text-xs text-red-500">{verifyForm.formState.errors.verify_date.message}</p>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* ─── Approve Dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={approveOpen}
        onClose={() => { setApproveOpen(false); setSelectedLoan(null) }}
        title={`อนุมัติสัญญายืมเงิน ${selectedLoan?.la_no ?? ''}`}
        size="sm"
        submitLabel="อนุมัติ"
        loading={approveMutation.isPending}
        onSubmit={approveForm.handleSubmit((v) => approveMutation.mutate(v))}
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="rounded-lg bg-violet-50 p-3 text-sm space-y-1">
              <p><span className="text-gray-500">ผู้ยืม:</span> <span className="font-medium">{selectedLoan.borrower_name ?? '-'}</span></p>
              <p><span className="text-gray-500">ยอดยืม:</span> <span className="font-semibold text-violet-700">{selectedLoan.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span></p>
              {selectedLoan.verify_name && (
                <p><span className="text-gray-500">ตรวจสอบโดย:</span> {selectedLoan.verify_name} ({fmtDateTH(selectedLoan.verify_date)})</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>ชื่อผู้อนุมัติ (ผอ.)</Label>
              <Input {...approveForm.register('approve_name')} placeholder="ชื่อ-สกุล ผู้อำนวยการ" />
            </div>
            <div className="space-y-1">
              <Label>จำนวนเงินที่อนุมัติ (บาท) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                {...approveForm.register('approve_amount', { valueAsNumber: true })}
              />
              {approveForm.formState.errors.approve_amount && (
                <p className="text-xs text-red-500">{approveForm.formState.errors.approve_amount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>วันที่อนุมัติ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker
                value={approveForm.watch('approve_date') ?? ''}
                onChange={(v) => approveForm.setValue('approve_date', v, { shouldValidate: true })}
              />
              {approveForm.formState.errors.approve_date && (
                <p className="text-xs text-red-500">{approveForm.formState.errors.approve_date.message}</p>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* ─── Disburse Dialog ────────────────────────────────────────────────── */}
      <FormDialog
        open={disburseOpen}
        onClose={() => { setDisburseOpen(false); setSelectedLoan(null) }}
        title={`รับเงิน / จ่ายเงินยืม ${selectedLoan?.la_no ?? ''}`}
        size="sm"
        submitLabel="ยืนยันการรับเงิน"
        loading={disburseMutation.isPending}
        onSubmit={disburseForm.handleSubmit((v) => disburseMutation.mutate(v))}
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-sm space-y-1">
              <p><span className="text-gray-500">ผู้ยืม:</span> <span className="font-medium">{selectedLoan.borrower_name ?? '-'}</span></p>
              <p><span className="text-gray-500">ยอดยืม:</span> <span className="font-semibold text-emerald-700">{selectedLoan.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span></p>
              <p className="text-xs text-gray-500">การกดยืนยันจะตัดยอดเงินออกจากประเภทเงินที่ยืม</p>
            </div>
            <div className="space-y-1">
              <Label>วันที่รับเงิน <span className="text-red-500">*</span></Label>
              <ThaiDatePicker
                value={disburseForm.watch('receipt_date') ?? ''}
                onChange={(v) => disburseForm.setValue('receipt_date', v, { shouldValidate: true })}
              />
              {disburseForm.formState.errors.receipt_date && (
                <p className="text-xs text-red-500">{disburseForm.formState.errors.receipt_date.message}</p>
              )}
              {watchDueDaysPreview && (
                <p className="text-xs text-emerald-700 mt-1">
                  กำหนดส่งใช้: <span className="font-medium">{fmtDateTH(addDays(watchDueDaysPreview, effectiveDays(selectedLoan)))}</span>
                  {' '}(ภายใน {effectiveDays(selectedLoan)} วัน)
                </p>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* ─── Return Dialog ──────────────────────────────────────────────────── */}
      <FormDialog
        open={returnOpen}
        onClose={() => { setReturnOpen(false); setSelectedLoan(null) }}
        title={`ส่งใช้เงินยืม ${selectedLoan?.la_no ?? ''}`}
        size="md"
        submitLabel="บันทึกการส่งใช้"
        loading={returnMutation.isPending}
        onSubmit={returnForm.handleSubmit((v) => returnMutation.mutate(v))}
      >
        {selectedLoan && (
          <div className="space-y-4">
            {/* ข้อมูลสัญญา */}
            <div className="rounded-lg bg-blue-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">ผู้ยืม:</span>{' '}
                <span className="font-medium">{selectedLoan.borrower_name ?? '-'}</span>
              </p>
              <p>
                <span className="text-gray-500">ยอดยืม:</span>{' '}
                <span className="font-semibold text-blue-700">
                  {selectedLoan.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </p>
              <p>
                <span className="text-gray-500">กำหนดส่งใช้:</span>{' '}
                <span className={selectedLoan.is_overdue ? 'text-red-600 font-medium' : ''}>
                  {selectedLoan.due_date ? fmtDateTH(selectedLoan.due_date) : '-'}
                </span>
              </p>
            </div>

            {/* วันที่ส่งใช้ */}
            <div className="space-y-1">
              <Label>วันที่ส่งใช้ <span className="text-red-500">*</span></Label>
              <ThaiDatePicker
                value={returnForm.watch('returned_date') ?? ''}
                onChange={(v) => returnForm.setValue('returned_date', v, { shouldValidate: true })}
              />
              {returnForm.formState.errors.returned_date && (
                <p className="text-xs text-red-500">{returnForm.formState.errors.returned_date.message}</p>
              )}
            </div>

            {/* เงินสดคืน */}
            <div className="space-y-1">
              <Label>เงินสดคืน (บาท)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                {...returnForm.register('return_cash', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {returnForm.formState.errors.return_cash && (
                <p className="text-xs text-red-500">{returnForm.formState.errors.return_cash.message}</p>
              )}
            </div>

            {/* ใบสำคัญคืน */}
            <div className="space-y-1">
              <Label>ใบสำคัญ (บาท)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                {...returnForm.register('return_voucher_amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {returnForm.formState.errors.return_voucher_amount && (
                <p className="text-xs text-red-500">{returnForm.formState.errors.return_voucher_amount.message}</p>
              )}
            </div>

            {/* รวมส่งใช้ */}
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">รวมส่งใช้:</span>
                <span
                  className={`font-semibold text-base ${
                    returnTotal >= selectedLoan.amount ? 'text-green-600' : 'text-amber-600'
                  }`}
                >
                  {returnTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
              {returnTotal < selectedLoan.amount && returnTotal > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ขาด {(selectedLoan.amount - returnTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ต้องส่งใช้ครบยอดยืม)
                </p>
              )}
            </div>

            {/* เลขที่ใบรับใบสำคัญ */}
            <div className="space-y-1">
              <Label>เลขที่ใบรับใบสำคัญ</Label>
              <Input {...returnForm.register('evidence_no')} placeholder="เลขที่ใบรับ..." />
            </div>

            {/* หมายเหตุ */}
            <div className="space-y-1">
              <Label>หมายเหตุ</Label>
              <Input {...returnForm.register('note')} placeholder="หมายเหตุ..." />
            </div>
          </div>
        )}
      </FormDialog>

      {/* ─── Evidence Dialog (view-only) ────────────────────────────────────── */}
      <FormDialog
        open={evidenceOpen}
        onClose={() => { setEvidenceOpen(false); setSelectedLoanForEvidence(null) }}
        title={`ใบรับใบสำคัญ — ${selectedLoanForEvidence?.la_no ?? ''}`}
        size="md"
      >
        {evidenceLoading ? (
          <p className="text-center text-gray-500 py-6">กำลังโหลด...</p>
        ) : (evidenceData ?? []).length === 0 ? (
          <p className="text-center text-gray-500 py-6">ไม่พบข้อมูลใบรับใบสำคัญ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-blue-900">เลขที่</th>
                  <th className="px-3 py-2 text-left font-bold text-blue-900">วันที่</th>
                  <th className="px-3 py-2 text-right font-bold text-blue-900">เงินสด</th>
                  <th className="px-3 py-2 text-right font-bold text-blue-900">ใบสำคัญ</th>
                  <th className="px-3 py-2 text-right font-bold text-blue-900">รวม</th>
                  <th className="px-3 py-2 text-left font-bold text-blue-900">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(evidenceData ?? []).map((e) => (
                  <tr key={e.lre_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{e.evidence_no ?? '-'}</td>
                    <td className="px-3 py-2">{fmtDateTH(e.evidence_date)}</td>
                    <td className="px-3 py-2 text-right">
                      {e.cash_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {e.voucher_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {e.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{e.note ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
