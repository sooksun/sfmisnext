'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH, toBE } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface MoneyType {
  bg_type_id: number
  budget_type: string
}

interface FYBRow {
  fyb_id: number
  money_type_id: number
  money_type_name: string | null
  cash_balance: number
  bank_balance: number
  smp_balance: number
  total_balance: number
  is_final: boolean
  closing_date: string | null
  closed_by_name: string | null
}

interface FYBResult {
  data: FYBRow[]
  count: number
  is_year_final: boolean
}

interface EditRow {
  cash: number
  bank: number
  smp: number
}

function todayStr() {
  return new Date().toISOString().substring(0, 10)
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function FiscalYearClosePage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [defaultBudgetYear, setDefaultBudgetYear] = useState('')

  const [selectedYear, setSelectedYear] = useState('')        // BE (พ.ศ.) สำหรับแสดงผลและ dropdown
  const [selectedApiYear, setSelectedApiYear] = useState('') // CE สำหรับส่ง API
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [editRows, setEditRows] = useState<Record<number, EditRow>>({})

  // finalize dialog state
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [closingDate, setClosingDate] = useState(todayStr)
  const [finalNote, setFinalNote] = useState('')

  // ── Load user data from localStorage ────────────────────────────────────

  // ── Year selector options: 3 ปีล่าสุด ───────────────────────────────────
  const yearOptions = useMemo(() => {
    if (!defaultBudgetYear) return []
    const base = Number(defaultBudgetYear)
    if (!base) return []
    return [base, base - 1, base - 2].map((y) => String(y))
  }, [defaultBudgetYear])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: moneyTypes } = useQuery({
    queryKey: ['budget-income-types', scId],
    queryFn: () => apiGet<{ data: MoneyType[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })

  const {
    data: fybResult,
    isLoading: fybLoading,
    refetch: refetchFyb,
  } = useQuery({
    queryKey: ['fyb', scId, selectedApiYear],
    queryFn: () =>
      apiGet<FYBResult>(`FiscalYearBalance/loadBalances/${scId}/${selectedApiYear}`),
    enabled: scId > 0 && !!selectedApiYear,
  })

  const types: MoneyType[] = Array.isArray(moneyTypes)
    ? moneyTypes
    : (moneyTypes as any)?.data ?? []

  const fybData: FYBRow[] = fybResult?.data ?? []
  const isYearFinal = fybResult?.is_year_final ?? false

  // ── Build editRows when entering edit mode ───────────────────────────────
  function enterEditMode() {
    const initial: Record<number, EditRow> = {}
    for (const mt of types) {
      const existing = fybData.find((r) => r.money_type_id === mt.bg_type_id)
      initial[mt.bg_type_id] = {
        cash: existing?.cash_balance ?? 0,
        bank: existing?.bank_balance ?? 0,
        smp: existing?.smp_balance ?? 0,
      }
    }
    setEditRows(initial)
    setBulkEditMode(true)
  }

  function cancelEditMode() {
    setBulkEditMode(false)
    setEditRows({})
  }

  function setEditField(typeId: number, field: keyof EditRow, value: string) {
    const num = parseFloat(value) || 0
    setEditRows((prev) => ({
      ...prev,
      [typeId]: { ...(prev[typeId] ?? { cash: 0, bank: 0, smp: 0 }), [field]: num },
    }))
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  const saveBulkMutation = useMutation({
    mutationFn: () => {
      const balances = types.map((mt) => {
        const row = editRows[mt.bg_type_id] ?? { cash: 0, bank: 0, smp: 0 }
        return {
          money_type_id: mt.bg_type_id,
          cash_balance: row.cash,
          bank_balance: row.bank,
          smp_balance: row.smp,
        }
      })
      return apiPost('FiscalYearBalance/saveBulkBalances', {
        sc_id: scId,
        budget_year: selectedApiYear,
        closing_date: todayStr(),
        closed_by: adminId,
        balances,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกยอดยกมาเรียบร้อย')
        qc.invalidateQueries({ queryKey: ['fyb', scId, selectedApiYear] })
        setBulkEditMode(false)
        setEditRows({})
      } else {
        toast.error(res?.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const finalizeMutation = useMutation({
    mutationFn: () =>
      apiPost('FiscalYearBalance/finalizeYear', {
        sc_id: scId,
        budget_year: selectedApiYear,
        signed_by: adminId,
        note: finalNote || undefined,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || `ปิดปีงบประมาณ ${toBE(selectedYear)} เรียบร้อยแล้ว`)
        qc.invalidateQueries({ queryKey: ['fyb', scId, selectedApiYear] })
        setFinalizeDialogOpen(false)
        setFinalNote('')
      } else {
        toast.error(res?.ms || 'มีปัญหาในการปิดปี')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Derived totals ───────────────────────────────────────────────────────
  const grandTotals = useMemo(() => {
    if (bulkEditMode) {
      let cash = 0, bank = 0, smp = 0
      for (const row of Object.values(editRows)) {
        cash += row.cash
        bank += row.bank
        smp += row.smp
      }
      return { cash, bank, smp, total: cash + bank + smp }
    }
    return fybData.reduce(
      (acc, r) => ({
        cash: acc.cash + r.cash_balance,
        bank: acc.bank + r.bank_balance,
        smp: acc.smp + r.smp_balance,
        total: acc.total + r.total_balance,
      }),
      { cash: 0, bank: 0, smp: 0, total: 0 },
    )
  }, [bulkEditMode, editRows, fybData])

  // ── Closed-by name (first non-null in data) ──────────────────────────────
  const closedByName = fybData.find((r) => r.closed_by_name)?.closed_by_name ?? null
  const closingDateDisplay = fybData.find((r) => r.closing_date)?.closing_date ?? null

  // ── Row display helper ───────────────────────────────────────────────────
  function getDisplayRow(mt: MoneyType): FYBRow | null {
    return fybData.find((r) => r.money_type_id === mt.bg_type_id) ?? null
  }

  const hasSavedData = fybData.length > 0

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ปิดปีงบประมาณ / ยอดยกมา"
        actions={
          !isYearFinal && hasSavedData && !bulkEditMode ? (
            <Button
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setClosingDate(todayStr())
                setFinalNote('')
                setFinalizeDialogOpen(true)
              }}
              disabled={adminId === 0}
            >
              <Lock className="h-4 w-4" />
              ผอ. ยืนยันปิดปีงบประมาณ
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 space-y-4">
        {/* ── Year selector ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-sm font-medium">ปีงบประมาณ</Label>
            <Select
              value={selectedYear}
              onValueChange={(v) => {
                setSelectedYear(v)
                const vNum = Number(v)
                setSelectedApiYear(String(vNum >= 2400 ? vNum - 543 : vNum))
                setBulkEditMode(false)
                setEditRows({})
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="เลือกปี" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {toBE(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Status badge ────────────────────────────────────────────── */}
          {selectedYear && (
            <div className="pb-0.5">
              {isYearFinal ? (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <div>
                    <span className="font-semibold">ปิดปีแล้ว</span>
                    {closedByName && (
                      <span className="ml-1 text-xs text-green-600">— {closedByName}</span>
                    )}
                    {closingDateDisplay && (
                      <span className="ml-1 text-xs text-green-500">
                        ({fmtDateTH(closingDateDisplay)})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">ยังไม่ได้ปิดปี</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action buttons for edit mode ────────────────────────────────── */}
        {!isYearFinal && (
          <div className="flex items-center gap-2">
            {!bulkEditMode ? (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={enterEditMode}
                disabled={types.length === 0}
              >
                <Unlock className="h-4 w-4" />
                กรอกยอดยกมา
              </Button>
            ) : (
              <>
                <Button
                  className="gap-1.5"
                  onClick={() => saveBulkMutation.mutate()}
                  disabled={saveBulkMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {saveBulkMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditMode}
                  disabled={saveBulkMutation.isPending}
                >
                  ยกเลิก
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {fybLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-700">
                  <th className="px-4 py-3 text-left font-medium">ประเภทเงิน</th>
                  <th className="px-4 py-3 text-right font-medium">ยอดเงินสด (บาท)</th>
                  <th className="px-4 py-3 text-right font-medium">ยอดเงินฝากธนาคาร (บาท)</th>
                  <th className="px-4 py-3 text-right font-medium">ยอดเงินฝาก สพป. (บาท)</th>
                  <th className="px-4 py-3 text-right font-medium">รวม (บาท)</th>
                  <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      ไม่พบประเภทเงิน
                    </td>
                  </tr>
                ) : (
                  types.map((mt) => {
                    const saved = getDisplayRow(mt)
                    const editRow = editRows[mt.bg_type_id] ?? { cash: 0, bank: 0, smp: 0 }
                    const liveTotal = editRow.cash + editRow.bank + editRow.smp

                    return (
                      <tr key={mt.bg_type_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{mt.budget_type}</td>

                        {bulkEditMode ? (
                          <>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-36 text-right h-8 text-sm"
                                value={editRow.cash === 0 ? '' : editRow.cash}
                                placeholder="0.00"
                                onChange={(e) =>
                                  setEditField(mt.bg_type_id, 'cash', e.target.value)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-36 text-right h-8 text-sm"
                                value={editRow.bank === 0 ? '' : editRow.bank}
                                placeholder="0.00"
                                onChange={(e) =>
                                  setEditField(mt.bg_type_id, 'bank', e.target.value)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-36 text-right h-8 text-sm"
                                value={editRow.smp === 0 ? '' : editRow.smp}
                                placeholder="0.00"
                                onChange={(e) =>
                                  setEditField(mt.bg_type_id, 'smp', e.target.value)
                                }
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-blue-700">
                              {fmt(liveTotal)}
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-amber-600">
                              กำลังแก้ไข
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {saved ? fmt(saved.cash_balance) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {saved ? fmt(saved.bank_balance) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {saved ? fmt(saved.smp_balance) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {saved ? fmt(saved.total_balance) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {saved ? (
                                saved.is_final ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                    <Lock className="h-3 w-3" /> ปิดแล้ว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    <CheckCircle2 className="h-3 w-3" /> บันทึกแล้ว
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">ยังไม่กรอก</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                )}

                {/* ── Grand total row ────────────────────────────────────── */}
                {types.length > 0 && (
                  <tr className="border-t-2 bg-gray-100 font-semibold">
                    <td className="px-4 py-3 text-gray-800">รวมทั้งหมด</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(grandTotals.cash)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(grandTotals.bank)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(grandTotals.smp)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 text-base">{fmt(grandTotals.total)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Closed info panel ───────────────────────────────────────────── */}
        {isYearFinal && closingDateDisplay && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" />
              ปิดปีงบประมาณ {toBE(selectedYear)} เรียบร้อยแล้ว
            </div>
            <div className="text-xs text-green-700">
              วันที่ปิด: {fmtDateTH(closingDateDisplay)}
              {closedByName && <span> — ผู้ปิด: {closedByName}</span>}
            </div>
            <div className="text-xs text-green-600">
              ยอดยกมาเหล่านี้จะถูกใช้เป็นยอดยกมาต้นปีในทะเบียนคุมของปีงบประมาณ {toBE(String(Number(selectedYear) + 1))}
            </div>
          </div>
        )}
      </div>

      {/* ── Finalize Dialog ──────────────────────────────────────────────────── */}
      <FormDialog
        open={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        title={`ยืนยันปิดปีงบประมาณ ${toBE(selectedYear)}`}
        onSubmit={() => finalizeMutation.mutate()}
        loading={finalizeMutation.isPending}
        submitLabel="ยืนยันปิดปี"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">เมื่อยืนยันแล้วจะไม่สามารถแก้ไขยอดยกมาได้</div>
                <div className="text-xs mt-1">
                  ยอดยกมาเหล่านี้จะถูกล็อกและใช้เป็นยอดเปิดต้นปีงบประมาณ {toBE(String(Number(selectedYear) + 1))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm space-y-1">
            <div className="font-medium text-gray-700 mb-1">สรุปยอดยกมา</div>
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดเงินสดรวม</span>
              <span className="font-medium">{fmt(grandTotals.cash)} บาท</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดเงินฝากธนาคารรวม</span>
              <span className="font-medium">{fmt(grandTotals.bank)} บาท</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดเงินฝาก สพป. รวม</span>
              <span className="font-medium">{fmt(grandTotals.smp)} บาท</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold text-blue-700">
              <span>รวมทั้งหมด</span>
              <span>{fmt(grandTotals.total)} บาท</span>
            </div>
          </div>

          <div>
            <Label>วันที่ปิดปีงบประมาณ</Label>
            <ThaiDatePicker
              value={closingDate}
              onChange={(v) => setClosingDate(v)}
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Input
              value={finalNote}
              onChange={(e) => setFinalNote(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม"
              className="mt-1"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
