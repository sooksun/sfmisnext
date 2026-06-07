'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { DeleteWithReasonDialog } from '@/components/shared/delete-with-reason-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
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
import Link from 'next/link'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime, fmtDateTH, todayISO } from '@/lib/utils'
import { getLastEntryDate, setLastEntryDate } from '@/lib/last-entry-date'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { useAppContext } from '@/hooks/use-app-context'
import { useActiveReceiptBook } from '@/hooks/use-receipt-book'
import { buildReceiptHtml, ReceiptData } from '@/components/receive/receipt-print'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiveRow {
  pr_id: number
  pr_no: string | null
  budget_type_name: string
  amount: number
  receive_date: string
  receive_form: string | null
  note: string
  up_by: string
  up_date: string
}

interface BudgetType {
  bg_type_id: number
  budget_type_name: string
}

interface Director {
  admin_id: number
  name: string
  type: number
}

// ── Schema ────────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  bg_type_id: z.number().min(1, 'เลือกประเภทงบประมาณ'),
  prd_detail: z.string().min(1, 'กรอกรายการรับเงิน'),
  prd_budget: z.number().min(0.01, 'กรอกจำนวนเงิน'),
})

const receiveSchema = z.object({
  pr_no: z.string().min(1, 'กรุณากรอกเลขที่ใบเสร็จ'),
  receive_form: z.string().min(1, 'กรุณากรอกชื่อผู้ชำระเงิน'),
  receive_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  receive_money_type: z.number().min(1, 'กรุณาเลือกประเภทการรับ'),
  receiveList: z.array(lineSchema).min(1, 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ'),
})
type ReceiveForm = z.infer<typeof receiveSchema>

const MONEY_TYPES = [
  { id: 2, name: 'เงินสด' },
  { id: 1, name: 'เช็ค' },
  { id: 3, name: 'โอนเงิน' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReceivePage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw, scName, userName } = useAppContext()
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25

  // dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formBookNo, setFormBookNo] = useState('')        // เล่มที่ ในฟอร์มบันทึก
  const [isPrinting, setIsPrinting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceiveRow | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['receive', scId, syId, apiYear],
    queryFn: () => apiGet<ReceiveRow[]>(`Receive/loadReceive/${scId}/${syId}/${apiYear}`),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })

  const { data: budgetTypes } = useQuery({
    queryKey: ['budget-income-type'],
    queryFn: () => apiGet<BudgetType[]>('Receive/loadBudgetIncomeType'),
  })

  const { data: directors } = useQuery({
    queryKey: ['directors', scId],
    queryFn: () => apiGet<Director[]>(`Receive/loadDirector/${scId}`),
    enabled: scId > 0,
  })

  const { data: autoNo } = useQuery({
    queryKey: ['receive-auto-no', scId, syId, dialogOpen],
    queryFn: () => apiGet<{ pr_no: number }>(`Receive/loadAutoAddReceive/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0 && dialogOpen,
  })

  // Auto-input: เล่มใบเสร็จที่เปิดใช้อยู่ (เล่มที่ + เลขที่ถัดไป)
  const { data: activeBook } = useActiveReceiptBook(scId, apiYear)

  // ── Form ──────────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
    useForm<ReceiveForm>({
      resolver: zodResolver(receiveSchema),
      defaultValues: {
        pr_no: '',
        receive_form: '',
        receive_date: getLastEntryDate('receive'),
        receive_money_type: 2,
        receiveList: [{ bg_type_id: 0, prd_detail: '', prd_budget: 0 }],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'receiveList' })
  const receiveDate = watch('receive_date')
  const moneyType = watch('receive_money_type')
  const receiveList = watch('receiveList')
  const totalAmount = receiveList.reduce((s, r) => s + (r.prd_budget || 0), 0)

  function openDialog() {
    // Auto-input: ถ้ามีเล่มใบเสร็จเปิดใช้อยู่ → เติมเล่มที่ + เลขที่ถัดไปทันที
    reset({
      pr_no: activeBook ? String(activeBook.current_no) : '',
      receive_form: '',
      receive_date: todayISO(),
      receive_money_type: 2,
      receiveList: [{ bg_type_id: 0, prd_detail: '', prd_budget: 0 }],
    })
    setFormBookNo(activeBook?.book_code ?? '')
    setDialogOpen(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (form: ReceiveForm) =>
      apiPost('Receive/addReceive', {
        pr_no: form.pr_no,          // user กรอกเอง (เลขบนใบเสร็จกระดาษ)
        receive_form: form.receive_form,
        receive_date: form.receive_date,
        receive_money_type: form.receive_money_type,
        receiveList: form.receiveList,
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        up_by: adminId,
      }),
    onSuccess: (res: any, form: ReceiveForm) => {
      if (res.flag) {
        setLastEntryDate(form.receive_date, 'receive')
        // backend ออกใบเสร็จ บร. + เดินเลขเล่มให้แล้ว (atomic) — แสดงเลขที่ออก
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        // รับเป็นเงินสด → ระบบสร้าง "บันทึกการรับเงินเพื่อเก็บรักษา" ให้อัตโนมัติ
        if (form.receive_money_type === 2) {
          toast.info('สร้างบันทึกการรับเงินเพื่อเก็บรักษา (เงินสด) แล้ว — พิมพ์ได้ที่เมนู 2.5 รับเงินเพื่อเก็บรักษา')
        }
        qc.invalidateQueries({ queryKey: ['receive'] })
        qc.invalidateQueries({ queryKey: ['active-receipt-book'] }) // เลขที่ถัดไปอัปเดต
        qc.invalidateQueries({ queryKey: ['cash-keeping'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ item }: { item: ReceiveRow; reason: string }) =>
      apiPost('Receive/deleteReceive', { pr_id: item.pr_id, sc_id: scId, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receive'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Print flow ────────────────────────────────────────────────────────────────

  async function handlePrint(prId: number) {
    if (isPrinting) return

    // เปิด window ทันที (ขณะยังอยู่ใน user gesture context) ป้องกัน popup blocker
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('กรุณาอนุญาต Popup สำหรับเว็บไซต์นี้แล้วลองใหม่')
      return
    }
    win.document.write('<html><body style="font-family:sans-serif;padding:20px">กำลังโหลด...</body></html>')

    setIsPrinting(true)
    try {
      const receipt = await apiGet<ReceiptData>(`Receive/loadReceiveById/${prId}/${scId}`)
      if (!receipt) {
        toast.error('ไม่พบข้อมูลใบเสร็จ')
        win.close()
        return
      }
      const signer = directors?.[0]
      win.document.open()
      win.document.write(buildReceiptHtml({
        ...receipt,
        sc_name: scName,
        signer_name: signer?.name ?? userName,
        signer_position: 'ผู้รับเงิน',
      }))
      win.document.close()
      win.onload = () => {
        win.focus()
        win.print()
        win.onafterprint = () => win.close()
      }
    } catch {
      toast.error('โหลดข้อมูลใบเสร็จไม่สำเร็จ')
      win.close()
    } finally {
      setIsPrinting(false)
    }
  }

  // ── Table columns ─────────────────────────────────────────────────────────────

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'เลขที่',
      render: (item: ReceiveRow) => (
        <span className="font-mono text-sm font-semibold">{item.pr_no ?? '-'}</span>
      ),
    },
    {
      header: 'ได้รับเงินจาก',
      render: (item: ReceiveRow) => (
        <span className="text-sm">{item.receive_form ?? item.note ?? '-'}</span>
      ),
    },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: ReceiveRow) => (
        <span className="font-mono text-sm">{fmt(item.amount)}</span>
      ),
    },
    {
      header: 'วันที่รับ',
      render: (item: ReceiveRow) => (
        <span className="text-sm">{fmtDateTH(item.receive_date)}</span>
      ),
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ReceiveRow) => (
        <div>
          <div className="text-xs">{item.up_by}</div>
          <div className="text-xs text-gray-400">{getThaiDateTime(item.up_date)}</div>
        </div>
      ),
    },
    {
      header: 'จัดการ',
      render: (item: ReceiveRow) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => handlePrint(item.pr_id)}
            disabled={isPrinting}
          >
            <Printer className="h-3 w-3" />
            พิมพ์ใบเสร็จ
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 w-7 p-0"
            onClick={() => setDeleteTarget(item)}
            title="ลบ"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="รับเงิน"
        actions={
          <Button onClick={openDialog} disabled={scId === 0}>
            <Plus className="h-4 w-4 mr-1" />
            บันทึกรับเงิน
          </Button>
        }
      />
      <ProcessFlow flow="receive" />

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

      {/* ── Dialog: บันทึกรับเงิน ── */}
      <FormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); reset() }}
        title="บันทึกรับเงิน"
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
        submitLabel="บันทึก"
        size="2xl"
      >
        <div className="space-y-4">

          {/* Auto-input: สถานะเล่มใบเสร็จที่เปิดใช้ */}
          {activeBook ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <BookOpen className="h-4 w-4 shrink-0 text-green-600" />
              <span>
                เติมอัตโนมัติจากเล่มที่ <strong>{activeBook.book_code ?? '-'}</strong>{' '}
                · เลขที่ถัดไป <strong>{activeBook.current_no}</strong>{' '}
                · เหลือ <strong>{activeBook.remaining}</strong> ฉบับ
              </span>
              {activeBook.remaining <= 3 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  ใกล้หมดเล่ม
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>ยังไม่มีเล่มใบเสร็จที่เปิดใช้งาน — กรุณาเปิดเล่มก่อนออกใบเสร็จ</span>
              <Link
                href="/sfmis/financial-report/receipt-book"
                className="ml-auto rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
              >
                เปิดเล่มใบเสร็จ
              </Link>
            </div>
          )}

          {/* เล่มที่ + เลขที่ + รหัสอ้างอิง — header แบบเดียวกับใบเสร็จจริง */}
          <div className="flex items-stretch gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">

            {/* เล่มที่ — user กรอก */}
            <div className="flex flex-col gap-1 w-32">
              <Label className="text-xs text-gray-500 font-medium">เล่มที่</Label>
              <Input
                value={formBookNo}
                onChange={(e) => setFormBookNo(e.target.value)}
                placeholder="เช่น 18ก"
                className="h-9 font-semibold"
              />
            </div>

            <div className="w-px bg-gray-300 self-stretch" />

            {/* เลขที่ — user กรอก (เลขบนใบเสร็จกระดาษ) */}
            <div className="flex flex-col gap-1 w-32">
              <Label className="text-xs text-gray-500 font-medium">
                เลขที่ <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register('pr_no')}
                placeholder="เช่น 29"
                className="h-9 font-semibold"
              />
              {errors.pr_no && (
                <p className="text-red-500 text-xs">{errors.pr_no.message}</p>
              )}
            </div>

            <div className="w-px bg-gray-300 self-stretch" />

            {/* รหัสอ้างอิง — ระบบออกอัตโนมัติ */}
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs text-gray-500 font-medium">รหัสอ้างอิง (ระบบ)</Label>
              <div className="h-9 flex items-center px-3 bg-blue-50 border border-blue-200 rounded-md gap-2">
                <span className="text-xs text-blue-500">AUTO</span>
                <span className="font-mono text-blue-900 font-bold text-lg tracking-widest">
                  {autoNo?.pr_no ? String(autoNo.pr_no).padStart(5, '0') : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-400">ระบบกำหนดให้อัตโนมัติ ใช้สำหรับอ้างอิงภายใน</p>
            </div>

          </div>

          {/* วันที่รับ + ประเภทการรับ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>วันที่รับ <span className="text-red-500">*</span></Label>
              <div className="mt-0.5">
                <ThaiDatePicker
                  value={receiveDate}
                  onChange={(v) => setValue('receive_date', v, { shouldValidate: true })}
                />
              </div>
              {errors.receive_date && (
                <p className="text-red-500 text-xs mt-0.5">{errors.receive_date.message}</p>
              )}
            </div>
            <div>
              <Label>ประเภทการรับ <span className="text-red-500">*</span></Label>
              <div className="mt-0.5">
                <Select
                  value={moneyType > 0 ? String(moneyType) : ''}
                  onValueChange={(v) => setValue('receive_money_type', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEY_TYPES.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.receive_money_type && (
                <p className="text-red-500 text-xs mt-0.5">{errors.receive_money_type.message}</p>
              )}
            </div>
          </div>

          {/* ได้รับเงินจาก */}
          <div>
            <Label>ได้รับเงินจาก <span className="text-red-500">*</span></Label>
            <Input
              {...register('receive_form')}
              placeholder="เช่น ม.ช.อ. สุนิดา กิติยากร หรือ ชื่อหน่วยงาน"
              className="mt-0.5"
            />
            {errors.receive_form && (
              <p className="text-red-500 text-xs mt-0.5">{errors.receive_form.message}</p>
            )}
          </div>

          {/* รายการรับเงิน */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>รายการรับเงิน <span className="text-red-500">*</span></Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => append({ bg_type_id: 0, prd_detail: '', prd_budget: 0 })}
              >
                <Plus className="h-3 w-3" /> เพิ่มรายการ
              </Button>
            </div>

            {/* คอลัมน์หัว */}
            <div className="grid grid-cols-[1fr_200px_110px_32px] gap-2 mb-1 px-1">
              <span className="text-xs text-gray-500 font-medium">รายการ / คำอธิบาย</span>
              <span className="text-xs text-gray-500 font-medium">ประเภทงบประมาณ</span>
              <span className="text-xs text-gray-500 font-medium text-right">จำนวนเงิน (บาท)</span>
              <span />
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {fields.map((field, idx) => {
                const lineType = receiveList[idx]?.bg_type_id ?? 0
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_200px_110px_32px] gap-2 items-start">
                    {/* รายการ */}
                    <div>
                      <Input
                        className="h-9 text-sm"
                        placeholder="รายการรับเงิน เช่น รับเงินค่าอาหารกลางวัน"
                        {...register(`receiveList.${idx}.prd_detail`)}
                      />
                      {errors.receiveList?.[idx]?.prd_detail && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.receiveList[idx]?.prd_detail?.message}
                        </p>
                      )}
                    </div>
                    {/* ประเภทงบประมาณ */}
                    <div>
                      <Select
                        value={lineType > 0 ? String(lineType) : ''}
                        onValueChange={(v) =>
                          setValue(`receiveList.${idx}.bg_type_id`, Number(v))
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          {(budgetTypes ?? []).map((bt) => (
                            <SelectItem key={bt.bg_type_id} value={String(bt.bg_type_id)}>
                              {bt.budget_type_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.receiveList?.[idx]?.bg_type_id && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.receiveList[idx]?.bg_type_id?.message}
                        </p>
                      )}
                    </div>
                    {/* จำนวนเงิน */}
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-9 text-sm text-right"
                        placeholder="0.00"
                        {...register(`receiveList.${idx}.prd_budget`, { valueAsNumber: true })}
                      />
                      {errors.receiveList?.[idx]?.prd_budget && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.receiveList[idx]?.prd_budget?.message}
                        </p>
                      )}
                    </div>
                    {/* ลบ */}
                    <div className="pt-0.5">
                      {fields.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : <div className="w-8" />}
                    </div>
                  </div>
                )
              })}
            </div>

            {errors.receiveList && !Array.isArray(errors.receiveList) && (
              <p className="text-red-500 text-xs mt-1">{(errors.receiveList as any).message}</p>
            )}

            {/* ยอดรวม */}
            <div className="mt-3 flex justify-end items-center gap-2 border-t pt-3">
              <span className="text-sm font-semibold text-gray-600">รวมทั้งสิ้น</span>
              <span className="font-mono text-lg font-bold text-emerald-700">
                {fmt(totalAmount)} บาท
              </span>
            </div>
          </div>

        </div>
      </FormDialog>

      <DeleteWithReasonDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => { if (deleteTarget) deleteMutation.mutate({ item: deleteTarget, reason }) }}
        itemLabel={`รายการรับเงิน เลขที่ "${deleteTarget?.pr_no ?? ''}"`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
