'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ShieldAlert, PenLine, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost } from '@/lib/api'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { fmtDateTH } from '@/lib/utils'
import { ExportButton } from '@/components/ui/export-button'
import { exportToXlsx } from '@/lib/export-xlsx'
import { useAppContext } from '@/hooks/use-app-context'
import { Printer } from 'lucide-react'
import { openPrintWindow } from '@/lib/print-utils'
import { officialDailyBalanceForm } from '@/lib/official-forms'
import { buildDailyBalanceGroups } from '@/lib/daily-balance-groups'

interface DailyBalanceRow {
  id: number
  bg_type_id?: number
  budget_type?: string
  budget_type_name: string
  carry_forward: number
  income: number
  expense: number
  balance: number
  cash_balance?: number
  bank_balance?: number
  smp_balance?: number
  total_balance?: number
  date: string
}

interface CashLimitCheck {
  limit_amount: number
  current_balance: number
  cash_balance?: number
  bank_balance?: number
  total_balance?: number
  exceeded: boolean
  excess_amount: number
  note: string | null
}

interface Signer {
  signer_role: number
  signed_by: number
  signed_name: string | null
  signed_position: string | null
  signed_at: string | null
  note: string | null
}

interface DailyAuditStatus {
  date: string
  signed: boolean              // compat: true เมื่อ finance ลงนาม
  fully_signed: boolean        // ลงครบ 3 roles
  signer_count: number
  signers: {
    finance: Signer | null
    committee: Signer | null
    director: Signer | null
  }
  signed_by: number | null
  signed_name: string | null
  signed_position: string | null
  signed_at: string | null
  note: string | null
}

const ROLE_INFO: Record<number, { label: string; color: string }> = {
  1: { label: 'เจ้าหน้าที่การเงิน', color: 'text-blue-700' },
  2: { label: 'คณะกรรมการตรวจสอบ', color: 'text-purple-700' },
  3: { label: 'ผู้อำนวยการ', color: 'text-green-700' },
}

