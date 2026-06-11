'use client'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, RotateCcw, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

// ── Types ─────────────────────────────────────────────────────────────────────

type AgeStatus = 'ok' | 'last_year' | 'expired'

interface PrevBalanceRow {
  ppb_id: number
  money_type_id: number
  money_type_name: string | null
  source_budget_year: string | null
  amount: number
  finance_amount: number | null
  is_confirmed: boolean
  remark: string | null
  usable_until_year: number | null
  age_status: AgeStatus
}

interface PrevBalanceResponse {
  data: PrevBalanceRow[]
  count: number
  prefilled: boolean
}

// row พร้อมสถานะติ๊กเลือก (UI เท่านั้น)
type RowState = PrevBalanceRow & { selected: boolean }

interface MoneyType {
  bg_type_id: number
  budget_type: string
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrevYearBalancePage() {
  const { scId, adminId, budgetYear: budgetYearRaw, syId: _syId, budgetSyId } =
    useAppContext()
  const syId = budgetSyId || _syId
  // budget_year ที่ใช้กับ API เป็น พ.ศ. (เช่น 2569)
  const beYear = budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543
  const budgetYearParam = String(beYear)

  const qc = useQueryClient()
  const [rows, setRows] = useState<RowState[]>([])
  const [prefilled, setPrefilled] = useState(false)
  const [addTypeId, setAddTypeId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['prev-year-balance', scId, syId, budgetYearParam],
    queryFn: () =>
      apiGet<PrevBalanceResponse>(
        `PlanPrevBalance/load/${scId}/${syId}/${budgetYearParam}`,
      ),
    enabled: scId > 0 && syId > 0 && beYear > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (data?.data) {
      // ติ๊กเลือกอัตโนมัติเฉพาะรายการที่ยังไม่หมดอายุ (มีคงเหลือจริง > 0 อยู่แล้วจาก backend)
      setRows(
        data.data.map((r) => ({ ...r, selected: r.age_status !== 'expired' })),
      )
      setPrefilled(data.prefilled)
    }
  }, [data])

  // ประเภทเงิน (สำหรับเพิ่มแถวเอง กรณีการเงินยังไม่ได้ปิดยอดปีก่อน)
  const { data: moneyTypes } = useQuery({
    queryKey: ['money-types-for-prev-balance'],
    queryFn: () => apiGet<MoneyType[]>('Receive/loadBudgetIncomeType'),
    enabled: scId > 0,
  })

  const usedTypeIds = useMemo(
    () => new Set(rows.map((r) => r.money_type_id)),
    [rows],
  )
  const addableTypes = (moneyTypes ?? []).filter(
    (t) => !usedTypeIds.has(t.bg_type_id),
  )

