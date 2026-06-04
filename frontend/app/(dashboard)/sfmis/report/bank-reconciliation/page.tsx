'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, PenLine, Plus, Trash2, Scale, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { openPrintWindow } from '@/lib/print-utils'
import { officialBankReconciliationForm } from '@/lib/official-forms'
import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
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
import { fmtDateTH, showNumber, toBE } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  ba_id: number
  ba_name: string
  ba_no: string
  bank_name: string
}

interface ReconItem {
  bri_id: number
  item_type: number
  item_type_name: string
  doc_ref: string | null
  detail: string | null
  amount: number
}

interface ReconDetail {
  br_id: number
  ba_id: number
  recon_month: string | null
  book_balance: number
  bank_statement_balance: number
  adjustment_total: number
  adjusted_book_balance: number
  difference: number
  is_balanced: boolean
  note: string | null
  signed_name: string | null
  signed_at: string | null
  items: ReconItem[]
}

interface ReconSummary {
  br_id: number
  recon_month: string | null
  is_balanced: boolean
  difference: number
  signed_name: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function buildMonthOptions(count = 12) {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const beYear = toBE(d.getFullYear())
    opts.push({ value: val, label: `${THAI_MONTHS_FULL[d.getMonth()]} ${beYear}` })
  }
  return opts
}