export default function DailyBalancePage() {
  const { scId, adminId, syId, scName } = useAppContext()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signPosition, setSignPosition] = useState('')
  const [signNote, setSignNote] = useState('')
  const [signerRole, setSignerRole] = useState<number>(1)
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().substring(0, 10)
  )

  const { data, isLoading } = useQuery({
    queryKey: ['daily-balance', scId, selectedDate, syId],
    queryFn: () =>
      apiGet<DailyBalanceRow[]>(`ReportDailyBalance/loadDailyBalance/${scId}/${selectedDate}/${syId}`),
    enabled: scId > 0 && syId > 0 && !!selectedDate,
  })

  const { data: cashLimit } = useQuery({
    queryKey: ['cash-limit', scId],
    queryFn: () => apiGet<CashLimitCheck>(`ReportDailyBalance/cashLimitCheck/${scId}`),
    enabled: scId > 0,
    refetchInterval: 60000,
  })

  const { data: auditStatus, isLoading: auditLoading } = useQuery({
    queryKey: ['daily-audit', scId, syId, selectedDate],
    queryFn: () =>
      apiGet<DailyAuditStatus>(`FinancialAudit/dailyStatus/${scId}/${syId}/${selectedDate}`),
    enabled: scId > 0 && syId > 0 && !!selectedDate,
  })

  const signMutation = useMutation({
    mutationFn: () =>
      apiPost('FinancialAudit/signDaily', {
        sc_id: scId,
        sy_id: syId,
        date: selectedDate,
        signed_by: adminId,
        signed_position: signPosition || undefined,
        note: signNote || undefined,
        signer_role: signerRole,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'ลงนามเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['daily-audit'] })
        setSignDialogOpen(false)
        setSignPosition('')
        setSignNote('')
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  /** หา role ถัดไปที่ต้องลงนาม (1 → 2 → 3 → complete) */
  const nextSignerRole = useMemo(() => {
    if (!auditStatus) return 1
    if (!auditStatus.signers.finance) return 1
    if (!auditStatus.signers.committee) return 2
    if (!auditStatus.signers.director) return 3
    return 0 // ครบแล้ว
  }, [auditStatus])

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  function handleExport() {
    const exportRows = rows.map((r) => ({
      'วันที่': fmtDateTH(r.date),
      'ประเภทงบประมาณ': r.budget_type_name ?? r.budget_type ?? '',
      'ยอดยกมา (บาท)': Number(r.carry_forward ?? 0),
      'รับเข้า (บาท)': Number(r.income),
      'จ่ายออก (บาท)': Number(r.expense),
      'คงเหลือ (บาท)': Number(r.balance),
    }))
    const filename = `daily-balance-${selectedDate}`
    exportToXlsx(exportRows, 'รายงานเงินคงเหลือ', filename)
  }
  const cashOf = (r: DailyBalanceRow) => Number(r.cash_balance ?? 0)
  const bankOf = (r: DailyBalanceRow) => Number(r.bank_balance ?? 0)
  const smpOf = (r: DailyBalanceRow) => Number(r.smp_balance ?? 0)
  const totalOf = (r: DailyBalanceRow) =>
    Number(r.total_balance ?? cashOf(r) + bankOf(r) + smpOf(r))

  const totalCash = rows.reduce((s, r) => s + cashOf(r), 0)
  const totalBank = rows.reduce((s, r) => s + bankOf(r), 0)
  const totalSmp = rows.reduce((s, r) => s + smpOf(r), 0)
  const grandTotal = rows.reduce((s, r) => s + totalOf(r), 0)
  // คงไว้สำหรับ dialog ลงนาม (working columns)
  const totalCarryForward = rows.reduce((s, r) => s + Number(r.carry_forward ?? 0), 0)
  const totalIncome = rows.reduce((s, r) => s + Number(r.income), 0)
  const totalExpense = rows.reduce((s, r) => s + Number(r.expense), 0)
  const totalBalance = rows.reduce((s, r) => s + Number(r.balance), 0)

  // คอลัมน์ตรงตามแบบฟอร์ม "รายงานเงินคงเหลือประจำวัน" (สพฐ. 2567)
  const columns = useMemo(() => [
    {
      header: 'ประเภท',
      render: (item: DailyBalanceRow) => (
        <span>{item.budget_type_name ?? item.budget_type ?? '-'}</span>
      ),
    },
    {
      header: 'เงินสด',
      className: 'text-right',
      render: (item: DailyBalanceRow) => <span>{fmt(cashOf(item))}</span>,
    },
    {
      header: 'เงินฝากธนาคาร',
      className: 'text-right',
      render: (item: DailyBalanceRow) => <span className="text-blue-700">{fmt(bankOf(item))}</span>,
    },
    {
      header: 'เงินฝากส่วนราชการผู้เบิก',
      className: 'text-right',
      render: (item: DailyBalanceRow) => <span>{fmt(smpOf(item))}</span>,
    },
    {
      header: 'รวม',
      className: 'text-right',
      render: (item: DailyBalanceRow) => (
        <span className={totalOf(item) < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
          {fmt(totalOf(item))}
        </span>
      ),
    },
  ], [])

  function handlePrint() {
    if (rows.length === 0) return
    const s = auditStatus?.signers
    const body = officialDailyBalanceForm({
      scName,
      date: selectedDate,
      rows: buildDailyBalanceGroups(
        rows.map((r) => ({
          bgTypeId: r.bg_type_id,
          name: r.budget_type_name ?? r.budget_type ?? '-',
          cash: cashOf(r),
          bank: bankOf(r),
          smp: smpOf(r),
          total: totalOf(r),
        })),
      ),
      totalCash,
      totalBank,
      totalSmp,
      grandTotal,
      preparerName: s?.finance?.signed_name ?? undefined,
      preparerPosition: s?.finance?.signed_position ?? undefined,
      directorName: s?.director?.signed_name ?? undefined,
      committeeNames: s?.committee?.signed_name ? [s.committee.signed_name] : undefined,
    })
    openPrintWindow({ title: `รายงานเงินคงเหลือประจำวัน_${selectedDate}`, body })
  }

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ยอดเงินคงเหลือประจำวัน" />
      <ProcessFlow flow="receive" />

      {/* ── Banner วงเงินสำรองจ่าย ─────────────────────────────────────────── */}
      {cashLimit?.exceeded && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">เงินสด/เช็คในมือเกินวงเงินสำรองจ่าย!</span>
            {' '}คงเหลือปัจจุบัน <strong>{fmt(cashLimit.cash_balance ?? cashLimit.current_balance)} บาท</strong>
            {' '}เกินวงเงิน <strong>{fmt(cashLimit.limit_amount)} บาท</strong>
            {' '}(เกิน {fmt(cashLimit.excess_amount)} บาท)
            {' '}— ต้องนำเงินส่วนเกินฝากธนาคาร
          </div>
        </div>
      )}
      {cashLimit && !cashLimit.exceeded && (cashLimit.cash_balance ?? cashLimit.current_balance) > cashLimit.limit_amount * 0.8 && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            เงินสด/เช็คในมือ <strong>{fmt(cashLimit.cash_balance ?? cashLimit.current_balance)} บาท</strong>
            {' '}ใกล้ถึงวงเงินสำรองจ่ายสูงสุด <strong>{fmt(cashLimit.limit_amount)} บาท</strong>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* ── ตัวเลือกวันที่ + สถานะลงนาม ─────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-sm font-medium">เลือกวันที่</Label>
            <ThaiDatePicker value={selectedDate} onChange={setSelectedDate} className="w-52" />
          </div>

          {cashLimit && (
            <div className="text-xs text-gray-500 pb-1 space-y-0.5">
              <div>
                เงินสดในมือ:{' '}
                <span className={cashLimit.exceeded ? 'text-red-600 font-semibold' : 'text-gray-700 font-medium'}>
                  {fmt(cashLimit.cash_balance ?? cashLimit.current_balance)}
                </span>
                {' / '}{fmt(cashLimit.limit_amount)} บาท (วงเงินสำรอง)
              </div>
              {cashLimit.bank_balance !== undefined && (
                <div>
                  เงินฝากธนาคาร:{' '}
                  <span className="text-blue-700 font-medium">{fmt(cashLimit.bank_balance)}</span>
                  {' '}บาท
                </div>
              )}
            </div>
          )}

          <ExportButton
            onExport={handleExport}
            loading={rows.length === 0}
            label="ดาวน์โหลด Excel"
          />
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={rows.length === 0} className="gap-1">
            <Printer className="h-4 w-4" /> พิมพ์แบบฟอร์ม
          </Button>

          {/* ── สถานะลายเซ็นรายวัน (3 roles) + ปุ่มลงนาม ─────────────────── */}
          {!auditLoading && auditStatus && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* แสดงสถานะลายเซ็นทั้ง 3 roles */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((role) => {
                  const key = role === 1 ? 'finance' : role === 2 ? 'committee' : 'director'
                  const s = auditStatus.signers[key as keyof typeof auditStatus.signers]
                  const info = ROLE_INFO[role]
                  return (
                    <div
                      key={role}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                        s
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                      title={s ? `${s.signed_name} ${s.signed_at ? fmtDateTH(s.signed_at) : ''}` : 'ยังไม่ลงนาม'}
                    >
                      {s ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span className={s ? '' : ''}>{info.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* ปุ่มลงนาม */}
              {auditStatus.fully_signed ? (
                <div className="flex items-center gap-1 rounded-md border border-green-300 bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  ลงนามครบถ้วน
                </div>
              ) : nextSignerRole > 0 ? (
                <Button
                  size="sm"
                  onClick={() => { setSignerRole(nextSignerRole); setSignDialogOpen(true) }}
                  disabled={rows.length === 0 || adminId === 0}
                  className="gap-1.5"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  ลงนาม ({ROLE_INFO[nextSignerRole].label})
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />

        {rows.length > 0 && (
          <div className="flex justify-end gap-8 text-sm font-semibold border-t pt-3 flex-wrap">
            <span>รวมเงินสด: <span className="text-gray-700">{fmt(totalCash)}</span> บาท</span>
            <span>รวมเงินฝากธนาคาร: <span className="text-blue-700">{fmt(totalBank)}</span> บาท</span>
            <span>รวมเงินฝากส่วนราชการ: <span className="text-gray-700">{fmt(totalSmp)}</span> บาท</span>
            <span>รวมทั้งสิ้น: <span className={grandTotal < 0 ? 'text-red-600' : 'text-green-700'}>{fmt(grandTotal)}</span> บาท</span>
          </div>
        )}
      </div>

      {/* ── Dialog ลงนามรับรองประจำวัน ──────────────────────────────────────── */}
      <FormDialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        title={`ลงนาม ${ROLE_INFO[signerRole].label} — ${fmtDateTH(selectedDate)}`}
        onSubmit={() => signMutation.mutate()}
        loading={signMutation.isPending}
        submitLabel="ลงนามรับรอง"
      >
        <div className="space-y-3">
          <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm space-y-1">
            <div>รวมยกมา: <strong className="text-gray-700">{fmt(totalCarryForward)} บาท</strong></div>
            <div>รวมรับเข้า: <strong className="text-green-700">{fmt(totalIncome)} บาท</strong></div>
            <div>รวมจ่ายออก: <strong className="text-red-600">{fmt(totalExpense)} บาท</strong></div>
            <div>รวมคงเหลือ: <strong className={totalBalance < 0 ? 'text-red-600' : ''}>{fmt(totalBalance)} บาท</strong></div>
          </div>
          <div>
            <Label>ตำแหน่งผู้ลงนาม</Label>
            <Input
              value={signPosition}
              onChange={(e) => setSignPosition(e.target.value)}
              placeholder="เช่น เจ้าหน้าที่การเงิน, ครูผู้ช่วย"
            />
          </div>
          <div>
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Input
              value={signNote}
              onChange={(e) => setSignNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม"
            />
          </div>
          <p className="text-xs text-gray-500">
            การลงนามรับรองจะบันทึกว่าท่านได้ตรวจสอบและรับรองยอดเงินคงเหลือประจำวันนี้แล้ว
            ไม่สามารถแก้ไขได้ภายหลัง
          </p>
        </div>
      </FormDialog>
    </div>
  )
}
