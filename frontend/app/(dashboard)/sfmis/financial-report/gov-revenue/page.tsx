'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Plus, Pencil, Trash2, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH, showNumber } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GovRevenueRow {
  gre_id: number
  sc_id: number
  sy_id: number
  budget_year: string
  revenue_type: number
  revenue_type_name: string
  entry_type: number
  doc_no: string | null
  doc_date: string | null
  detail: string | null
  amount: number
  amount_in: number
  amount_out: number
  balance: number
  note: string | null
  up_by: number
  create_date: string | null
}

interface GovRevenueListResponse {
  data: GovRevenueRow[]
  count: number
}

interface SummaryItem {
  revenue_type: number
  revenue_type_name: string
  total_in: number
  total_out: number
  balance: number
  needs_remit: boolean
  alert_threshold: number
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  entry_type: z.number().min(1).max(2),
  doc_no: z.string().optional(),
  doc_date: z.string().optional(),
  detail: z.string().optional(),
  amount: z.number().min(0, 'กรุณาระบุจำนวนเงิน'),
  note: z.string().optional(),
})

type EntryForm = z.infer<typeof entrySchema>

// ─── Constants ───────────────────────────────────────────────────────────────

const REVENUE_TABS = [
  { value: 1, label: 'ดอกเบี้ยอุดหนุน' },
  { value: 2, label: 'ดอกเบี้ยอาหารกลางวัน' },
  { value: 3, label: 'เงินเหลือจ่ายเกิน 2 ปี' },
  { value: 4, label: 'ค่าธรรมเนียม/อื่น' },
]