  function setAmount(moneyTypeId: number, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.money_type_id === moneyTypeId
          ? { ...r, amount: Number(value) || 0 }
          : r,
      ),
    )
  }

  function toggleSelect(moneyTypeId: number, checked: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        r.money_type_id === moneyTypeId ? { ...r, selected: checked } : r,
      ),
    )
  }

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
  }

  function resetToFinance() {
    setRows((prev) =>
      prev.map((r) => ({ ...r, amount: r.finance_amount ?? r.amount })),
    )
    toast.info('รีเซ็ตยอดกลับเป็นค่าที่การเงินรายงานแล้ว (ยังไม่บันทึก)')
  }

  function addRow() {
    const t = addableTypes.find((x) => String(x.bg_type_id) === addTypeId)
    if (!t) return
    const sourceYear = String(beYear - 1)
    setRows((prev) => [
      ...prev,
      {
        ppb_id: 0,
        money_type_id: t.bg_type_id,
        money_type_name: t.budget_type,
        source_budget_year: sourceYear,
        amount: 0,
        finance_amount: null,
        is_confirmed: false,
        remark: null,
        usable_until_year: beYear, // sourceYear + 1
        age_status: 'last_year',
        selected: true,
      },
    ])
    setAddTypeId('')
  }

  const selectedRows = rows.filter((r) => r.selected && r.amount > 0)

  const saveMutation = useMutation({
    mutationFn: () => {
      if (selectedRows.length === 0) {
        throw new Error('กรุณาติ๊กเลือกอย่างน้อย 1 ประเภทที่มียอดคงเหลือ')
      }
      return apiPost('PlanPrevBalance/save', {
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYearParam,
        up_by: adminId,
        rows: selectedRows.map((r) => ({
          money_type_id: r.money_type_id,
          money_type_name: r.money_type_name ?? undefined,
          source_budget_year: r.source_budget_year ?? undefined,
          amount: r.amount,
          finance_amount: r.finance_amount ?? undefined,
          remark: r.remark ?? undefined,
        })),
      })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['prev-year-balance'] })
      } else {
        toast.error(res?.ms || 'บันทึกไม่สำเร็จ')
      }
    },
    onError: (e: any) => toast.error(e?.message || 'เกิดข้อผิดพลาด'),
  })

  // รวมเฉพาะรายการที่ติ๊กเลือกไว้
  const total = selectedRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const allSelected = rows.length > 0 && rows.every((r) => r.selected)

  function ageBadge(r: PrevBalanceRow) {
    const until = r.usable_until_year ?? '-'
    if (r.age_status === 'expired') {
      return (
        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-red-100 text-red-700">
          หมดอายุ (ใช้ได้ถึงปีงบ {until})
        </span>
      )
    }
    if (r.age_status === 'last_year') {
      return (
        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-amber-100 text-amber-800">
          ปีสุดท้าย — ใช้ได้ถึงปีงบ {until}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-green-100 text-green-700">
        ใช้ได้ถึงปีงบ {until}
      </span>
    )
  }

  const hasExpired = rows.some((r) => r.age_status === 'expired')

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="เงินเหลือจ่ายปีเก่า"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToFinance}
              disabled={rows.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              รีเซ็ตเป็นยอดการเงิน
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={selectedRows.length === 0 || saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending
                ? 'กำลังบันทึก...'
                : `ยืนยันนำเข้า (${selectedRows.length})`}
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-500">
          สรุป <b>ยอดเงินคงเหลือจริงรายประเภทเงิน</b> ของปีงบก่อน (
          <b>{beYear - 1}</b>) ณ สิ้นปีงบ — แสดงเฉพาะประเภทที่ยังมีเงินคงเหลือ
          <b> ติ๊กเลือก</b>ประเภทที่ต้องการนำเข้ามารวมในวงเงินวางแผนของปีงบ{' '}
          <b>{beYear}</b> (ปรับยอดได้) แล้วกด &ldquo;ยืนยันนำเข้า&rdquo; — ยอดที่ยืนยัน
          จะถูกบวกเข้าวงเงินรวมในขั้นตอนงบประมาณรวมรายปี/กำหนดวงเงินงบประมาณ
        </p>

        {prefilled && rows.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            ยอดด้านล่าง <b>คำนวณจากยอดคงเหลือจริง</b> (ยอดยกมา + รับ − จ่าย)
            ของปีงบ {beYear - 1} และ <b>ยังไม่ได้บันทึก</b> — ติ๊กเลือก/แก้ไขยอด
            แล้วกด &ldquo;ยืนยันนำเข้า&rdquo;
          </div>
        )}

        {hasExpired && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            มีเงินบางประเภทที่ <b>เกิน 2 ปีงบประมาณ</b> — ตามระเบียบต้องนำส่งเป็นรายได้แผ่นดิน
            ไม่ควรนำมาวางแผนใช้จ่ายต่อ
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-500 text-sm">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">
              ยังไม่มีเงินเหลือจ่ายปีเก่า — ฝั่งการเงินยังไม่ได้ปิดยอดปีงบ {beYear - 1}
              หรือไม่มียอดคงเหลือ คุณสามารถเพิ่มรายการเองด้านล่างได้
            </p>
            <AddRowControl
              addableTypes={addableTypes}
              addTypeId={addTypeId}
              setAddTypeId={setAddTypeId}
              addRow={addRow}
            />
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-center px-3 py-2 w-12">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-600 cursor-pointer"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        title="เลือกทั้งหมด"
                      />
                    </th>
                    <th className="text-left px-4 py-2">ประเภทเงิน</th>
                    <th className="text-right px-4 py-2 w-40">
                      ยอดคงเหลือปีก่อน
                    </th>
                    <th className="text-center px-4 py-2 w-28">ปีที่มา</th>
                    <th className="text-center px-4 py-2 w-56">อายุเงิน</th>
                    <th className="text-right px-4 py-2 w-44">
                      ยอดที่นำมาวางแผน (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.money_type_id}
                      className={`border-t hover:bg-gray-50 ${
                        r.selected ? '' : 'opacity-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 cursor-pointer"
                          checked={r.selected}
                          onChange={(e) =>
                            toggleSelect(r.money_type_id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        {r.money_type_name || `#${r.money_type_id}`}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                        {r.finance_amount == null ? '—' : fmt(r.finance_amount)}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500">
                        {r.source_budget_year ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-center">{ageBadge(r)}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.amount || ''}
                          onChange={(e) =>
                            setAmount(r.money_type_id, e.target.value)
                          }
                          disabled={!r.selected}
                          className={`h-8 text-right tabular-nums ${
                            r.age_status === 'expired'
                              ? 'border-red-400 focus-visible:ring-red-400'
                              : ''
                          }`}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td className="px-4 py-2" colSpan={5}>
                      รวมเงินเหลือจ่ายปีเก่าที่เลือกนำเข้า ({selectedRows.length}{' '}
                      ประเภท)
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-indigo-700">
                      {fmt(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {addableTypes.length > 0 && (
              <AddRowControl
                addableTypes={addableTypes}
                addTypeId={addTypeId}
                setAddTypeId={setAddTypeId}
                addRow={addRow}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── เพิ่มแถวประเภทเงินเอง ────────────────────────────────────────────────────
function AddRowControl({
  addableTypes,
  addTypeId,
  setAddTypeId,
  addRow,
}: {
  addableTypes: MoneyType[]
  addTypeId: string
  setAddTypeId: (v: string) => void
  addRow: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={addTypeId} onValueChange={setAddTypeId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="เพิ่มประเภทเงินเอง..." />
        </SelectTrigger>
        <SelectContent>
          {addableTypes.length === 0 ? (
            <SelectItem value="__none__" disabled>
              เพิ่มครบทุกประเภทแล้ว
            </SelectItem>
          ) : (
            addableTypes.map((t) => (
              <SelectItem key={t.bg_type_id} value={String(t.bg_type_id)}>
                {t.budget_type}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={addRow} disabled={!addTypeId}>
        <Plus className="h-4 w-4" />
        เพิ่มแถว
      </Button>
    </div>
  )
}
