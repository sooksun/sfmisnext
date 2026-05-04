'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, RotateCcw, Eye, AlertTriangle, Printer } from 'lucide-react'
import { openPrintWindow, makeHeader, makeSignatures, fmtBaht, numberToThaiBaht, esc, thaiFullDate } from '@/lib/print-utils'
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
  money_type_name: string | null
  loan_category: number
  loan_category_name: string
  purpose: string | null
  amount: number
  borrow_date: string | null
  due_date: string | null
  returned_date: string | null
  return_cash: number | null
  return_voucher_amount: number | null
  return_total: number
  status: number
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

// getStorageData replaced by useAppContext hook

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const addSchema = z.object({
  borrower_id: z.number({ error: 'กรุณาเลือกผู้ยืม' }).min(1, 'กรุณาเลือกผู้ยืม'),
  money_type_id: z.number({ error: 'กรุณาเลือกประเภทเงิน' }).min(1, 'กรุณาเลือกประเภทเงิน'),
  loan_category: z.number({ error: 'กรุณาเลือกประเภทการยืม' }).min(1, 'กรุณาเลือกประเภทการยืม'),
  purpose: z.string().optional(),
  amount: z.number({ error: 'กรุณาระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  borrow_date: z.string().min(1, 'กรุณาระบุวันที่ยืม'),
  note: z.string().optional(),
})

type AddForm = z.infer<typeof addSchema>

const returnSchema = z.object({
  returned_date: z.string().min(1, 'กรุณาระบุวันที่คืน'),
  return_cash: z.number().min(0, 'จำนวนเงินสดต้องไม่ติดลบ'),
  return_voucher_amount: z.number().min(0, 'จำนวนใบสำคัญต้องไม่ติดลบ'),
  evidence_no: z.string().optional(),
  note: z.string().optional(),
})

type ReturnForm = z.infer<typeof returnSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isOverdue }: { status: number; isOverdue: boolean }) {
  if (status === 1 && isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        เกินกำหนด
      </span>
    )
  }
  if (status === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        ค้างชำระ
      </span>
    )
  }
  if (status === 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        คืนแล้ว
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      ยกเลิก
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LoanAgreementPage() {
  const { scId, syId, adminId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  // dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
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
    queryFn: () => apiGet<{ data: AdminItem[] }>(`Admin/loadAdmin/${scId}`),
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

  const pagedLoans = useMemo(
    () => loans.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [loans, page],
  )

  // ─── Add Form ─────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      borrower_id: 0,
      money_type_id: 0,
      loan_category: 2,
      purpose: '',
      amount: 0,
      borrow_date: '',
      note: '',
    },
  })

  const watchBorrowDate = addForm.watch('borrow_date')
  const watchLoanCategory = addForm.watch('loan_category')

  const previewDueDate = useMemo(() => {
    if (!watchBorrowDate) return null
    const cat = LOAN_CATEGORIES.find((c) => c.value === watchLoanCategory)
    const days = cat?.days ?? 30
    return addDays(watchBorrowDate, days)
  }, [watchBorrowDate, watchLoanCategory])

  const addMutation = useMutation({
    mutationFn: (values: AddForm) =>
      apiPost<{ flag: boolean; ms: string }>('LoanAgreement/addLoanAgreement', {
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        borrower_id: values.borrower_id,
        money_type_id: values.money_type_id,
        loan_category: values.loan_category,
        purpose: values.purpose ?? '',
        amount: values.amount,
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

  function printLoan(item: LoanItem) {
    const header = makeHeader({
      title: 'สัญญายืมเงิน (บย.)',
      subtitle: 'ตามระเบียบกระทรวงการคลังว่าด้วยการเบิกเงินจากคลัง การรับเงิน การจ่ายเงิน การเก็บรักษาเงินและการนำเงินส่งคลัง',
      docNo: item.la_no ?? undefined,
      docDate: item.borrow_date ?? undefined,
    })
    const body = `
<p>ข้าพเจ้า <b>${esc(item.borrower_name ?? '-')}</b> ขอทำสัญญายืมเงินจากราชการ
ประเภทเงินยืม: ${esc(item.loan_category_name ?? '-')}${item.money_type_name ? ` (${esc(item.money_type_name)})` : ''}</p>
<table>
  <tr><th style="width:35%">รายการ</th><th>รายละเอียด</th></tr>
  <tr><td>วัตถุประสงค์การยืม</td><td>${esc(item.purpose ?? '-')}</td></tr>
  <tr><td>จำนวนเงินที่ยืม</td><td class="num">${fmtBaht(item.amount)} บาท</td></tr>
  <tr><td>(ตัวอักษร)</td><td>${esc(numberToThaiBaht(Number(item.amount)))}</td></tr>
  <tr><td>วันที่ยืม</td><td>${esc(thaiFullDate(item.borrow_date))}</td></tr>
  <tr><td>กำหนดคืน</td><td>${esc(thaiFullDate(item.due_date))}</td></tr>
</table>
<p class="mt-6">ข้าพเจ้าสัญญาว่าจะใช้เงินยืมนี้เพื่อวัตถุประสงค์ดังกล่าวเท่านั้น
และจะส่งใบสำคัญคู่จ่ายหรือคืนเงินยืมภายในวันที่กำหนด หากผิดสัญญา
ข้าพเจ้ายินยอมให้หักเงินเดือนหรือเงินอื่นใดที่พึงได้จากทางราชการชำระคืนเงินยืมพร้อมดอกเบี้ยตามกฎหมาย</p>
${item.note ? `<p><b>หมายเหตุ:</b> ${esc(item.note)}</p>` : ''}`
    openPrintWindow({
      title: `สัญญายืมเงิน_${item.la_no || item.la_id}`,
      body: header + body + makeSignatures(['ผู้ยืม', 'พยาน', 'ผู้อนุมัติ']),
    })
  }

  function handleOpenReturn(loan: LoanItem) {
    setSelectedLoan(loan)
    returnForm.reset({
      returned_date: '',
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
    if (window.confirm(`ยืนยันยกเลิกสัญญา บย.${loan.la_no} หรือไม่?`)) {
      cancelMutation.mutate(loan)
    }
  }

  function handleExport() {
    const statusLabel = (loan: LoanItem) => {
      if (loan.status === 1 && loan.is_overdue) return 'เกินกำหนด'
      if (loan.status === 1) return 'ค้างชำระ'
      if (loan.status === 2) return 'คืนแล้ว'
      return 'ยกเลิก'
    }
    const exportRows = loans.map((l) => ({
      'เลขที่บย.': l.la_no ?? '-',
      'ผู้ยืม': l.borrower_name ?? '-',
      'ประเภทเงิน': l.money_type_name ?? '-',
      'ประเภทการยืม': l.loan_category_name,
      'ยอดเงิน (บาท)': Number(l.amount),
      'วันยืม': fmtDateTH(l.borrow_date),
      'วันครบกำหนด': fmtDateTH(l.due_date),
      'วันคืนจริง': l.returned_date ? fmtDateTH(l.returned_date) : '-',
      'สถานะ': statusLabel(l),
    }))
    exportToXlsx(exportRows, 'สัญญายืมเงิน', `loan-agreement-${budgetYear}`)
  }

  // ─── Table columns ────────────────────────────────────────────────────────

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
      header: 'ประเภทการยืม',
      render: (item: LoanItem) => <span>{item.loan_category_name}</span>,
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
      header: 'กำหนดคืน',
      render: (item: LoanItem) => (
        <span className={item.is_overdue ? 'text-red-600 font-medium' : ''}>
          {fmtDateTH(item.due_date)}
        </span>
      ),
    },
    {
      header: 'วันคืนจริง',
      render: (item: LoanItem) => <span>{item.returned_date ? fmtDateTH(item.returned_date) : '-'}</span>,
    },
    {
      header: 'สถานะ',
      render: (item: LoanItem) => <StatusBadge status={item.status} isOverdue={item.is_overdue} />,
    },
    {
      header: 'จัดการ',
      render: (item: LoanItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => printLoan(item)}
            title="พิมพ์สัญญายืมเงิน"
          >
            <Printer className="h-3 w-3" />
          </Button>
          {item.status === 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleOpenReturn(item)}
              title="บันทึกการคืนเงิน"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              คืน
            </Button>
          )}
          {item.status === 2 && (
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
          {item.status === 1 && (
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
        subtitle={budgetYear ? `ปีงบประมาณ ${budgetYear}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              onExport={handleExport}
              loading={loans.length === 0}
            />
            <Button onClick={() => { addForm.reset(); setAddOpen(true) }}>
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
        title="เพิ่มสัญญายืมเงิน (บย.)"
        size="md"
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

          {/* ประเภทเงิน */}
          <div className="space-y-1">
            <Label>ประเภทเงิน <span className="text-red-500">*</span></Label>
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

          {/* ประเภทการยืม */}
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
            {addForm.formState.errors.loan_category && (
              <p className="text-xs text-red-500">{addForm.formState.errors.loan_category.message}</p>
            )}
          </div>

          {/* วัตถุประสงค์ */}
          <div className="space-y-1">
            <Label>วัตถุประสงค์การยืม</Label>
            <Input {...addForm.register('purpose')} placeholder="ระบุวัตถุประสงค์..." />
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

          {/* วันที่ยืม + preview กำหนดคืน */}
          <div className="space-y-1">
            <Label>วันที่ยืม <span className="text-red-500">*</span></Label>
            <ThaiDatePicker
              value={watchBorrowDate ?? ''}
              onChange={(v) => addForm.setValue('borrow_date', v, { shouldValidate: true })}
            />
            {addForm.formState.errors.borrow_date && (
              <p className="text-xs text-red-500">{addForm.formState.errors.borrow_date.message}</p>
            )}
            {previewDueDate && (
              <p className="text-xs text-blue-600 mt-1">
                กำหนดส่งคืน: <span className="font-medium">{fmtDateTH(previewDueDate)}</span>
              </p>
            )}
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Input {...addForm.register('note')} placeholder="หมายเหตุ..." />
          </div>
        </div>
      </FormDialog>

      {/* ─── Return Dialog ──────────────────────────────────────────────────── */}
      <FormDialog
        open={returnOpen}
        onClose={() => { setReturnOpen(false); setSelectedLoan(null) }}
        title={`บันทึกการคืนเงิน บย.${selectedLoan?.la_no ?? ''}`}
        size="md"
        submitLabel="บันทึกการคืนเงิน"
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
                <span className="text-gray-500">กำหนดคืน:</span>{' '}
                <span className={selectedLoan.is_overdue ? 'text-red-600 font-medium' : ''}>
                  {fmtDateTH(selectedLoan.due_date)}
                </span>
              </p>
            </div>

            {/* วันที่คืน */}
            <div className="space-y-1">
              <Label>วันที่คืนเงิน <span className="text-red-500">*</span></Label>
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
              <Label>ใบสำคัญคืน (บาท)</Label>
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

            {/* รวมคืน */}
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">รวมคืน:</span>
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
                  ขาด {(selectedLoan.amount - returnTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
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
        title={`ใบรับใบสำคัญ — บย.${selectedLoanForEvidence?.la_no ?? ''}`}
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