const REVENUE_FULL_NAMES: Record<number, string> = {
  1: 'ดอกเบี้ยเงินฝาก (เงินอุดหนุน)',
  2: 'ดอกเบี้ยเงินฝาก (เงินอาหารกลางวัน)',
  3: 'เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ',
  4: 'ค่าขายพัสดุชำรุด/ค่าธรรมเนียม/รายได้อื่น',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GovRevenuePage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()

  // ── localStorage state ────────────────────────────────────────────────────

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(1)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<GovRevenueRow | null>(null)

  // ── React Hook Form ───────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_type: 1,
      doc_no: '',
      doc_date: '',
      detail: '',
      amount: 0,
      note: '',
    },
  })

  const docDateVal = watch('doc_date')
  const entryTypeVal = watch('entry_type')

  // ── Queries ───────────────────────────────────────────────────────────────
  const enabled = scId > 0 && syId > 0 && apiYear !== ''

  const { data: listData, isLoading } = useQuery({
    queryKey: ['gov-revenue-entries', scId, syId, apiYear, activeTab],
    queryFn: () =>
      apiGet<GovRevenueListResponse>(
        `GovRevenue/loadEntries/${scId}/${syId}/${apiYear}/${activeTab}`
      ),
    enabled,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['gov-revenue-summary', scId, syId, apiYear],
    queryFn: () =>
      apiGet<SummaryItem[]>(`GovRevenue/monthlySummary/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  const rows: GovRevenueRow[] = listData?.data ?? []
  const activeSummary = summaryData?.find((s) => s.revenue_type === activeTab) ?? null

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['gov-revenue-entries'] })
    qc.invalidateQueries({ queryKey: ['gov-revenue-summary'] })
  }

  const addMutation = useMutation({
    mutationFn: (form: EntryForm) =>
      apiPost<{ flag: boolean; ms: string }>('GovRevenue/addEntry', {
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        revenue_type: activeTab,
        entry_type: form.entry_type,
        doc_no: form.doc_no || undefined,
        doc_date: form.doc_date || undefined,
        detail: form.detail || undefined,
        amount: form.amount,
        note: form.note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        invalidate()
        setAddOpen(false)
        reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดในการบันทึก'),
  })

  const editMutation = useMutation({
    mutationFn: (form: EntryForm) =>
      apiPost<{ flag: boolean; ms: string }>(
        `GovRevenue/updateEntry/${selectedRow!.gre_id}`,
        {
          entry_type: form.entry_type,
          doc_no: form.doc_no || undefined,
          doc_date: form.doc_date || undefined,
          detail: form.detail || undefined,
          amount: form.amount,
          note: form.note || undefined,
          up_by: adminId,
        }
      ),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        invalidate()
        setEditOpen(false)
        setSelectedRow(null)
        reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดในการแก้ไข'),
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiPost<{ flag: boolean; ms: string }>('GovRevenue/removeEntry', {
        gre_id: selectedRow!.gre_id,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        invalidate()
        setDeleteOpen(false)
        setSelectedRow(null)
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดในการลบ'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openAdd() {
    reset({
      entry_type: 1,
      doc_no: '',
      doc_date: '',
      detail: '',
      amount: 0,
      note: '',
    })
    setAddOpen(true)
  }

  function openEdit(row: GovRevenueRow) {
    setSelectedRow(row)
    reset({
      entry_type: row.entry_type,
      doc_no: row.doc_no ?? '',
      doc_date: row.doc_date ?? '',
      detail: row.detail ?? '',
      amount: row.amount,
      note: row.note ?? '',
    })
    setEditOpen(true)
  }

  function openDelete(row: GovRevenueRow) {
    setSelectedRow(row)
    setDeleteOpen(true)
  }

  function handleTabChange(tabValue: number) {
    setActiveTab(tabValue)
    setPage(0)
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'ลำดับ',
      render: (item: GovRevenueRow) => {
        const idx = rows.indexOf(item)
        return idx + 1 + page * pageSize
      },
      headerClassName: 'w-12 text-center',
      className: 'text-center',
    },
    {
      header: 'วันที่',
      render: (item: GovRevenueRow) => fmtDateTH(item.doc_date),
      headerClassName: 'w-36',
    },
    {
      header: 'เลขที่เอกสาร',
      render: (item: GovRevenueRow) => item.doc_no ?? '-',
      headerClassName: 'w-36',
    },
    {
      header: 'รายการ',
      render: (item: GovRevenueRow) => (
        <span>
          <span
            className={
              item.entry_type === 1
                ? 'mr-1 rounded px-1.5 py-0.5 text-xs bg-green-100 text-green-700'
                : 'mr-1 rounded px-1.5 py-0.5 text-xs bg-red-100 text-red-700'
            }
          >
            {item.entry_type === 1 ? 'รับเข้า' : 'นำส่ง'}
          </span>
          {item.detail ?? ''}
        </span>
      ),
    },
    {
      header: 'รับเข้า (บาท)',
      render: (item: GovRevenueRow) =>
        item.amount_in > 0 ? (
          <span className="text-green-700">{showNumber(item.amount_in)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      headerClassName: 'text-right',
      className: 'text-right',
    },
    {
      header: 'นำส่ง (บาท)',
      render: (item: GovRevenueRow) =>
        item.amount_out > 0 ? (
          <span className="text-red-600">{showNumber(item.amount_out)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      headerClassName: 'text-right',
      className: 'text-right',
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: GovRevenueRow) => (
        <span className={`font-bold ${item.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {showNumber(item.balance)}
        </span>
      ),
      headerClassName: 'text-right',
      className: 'text-right',
    },
    {
      header: 'จัดการ',
      render: (item: GovRevenueRow) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => openEdit(item)}
            title="แก้ไข"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={() => openDelete(item)}
            title="ลบ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      headerClassName: 'w-20',
    },
  ]

  // ── Form fields (shared between add/edit) ─────────────────────────────────
  function renderFormFields() {
    return (
      <div className="space-y-3">
        <div>
          <Label>ประเภทรายการ <span className="text-red-500">*</span></Label>
          <Select
            value={String(entryTypeVal)}
            onValueChange={(v) => setValue('entry_type', Number(v), { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภทรายการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">รับเข้า</SelectItem>
              <SelectItem value="2">นำส่งคลัง</SelectItem>
            </SelectContent>
          </Select>
          {errors.entry_type && (
            <p className="text-xs text-red-500 mt-1">{errors.entry_type.message}</p>
          )}
        </div>

        <div>
          <Label>เลขที่เอกสาร</Label>
          <Input {...register('doc_no')} placeholder="เลขที่เอกสาร" />
        </div>

        <div>
          <Label>วันที่เอกสาร</Label>
          <ThaiDatePicker
            value={docDateVal ?? ''}
            onChange={(v) => setValue('doc_date', v, { shouldValidate: true })}
          />
        </div>

        <div>
          <Label>รายการ</Label>
          <Input {...register('detail')} placeholder="รายละเอียดรายการ" />
        </div>

        <div>
          <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <Label>หมายเหตุ</Label>
          <Input {...register('note')} placeholder="หมายเหตุ (ถ้ามี)" />
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน" />

      <div className="p-4 space-y-4">
        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        {summaryData && summaryData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summaryData.map((s) => (
              <div
                key={s.revenue_type}
                className={`rounded-lg border p-3 text-sm ${
                  s.needs_remit
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="font-medium text-gray-700 leading-snug text-xs">
                    {s.revenue_type_name}
                  </p>
                  {s.needs_remit && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                  )}
                </div>
                <p className={`mt-1 text-base font-bold ${s.needs_remit ? 'text-red-600' : 'text-gray-900'}`}>
                  {showNumber(s.balance)} <span className="text-xs font-normal">บาท</span>
                </p>
                <div className="mt-1 flex gap-2 text-xs text-gray-500">
                  <span className="text-green-600">รับ {showNumber(s.total_in)}</span>
                  <span className="text-red-500">ส่ง {showNumber(s.total_out)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Alert Banner ───────────────────────────────────────────────── */}
        {activeSummary?.needs_remit && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">ต้องนำส่งคลัง!</span>
              {' '}ยอดคงเหลือประเภท <strong>{REVENUE_FULL_NAMES[activeTab]}</strong>{' '}
              คือ <strong>{showNumber(activeSummary.balance)} บาท</strong>{' '}
              เกินกว่า <strong>10,000 บาท</strong>{' '}
              ต้องนำส่งคลังภายใน 3 วันทำการ
            </div>
          </div>
        )}

        {/* ── Tab Selector ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {REVENUE_TABS.map((tab) => {
            const tabSummary = summaryData?.find((s) => s.revenue_type === tab.value)
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tabSummary?.needs_remit && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {REVENUE_FULL_NAMES[activeTab]}
            </h2>
            {budgetYear && (
              <p className="text-xs text-gray-500">
                ปีงบประมาณ พ.ศ. {budgetYear}
              </p>
            )}
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        </div>

        {/* ── Data Table ─────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
          emptyText="ยังไม่มีรายการในประเภทนี้"
        />

        {/* ── Footer Summary ──────────────────────────────────────────────── */}
        {rows.length > 0 && (
          <div className="flex flex-wrap justify-end gap-6 border-t pt-3 text-sm font-semibold">
            <span>
              รวมรับเข้า:{' '}
              <span className="text-green-700">
                {showNumber(rows.reduce((s, r) => s + r.amount_in, 0))}
              </span>{' '}
              บาท
            </span>
            <span>
              รวมนำส่ง:{' '}
              <span className="text-red-600">
                {showNumber(rows.reduce((s, r) => s + r.amount_out, 0))}
              </span>{' '}
              บาท
            </span>
            {rows.length > 0 && (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-gray-400" />
                คงเหลือสุดท้าย:{' '}
                <span
                  className={
                    rows[rows.length - 1].balance < 0
                      ? 'text-red-600'
                      : 'text-gray-900'
                  }
                >
                  {showNumber(rows[rows.length - 1].balance)}
                </span>{' '}
                บาท
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Add Dialog ────────────────────────────────────────────────────── */}
      <FormDialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          reset()
        }}
        title={`เพิ่มรายการ — ${REVENUE_FULL_NAMES[activeTab]}`}
        onSubmit={handleSubmit((form) => addMutation.mutate(form))}
        loading={addMutation.isPending}
        submitLabel="บันทึก"
        size="md"
      >
        {renderFormFields()}
      </FormDialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}
      <FormDialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setSelectedRow(null)
          reset()
        }}
        title={`แก้ไขรายการ — ${REVENUE_FULL_NAMES[activeTab]}`}
        onSubmit={handleSubmit((form) => editMutation.mutate(form))}
        loading={editMutation.isPending}
        submitLabel="บันทึกการแก้ไข"
        size="md"
      >
        {renderFormFields()}
      </FormDialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        title="ยืนยันการลบรายการ"
        description={
          selectedRow
            ? `ต้องการลบรายการ "${selectedRow.detail ?? selectedRow.doc_no ?? 'รายการนี้'}" จำนวน ${showNumber(selectedRow.amount)} บาท หรือไม่?`
            : 'ต้องการลบรายการนี้หรือไม่?'
        }
        confirmLabel="ลบรายการ"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => {
          setDeleteOpen(false)
          setSelectedRow(null)
        }}
      />
    </div>
  )
}
