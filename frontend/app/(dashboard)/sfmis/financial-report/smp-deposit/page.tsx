'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { openPrintWindow } from '@/lib/print-utils'
import {
  officialSmpPassbookRegister,
  officialPayInSlip,
  officialWithdrawSlip,
} from '@/lib/official-forms'
import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH, showNumber } from '@/lib/utils'
import { ExportButton } from '@/components/ui/export-button'
import { exportToXlsx } from '@/lib/export-xlsx'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmpEntry {
  sde_id: number
  entry_type: number
  entry_type_label: string
  doc_no: string | null
  doc_date: string | null
  detail: string | null
  amount: number
  amount_in: number
  amount_out: number
  balance: number
  money_type_name: string | null
  note: string | null
  create_date: string | null
}

interface SmpListResponse {
  data: SmpEntry[]
  count: number
}

interface SmpSummary {
  total_in: number
  total_out: number
  balance: number
  entry_count: number
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  entry_type: z.number().min(1).max(2),
  doc_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  doc_no: z.string(),
  detail: z.string().min(1, 'กรุณาระบุรายการ'),
  amount: z.number().min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  money_type_name: z.string(),
  note: z.string(),
})

type EntryForm = z.infer<typeof schema>

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SmpDepositPage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw, scName } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()

  // ── localStorage state ────────────────────────────────────────────────────

  // ── UI state ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0)
  const pageSize = 50

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<SmpEntry | null>(null)

  // ── React Hook Form ───────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EntryForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_type: 1,
      doc_date: '',
      doc_no: '',
      detail: '',
      amount: 0,
      money_type_name: '',
      note: '',
    },
  })

  const docDateVal = watch('doc_date')
  const entryTypeVal = watch('entry_type')

  // ── Queries ───────────────────────────────────────────────────────────────
  const enabled = scId > 0 && syId > 0 && apiYear !== ''

  const { data: listData, isLoading } = useQuery({
    queryKey: ['smp-deposit-entries', scId, syId, apiYear],
    queryFn: () =>
      apiGet<SmpListResponse>(`SmpDeposit/loadEntries/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['smp-deposit-summary', scId, syId, apiYear],
    queryFn: () =>
      apiGet<SmpSummary>(`SmpDeposit/getSummary/${scId}/${syId}/${apiYear}`),
    enabled,
  })

  const rows: SmpEntry[] = listData?.data ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['smp-deposit-entries'] })
    qc.invalidateQueries({ queryKey: ['smp-deposit-summary'] })
  }

  const addMutation = useMutation({
    mutationFn: (form: EntryForm) =>
      apiPost<{ flag: boolean; ms: string }>('SmpDeposit/addEntry', {
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        entry_type: form.entry_type,
        doc_no: form.doc_no || undefined,
        doc_date: form.doc_date || undefined,
        detail: form.detail || undefined,
        amount: form.amount,
        money_type_name: form.money_type_name || undefined,
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
        `SmpDeposit/updateEntry/${selectedRow!.sde_id}`,
        {
          entry_type: form.entry_type,
          doc_no: form.doc_no || undefined,
          doc_date: form.doc_date || undefined,
          detail: form.detail || undefined,
          amount: form.amount,
          money_type_name: form.money_type_name || undefined,
          note: form.note || undefined,
          up_by: adminId,
        },
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
      apiPost<{ flag: boolean; ms: string }>('SmpDeposit/removeEntry', {
        sde_id: selectedRow!.sde_id,
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
  function handleExport() {
    const exportRows = rows.map((r) => ({
      'วันที่': fmtDateTH(r.doc_date),
      'เลขที่เอกสาร': r.doc_no ?? '-',
      'รายการ': `${r.entry_type_label} ${r.detail ?? ''}`.trim(),
      'ฝาก (บาท)': r.amount_in > 0 ? Number(r.amount_in) : '',
      'ถอน (บาท)': r.amount_out > 0 ? Number(r.amount_out) : '',
      'คงเหลือ (บาท)': Number(r.balance),
      'ประเภทเงิน': r.money_type_name ?? '-',
    }))
    exportToXlsx(exportRows, 'สมุดคู่ฝาก', `smp-deposit-${budgetYear}`)
  }

  // พิมพ์แบบฟอร์ม "สมุดคู่ฝาก (ส่วนราชการผู้เบิก)" (ตย.18)
  function handlePrint() {
    if (rows.length === 0) return
    const body = officialSmpPassbookRegister({
      scName,
      budgetYear,
      rows: rows.map((r) => ({
        date: r.doc_date,
        docNo: r.doc_no,
        deposit: r.amount_in,
        withdraw: r.amount_out,
        note: [r.money_type_name, r.detail].filter(Boolean).join(' — ') || r.note,
      })),
    })
    openPrintWindow({ title: `สมุดคู่ฝาก_${budgetYear}`, body, paper: 'A4 landscape' })
  }

  // พิมพ์ "ใบนำฝาก" (ฝาก) หรือ "ใบเบิกเงินฝาก" (ถอน) ของรายการนั้น (คู่มือ 2544 หน้า 26-27)
  function handlePrintSlip(row: SmpEntry) {
    if (row.entry_type === 1) {
      const body = officialPayInSlip({
        scName,
        slipNo: row.doc_no,
        date: row.doc_date,
        items: [
          {
            type: row.money_type_name,
            detail: row.detail,
            amount: Number(row.amount_in || row.amount || 0),
          },
        ],
      })
      openPrintWindow({ title: `ใบนำฝาก_${row.doc_no ?? row.sde_id}`, body })
    } else {
      const body = officialWithdrawSlip({
        docNo: row.doc_no,
        scName,
        depositType: row.money_type_name,
        amount: Number(row.amount_out || row.amount || 0),
        date: row.doc_date,
      })
      openPrintWindow({ title: `ใบเบิกเงินฝาก_${row.doc_no ?? row.sde_id}`, body })
    }
  }

  function openAdd() {
    reset({
      entry_type: 1,
      doc_date: '',
      doc_no: '',
      detail: '',
      amount: 0,
      money_type_name: '',
      note: '',
    })
    setAddOpen(true)
  }

  function openEdit(row: SmpEntry) {
    setSelectedRow(row)
    reset({
      entry_type: row.entry_type,
      doc_date: row.doc_date ?? '',
      doc_no: row.doc_no ?? '',
      detail: row.detail ?? '',
      amount: row.amount,
      money_type_name: row.money_type_name ?? '',
      note: row.note ?? '',
    })
    setEditOpen(true)
  }

  function openDelete(row: SmpEntry) {
    setSelectedRow(row)
    setDeleteOpen(true)
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'ลำดับ',
      render: (item: SmpEntry) => rows.indexOf(item) + 1 + page * pageSize,
      headerClassName: 'w-12 text-center',
      className: 'text-center',
    },
    {
      header: 'วันที่',
      render: (item: SmpEntry) => fmtDateTH(item.doc_date),
      headerClassName: 'w-36',
    },
    {
      header: 'เลขที่เอกสาร',
      render: (item: SmpEntry) => item.doc_no ?? '-',
      headerClassName: 'w-36',
    },
    {
      header: 'รายการ',
      render: (item: SmpEntry) => (
        <span>
          <span
            className={
              item.entry_type === 1
                ? 'mr-1 rounded px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700'
                : 'mr-1 rounded px-1.5 py-0.5 text-xs bg-red-100 text-red-700'
            }
          >
            {item.entry_type_label}
          </span>
          {item.detail ?? ''}
        </span>
      ),
    },
    {
      header: 'ประเภทเงิน',
      render: (item: SmpEntry) => item.money_type_name ?? '-',
      headerClassName: 'w-36',
    },
    {
      header: 'ฝาก (บาท)',
      render: (item: SmpEntry) =>
        item.amount_in > 0 ? (
          <span className="text-blue-700 font-medium">{showNumber(item.amount_in)}</span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
      headerClassName: 'text-right w-32',
      className: 'text-right',
    },
    {
      header: 'ถอน (บาท)',
      render: (item: SmpEntry) =>
        item.amount_out > 0 ? (
          <span className="text-red-600 font-medium">{showNumber(item.amount_out)}</span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
      headerClassName: 'text-right w-32',
      className: 'text-right',
    },
    {
      header: 'คงเหลือ (บาท)',
      render: (item: SmpEntry) => (
        <span className={`font-bold ${item.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
          {showNumber(item.balance)}
        </span>
      ),
      headerClassName: 'text-right w-36',
      className: 'text-right',
    },
    {
      header: 'จัดการ',
      render: (item: SmpEntry) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => handlePrintSlip(item)}
            title={item.entry_type === 1 ? 'พิมพ์ใบนำฝาก' : 'พิมพ์ใบเบิกเงินฝาก'}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
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
      headerClassName: 'w-28',
    },
  ]

  // ── Form fields (shared between add/edit) ─────────────────────────────────
  function renderFormFields() {
    return (
      <div className="space-y-3">
        <div>
          <Label>
            ประเภทรายการ <span className="text-red-500">*</span>
          </Label>
          <Select
            value={String(entryTypeVal)}
            onValueChange={(v) => setValue('entry_type', Number(v), { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกประเภทรายการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">ฝาก (สพป. โอนเงินให้โรงเรียน)</SelectItem>
              <SelectItem value="2">ถอน (โรงเรียนคืนเงินให้ สพป.)</SelectItem>
            </SelectContent>
          </Select>
          {errors.entry_type && (
            <p className="text-xs text-red-500 mt-1">{errors.entry_type.message}</p>
          )}
        </div>

        <div>
          <Label>
            วันที่เอกสาร <span className="text-red-500">*</span>
          </Label>
          <ThaiDatePicker
            value={docDateVal ?? ''}
            onChange={(v) => setValue('doc_date', v, { shouldValidate: true })}
          />
          {errors.doc_date && (
            <p className="text-xs text-red-500 mt-1">{errors.doc_date.message}</p>
          )}
        </div>

        <div>
          <Label>เลขที่เอกสาร / เลขที่ใบนำฝาก</Label>
          <Input {...register('doc_no')} placeholder="เลขที่เอกสาร" />
        </div>

        <div>
          <Label>
            รายการ <span className="text-red-500">*</span>
          </Label>
          <Input {...register('detail')} placeholder="รายละเอียดรายการ" />
          {errors.detail && (
            <p className="text-xs text-red-500 mt-1">{errors.detail.message}</p>
          )}
        </div>

        <div>
          <Label>
            จำนวนเงิน (บาท) <span className="text-red-500">*</span>
          </Label>
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
          <Label>ประเภทเงิน</Label>
          <Input {...register('money_type_name')} placeholder="เช่น เงินอุดหนุน, เงินอาหารกลางวัน" />
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
      <PageHeader
        title="สมุดคู่ฝากส่วนราชการผู้เบิก"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={rows.length === 0} className="gap-1.5">
              <Printer className="h-4 w-4" />
              พิมพ์แบบฟอร์ม
            </Button>
            <ExportButton
              onExport={handleExport}
              loading={rows.length === 0}
            />
            <Button onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" />
              เพิ่มรายการ
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* ── Summary Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <ArrowDownToLine className="h-4 w-4" />
              <span className="text-sm font-medium">ฝากทั้งหมด</span>
            </div>
            <p className="text-xl font-bold text-blue-800">
              {showNumber(summaryData?.total_in ?? 0)}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">บาท</p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <ArrowUpFromLine className="h-4 w-4" />
              <span className="text-sm font-medium">ถอนทั้งหมด</span>
            </div>
            <p className="text-xl font-bold text-red-800">
              {showNumber(summaryData?.total_out ?? 0)}
            </p>
            <p className="text-xs text-red-600 mt-0.5">บาท</p>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              (summaryData?.balance ?? 0) < 0
                ? 'border-red-300 bg-red-50'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-1 ${
                (summaryData?.balance ?? 0) < 0 ? 'text-red-700' : 'text-green-700'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">คงเหลือ</span>
            </div>
            <p
              className={`text-xl font-bold ${
                (summaryData?.balance ?? 0) < 0 ? 'text-red-800' : 'text-green-800'
              }`}
            >
              {showNumber(summaryData?.balance ?? 0)}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                (summaryData?.balance ?? 0) < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              บาท
            </p>
          </div>
        </div>

        {/* ── Budget Year Header ─────────────────────────────────────────── */}
        {budgetYear && (
          <p className="text-xs text-gray-500">
            ปีงบประมาณ พ.ศ. {budgetYear} — {summaryData?.entry_count ?? 0} รายการ
          </p>
        )}

        {/* ── Data Table ─────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
          emptyText="ยังไม่มีรายการในสมุดคู่ฝาก"
        />

        {/* ── Footer Summary ──────────────────────────────────────────────── */}
        {rows.length > 0 && (
          <div className="flex flex-wrap justify-end gap-6 border-t pt-3 text-sm font-semibold">
            <span>
              รวมฝาก:{' '}
              <span className="text-blue-700">
                {showNumber(rows.reduce((s, r) => s + r.amount_in, 0))}
              </span>{' '}
              บาท
            </span>
            <span>
              รวมถอน:{' '}
              <span className="text-red-600">
                {showNumber(rows.reduce((s, r) => s + r.amount_out, 0))}
              </span>{' '}
              บาท
            </span>
            <span>
              คงเหลือสุดท้าย:{' '}
              <span
                className={
                  rows[rows.length - 1].balance < 0 ? 'text-red-600' : 'text-green-700'
                }
              >
                {showNumber(rows[rows.length - 1].balance)}
              </span>{' '}
              บาท
            </span>
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
        title="เพิ่มรายการสมุดคู่ฝาก"
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
        title="แก้ไขรายการสมุดคู่ฝาก"
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