function monthLabel(yearMonth: string | null | undefined, opts: { value: string; label: string }[]) {
  if (!yearMonth) return ''
  return opts.find((o) => o.value === yearMonth)?.label ?? yearMonth
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  recon_month: z.string().min(7, 'กรุณาเลือกเดือน'),
  book_balance: z.number(),
  bank_statement_balance: z.number(),
  note: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const addItemSchema = z.object({
  item_type: z.number().int().min(1).max(3),
  doc_ref: z.string().optional(),
  detail: z.string().optional(),
  amount: z.number(),
})
type AddItemForm = z.infer<typeof addItemSchema>

// ── Main Component ────────────────────────────────────────────────────────────

export default function BankReconciliationPage() {
  const { scId, adminId, scName } = useAppContext()
  const qc = useQueryClient()
  const [selectedBaId, setSelectedBaId] = useState(0)
  const [selectedBrId, setSelectedBrId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signNote, setSignNote] = useState('')

  const monthOptions = buildMonthOptions(12)

  // ── Load localStorage ──────────────────────────────────────────────────────

  // ── Forms ──────────────────────────────────────────────────────────────────
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      recon_month: monthOptions[0]?.value ?? '',
      book_balance: 0,
      bank_statement_balance: 0,
      note: '',
    },
  })

  const addItemForm = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      item_type: 1,
      doc_ref: '',
      detail: '',
      amount: 0,
    },
  })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', scId],
    queryFn: () => apiGet<BankAccount[]>(`Bank/loadBankAccount/${scId}`),
    enabled: scId > 0,
  })

  const { data: reconList = [] } = useQuery({
    queryKey: ['bank-reconciliations', scId, selectedBaId],
    queryFn: () =>
      apiGet<ReconSummary[]>(`BankReconciliation/loadReconciliations/${scId}/${selectedBaId}`),
    enabled: scId > 0 && selectedBaId > 0,
  })

  const { data: reconDetail } = useQuery({
    queryKey: ['bank-recon-detail', selectedBrId],
    queryFn: () => apiGet<ReconDetail>(`BankReconciliation/loadDetail/${selectedBrId}`),
    enabled: selectedBrId !== null,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      apiPost('BankReconciliation/createOrUpdate', {
        sc_id: scId,
        ba_id: selectedBaId,
        recon_month: values.recon_month,
        book_balance: values.book_balance,
        bank_statement_balance: values.bank_statement_balance,
        note: values.note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['bank-reconciliations'] })
        if (res.br_id) setSelectedBrId(res.br_id)
        setCreateDialogOpen(false)
        createForm.reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const addItemMutation = useMutation({
    mutationFn: (values: AddItemForm) =>
      apiPost('BankReconciliation/addItem', {
        br_id: selectedBrId,
        item_type: values.item_type,
        doc_ref: values.doc_ref || undefined,
        detail: values.detail || undefined,
        amount: values.amount,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'เพิ่มรายการเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['bank-recon-detail', selectedBrId] })
        qc.invalidateQueries({ queryKey: ['bank-reconciliations'] })
        setAddItemDialogOpen(false)
        addItemForm.reset({ item_type: 1, doc_ref: '', detail: '', amount: 0 })
      } else {
        toast.error(res.ms || 'มีปัญหาในการเพิ่มรายการ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const removeItemMutation = useMutation({
    mutationFn: (briId: number) =>
      apiPost('BankReconciliation/removeItem', { bri_id: briId, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'ลบรายการเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['bank-recon-detail', selectedBrId] })
        qc.invalidateQueries({ queryKey: ['bank-reconciliations'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const signMutation = useMutation({
    mutationFn: () =>
      apiPost('BankReconciliation/signOff', {
        br_id: selectedBrId,
        signed_by: adminId,
        note: signNote || undefined,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'ลงนามเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['bank-recon-detail', selectedBrId] })
        qc.invalidateQueries({ queryKey: ['bank-reconciliations'] })
        setSignDialogOpen(false)
        setSignNote('')
      } else {
        toast.error(res.ms || 'มีปัญหาในการลงนาม')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const selectedAccount = bankAccounts.find((a) => a.ba_id === selectedBaId)

  const handleSelectBaId = (baId: number) => {
    setSelectedBaId(baId)
    setSelectedBrId(null)
  }

  const handleOpenCreate = () => {
    createForm.reset({
      recon_month: monthOptions[0]?.value ?? '',
      book_balance: 0,
      bank_statement_balance: 0,
      note: '',
    })
    setCreateDialogOpen(true)
  }

  // พิมพ์แบบฟอร์ม "งบเทียบยอดเงินฝากธนาคาร" (สพฐ. 2567)
  const handlePrint = () => {
    if (!reconDetail) return
    const ym = reconDetail.recon_month || ''
    let dateStr = ''
    if (/^\d{4}-\d{2}$/.test(ym)) {
      const [y, m] = ym.split('-').map(Number)
      const last = new Date(y, m, 0).getDate()
      dateStr = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    }
    const checks = reconDetail.items
      .filter((i) => i.item_type === 1)
      .map((i) => ({
        label: `เช็คเลขที่ ${i.doc_ref ?? '-'}${i.detail ? ' ' + i.detail : ''}`,
        amount: Math.abs(Number(i.amount)),
      }))
    const deposits = reconDetail.items
      .filter((i) => i.item_type !== 1)
      .map((i) => ({
        label: i.detail ?? i.doc_ref ?? 'รายการ',
        amount: Math.abs(Number(i.amount)),
      }))
    const body = officialBankReconciliationForm({
      scName,
      bankName: selectedAccount?.bank_name,
      accountNo: selectedAccount?.ba_no,
      date: dateStr,
      bankStatementBalance: Number(reconDetail.bank_statement_balance),
      outstandingChecks: checks,
      depositsInTransit: deposits,
      bookBalance: Number(reconDetail.book_balance),
      preparerName: reconDetail.signed_name ?? undefined,
    })
    openPrintWindow({ title: `งบเทียบยอด_${ym}`, body })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="งบเทียบยอดเงินฝากธนาคาร"
        subtitle="Bank Reconciliation — จัดทำทุกสิ้นเดือน ส่ง สพป. ภายในวันที่ 5"
        actions={
          selectedBaId > 0 && (
            <Button onClick={handleOpenCreate} className="gap-1.5" disabled={scId === 0}>
              <Plus className="h-4 w-4" />
              เพิ่มงบเทียบยอดใหม่
            </Button>
          )
        }
      />

      <div className="flex flex-col md:flex-row flex-auto min-h-0 overflow-hidden">
        {/* ── Left panel: bank selector + reconciliation list ──────────────── */}
        <div className="w-full md:w-1/3 border-r flex flex-col bg-gray-50 overflow-y-auto">
          {/* Bank account pills */}
          <div className="p-3 border-b bg-white space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">บัญชีธนาคาร</p>
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-gray-400">ไม่มีข้อมูลบัญชีธนาคาร</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.ba_id}
                    onClick={() => handleSelectBaId(acc.ba_id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedBaId === acc.ba_id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {acc.ba_name || acc.ba_no}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reconciliation month list */}
          <div className="flex-1 p-2 space-y-1">
            {selectedBaId === 0 ? (
              <p className="text-sm text-gray-400 p-3">เลือกบัญชีธนาคารก่อน</p>
            ) : reconList.length === 0 ? (
              <p className="text-sm text-gray-400 p-3">ยังไม่มีงบเทียบยอด</p>
            ) : (
              reconList.map((r) => (
                <button
                  key={r.br_id}
                  onClick={() => setSelectedBrId(r.br_id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                    selectedBrId === r.br_id
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-white border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-medium truncate">
                    {monthLabel(r.recon_month, monthOptions) || r.recon_month}
                  </span>
                  {r.is_balanced ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ตรงกัน
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-xs font-semibold shrink-0">
                      <XCircle className="h-3.5 w-3.5" />
                      ไม่ตรง
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: reconciliation detail ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedBrId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <Scale className="h-12 w-12 opacity-30" />
              <p className="text-sm">เลือกรายการงบเทียบยอดจากรายการทางซ้าย</p>
            </div>
          ) : !reconDetail ? (
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedAccount?.ba_name ?? `บัญชี #${reconDetail.ba_id}`}
                    {selectedAccount?.ba_no && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        เลขที่ {selectedAccount.ba_no}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    เดือน: {monthLabel(reconDetail.recon_month, monthOptions) || reconDetail.recon_month}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {reconDetail.is_balanced ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      ยอดตรงกัน
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-semibold">
                      <XCircle className="h-4 w-4" />
                      ยอดไม่ตรงกัน
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                    <Printer className="h-4 w-4" /> พิมพ์แบบฟอร์ม
                  </Button>
                </div>
              </div>

              {/* ── Comparison table ── */}
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <p className="text-sm font-semibold text-gray-700">เปรียบเทียบยอดเงิน</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-gray-600 w-2/3">ยอดตามสมุดบัญชีโรงเรียน</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {showNumber(reconDetail.book_balance)} บาท
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-gray-600">รายการปรับปรุงสุทธิ</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          reconDetail.adjustment_total < 0
                            ? 'text-red-600'
                            : reconDetail.adjustment_total > 0
                            ? 'text-green-600'
                            : ''
                        }`}
                      >
                        {reconDetail.adjustment_total >= 0 ? '+' : ''}
                        {showNumber(reconDetail.adjustment_total)} บาท
                      </td>
                    </tr>
                    <tr className="border-b bg-blue-50">
                      <td className="px-4 py-3 text-blue-700 font-semibold">ยอดสมุดบัญชีหลังปรับปรุง</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        {showNumber(reconDetail.adjusted_book_balance)} บาท
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-gray-600">ยอดตาม Bank Statement</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {showNumber(reconDetail.bank_statement_balance)} บาท
                      </td>
                    </tr>
                    <tr className={reconDetail.is_balanced ? 'bg-green-50' : 'bg-red-50'}>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          reconDetail.is_balanced ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        ผลต่าง
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          reconDetail.is_balanced ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {showNumber(reconDetail.difference)} บาท
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Adjustment items ── */}
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">รายการปรับปรุง</p>
                  {!reconDetail.signed_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        addItemForm.reset({ item_type: 1, doc_ref: '', detail: '', amount: 0 })
                        setAddItemDialogOpen(true)
                      }}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      เพิ่มรายการ
                    </Button>
                  )}
                </div>
                {reconDetail.items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">ไม่มีรายการปรับปรุง</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 text-xs">
                        <th className="px-4 py-2">ประเภท</th>
                        <th className="px-4 py-2">เลขที่เอกสาร</th>
                        <th className="px-4 py-2">รายการ</th>
                        <th className="px-4 py-2 text-right">จำนวนเงิน (บาท)</th>
                        {!reconDetail.signed_at && <th className="px-4 py-2 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {reconDetail.items.map((item) => (
                        <tr key={item.bri_id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                item.item_type === 1
                                  ? 'bg-red-100 text-red-700'
                                  : item.item_type === 2
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.item_type_name}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{item.doc_ref ?? '-'}</td>
                          <td className="px-4 py-2.5 text-gray-600">{item.detail ?? '-'}</td>
                          <td
                            className={`px-4 py-2.5 text-right font-medium ${
                              item.amount < 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {item.amount >= 0 ? '+' : ''}
                            {showNumber(item.amount)}
                          </td>
                          {!reconDetail.signed_at && (
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => removeItemMutation.mutate(item.bri_id)}
                                disabled={removeItemMutation.isPending}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Note ── */}
              {reconDetail.note && (
                <div className="rounded-lg border bg-amber-50 border-amber-200 px-4 py-3 text-sm text-amber-700">
                  <span className="font-semibold">หมายเหตุ:</span> {reconDetail.note}
                </div>
              )}

              {/* ── Sign-off section ── */}
              {reconDetail.signed_at ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    ลงนามรับรองแล้ว
                  </div>
                  {reconDetail.signed_name && (
                    <p className="text-xs text-green-600">ผู้ลงนาม: {reconDetail.signed_name}</p>
                  )}
                  <p className="text-xs text-green-500">วันที่ลงนาม: {fmtDateTH(reconDetail.signed_at)}</p>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setSignNote('')
                    setSignDialogOpen(true)
                  }}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  disabled={adminId === 0}
                >
                  <PenLine className="h-4 w-4" />
                  ผอ. ลงนามรับรองงบเทียบยอด
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create / Update Dialog ──────────────────────────────────────────── */}
      <FormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="เพิ่มงบเทียบยอดใหม่"
        size="md"
        onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
        loading={createMutation.isPending}
        submitLabel="บันทึกงบเทียบยอด"
      >
        <div className="space-y-3">
          {/* บัญชีธนาคาร (read-only) */}
          <div>
            <Label>บัญชีธนาคาร</Label>
            <Input
              value={
                selectedAccount
                  ? `${selectedAccount.ba_name}${selectedAccount.ba_no ? ` (${selectedAccount.ba_no})` : ''}`
                  : ''
              }
              readOnly
              className="bg-gray-50"
            />
          </div>

          {/* เดือน */}
          <div>
            <Label>เดือนที่จัดทำ</Label>
            <Select
              value={createForm.watch('recon_month')}
              onValueChange={(v) => createForm.setValue('recon_month', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกเดือน">
                  {monthLabel(createForm.watch('recon_month'), monthOptions) ||
                    createForm.watch('recon_month')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {createForm.formState.errors.recon_month && (
              <p className="text-xs text-red-500 mt-1">
                {createForm.formState.errors.recon_month.message}
              </p>
            )}
          </div>

          {/* ยอดสมุดบัญชีโรงเรียน */}
          <div>
            <Label>ยอดตามสมุดบัญชีโรงเรียน (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              {...createForm.register('book_balance', { valueAsNumber: true })}
            />
            {createForm.formState.errors.book_balance && (
              <p className="text-xs text-red-500 mt-1">
                {createForm.formState.errors.book_balance.message}
              </p>
            )}
          </div>

          {/* ยอด Bank Statement */}
          <div>
            <Label>ยอดตาม Bank Statement (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              {...createForm.register('bank_statement_balance', { valueAsNumber: true })}
            />
            {createForm.formState.errors.bank_statement_balance && (
              <p className="text-xs text-red-500 mt-1">
                {createForm.formState.errors.bank_statement_balance.message}
              </p>
            )}
          </div>

          {/* หมายเหตุ */}
          <div>
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Input {...createForm.register('note')} placeholder="หมายเหตุเพิ่มเติม" />
          </div>
        </div>
      </FormDialog>

      {/* ── Add Item Dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        title="เพิ่มรายการปรับปรุง"
        size="sm"
        onSubmit={addItemForm.handleSubmit((v) => addItemMutation.mutate(v))}
        loading={addItemMutation.isPending}
        submitLabel="เพิ่มรายการ"
      >
        <div className="space-y-3">
          {/* ประเภทรายการ */}
          <div>
            <Label>ประเภทรายการปรับปรุง</Label>
            <Select
              value={String(addItemForm.watch('item_type'))}
              onValueChange={(v) =>
                addItemForm.setValue('item_type', Number(v), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 — เช็คค้างขึ้น (หักยอดสมุด)</SelectItem>
                <SelectItem value="2">2 — เงินฝากระหว่างทาง (บวกยอดสมุด)</SelectItem>
                <SelectItem value="3">3 — รายการอื่น</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* เลขที่เอกสาร */}
          <div>
            <Label>เลขที่เช็ค / เอกสาร (ถ้ามี)</Label>
            <Input {...addItemForm.register('doc_ref')} placeholder="เช่น C0012345" />
          </div>

          {/* รายการ */}
          <div>
            <Label>รายละเอียด</Label>
            <Input {...addItemForm.register('detail')} placeholder="คำอธิบายรายการ" />
          </div>

          {/* จำนวนเงิน */}
          <div>
            <Label>จำนวนเงิน (บาท)</Label>
            <Input
              type="number"
              step="0.01"
              {...addItemForm.register('amount', { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-500 mt-1">ค่าลบ = หักออกจากยอดสมุด, ค่าบวก = บวกเพิ่ม</p>
            {addItemForm.formState.errors.amount && (
              <p className="text-xs text-red-500 mt-1">
                {addItemForm.formState.errors.amount.message}
              </p>
            )}
          </div>
        </div>
      </FormDialog>

      {/* ── Sign-off Dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        title="ผู้อำนวยการลงนามรับรองงบเทียบยอด"
        size="sm"
        onSubmit={() => signMutation.mutate()}
        loading={signMutation.isPending}
        submitLabel="ลงนามรับรอง"
      >
        <div className="space-y-3">
          {/* Summary */}
          <div className="rounded-md border bg-gray-50 px-3 py-2 space-y-1 text-sm">
            <div className="font-medium text-gray-700">สรุปงบเทียบยอด</div>
            {reconDetail && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>เดือน:</span>
                  <span className="font-medium">
                    {monthLabel(reconDetail.recon_month, monthOptions) || reconDetail.recon_month}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ผลต่าง:</span>
                  <span
                    className={`font-bold ${reconDetail.is_balanced ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {showNumber(reconDetail.difference)} บาท
                  </span>
                </div>
                {!reconDetail.is_balanced && (
                  <p className="text-xs text-amber-600">
                    ยอดยังไม่ตรงกัน — แนะนำให้ตรวจสอบรายการปรับปรุงก่อนลงนาม
                  </p>
                )}
              </>
            )}
          </div>

          {/* หมายเหตุ */}
          <div>
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Input
              value={signNote}
              onChange={(e) => setSignNote(e.target.value)}
              placeholder="หมายเหตุของผู้อำนวยการ"
            />
          </div>
          <p className="text-xs text-gray-500">
            การลงนามรับรองจะล็อกงบเทียบยอดนี้ ไม่สามารถแก้ไขรายการปรับปรุงได้อีก
          </p>
        </div>
      </FormDialog>
    </div>
  )
}
