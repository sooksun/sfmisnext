'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, AlertTriangle, BookOpen, X } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookItem {
  rb_id: number
  sc_id: number
  sy_id: number
  budget_year: string | null
  book_code: string | null
  from_no: number
  to_no: number
  current_no: number
  status: number
  remaining: number
  usage_pct: number
  opened_date: string | null
  closed_date: string | null
  voided_date: string | null
  voided_by: number | null
  voided_by_name: string | null
  void_reason: string | null
  note: string | null
  create_date: string | null
}

// getStorageData replaced by useAppContext hook

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const addSchema = z.object({
  book_code: z.string().optional(),
  from_no: z.number({ message: 'กรุณาระบุเลขที่เริ่มต้น' }).min(1, 'เลขที่ต้องมากกว่า 0'),
  to_no: z.number({ message: 'กรุณาระบุเลขที่สิ้นสุด' }).min(1, 'เลขที่ต้องมากกว่า 0'),
  opened_date: z.string().optional(),
  note: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

const closeSchema = z.object({
  closed_date: z.string().min(1, 'กรุณาระบุวันที่ปิดเล่ม'),
})
type CloseForm = z.infer<typeof closeSchema>

const voidSchema = z.object({
  void_reason: z.string().min(1, 'กรุณาระบุเหตุผลการยกเลิก'),
})
type VoidForm = z.infer<typeof voidSchema>

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  if (status === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        กำลังใช้
      </span>
    )
  }
  if (status === 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        หมดอายุ
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 line-through">
      เลิกใช้
    </span>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function UsageBar({ pct }: { pct: number }) {
  const color =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 70
      ? 'bg-yellow-400'
      : 'bg-green-500'
  return (
    <div className="w-full rounded-full bg-gray-200 h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReceiptBookPage() {
  const { scId, syId, adminId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const queryClient = useQueryClient()

  // dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)

  // ─── Query: all books ─────────────────────────────────────────────────────

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['receipt-books', scId, syId, apiYear],
    queryFn: () =>
      apiGet<{ data: BookItem[]; count: number }>(
        `ReceiptBook/loadBooks/${scId}/${syId}/${apiYear}`,
      ),
    enabled: scId > 0 && syId > 0 && !!apiYear,
  })

  const books = booksData?.data ?? []
  const activeBook = books.find((b) => b.status === 1) ?? null

  // ─── Add form ─────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { book_code: '', from_no: 1, to_no: 50, opened_date: '', note: '' },
  })

  const addMutation = useMutation({
    mutationFn: (values: AddForm) =>
      apiPost<{ flag: boolean; ms: string }>('ReceiptBook/addBook', {
        sc_id: scId,
        sy_id: syId,
        budget_year: apiYear,
        book_code: values.book_code ?? '',
        from_no: values.from_no,
        to_no: values.to_no,
        opened_date: values.opened_date ?? '',
        note: values.note ?? '',
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['receipt-books'] })
        setAddOpen(false)
        addForm.reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Close form ───────────────────────────────────────────────────────────

  const closeForm = useForm<CloseForm>({
    resolver: zodResolver(closeSchema),
    defaultValues: { closed_date: '' },
  })

  const closeMutation = useMutation({
    mutationFn: (values: CloseForm) =>
      apiPost<{ flag: boolean; ms: string }>('ReceiptBook/closeBook', {
        rb_id: selectedBook!.rb_id,
        closed_date: values.closed_date,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['receipt-books'] })
        setCloseOpen(false)
        setSelectedBook(null)
        closeForm.reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Void form ────────────────────────────────────────────────────────────

  const voidForm = useForm<VoidForm>({
    resolver: zodResolver(voidSchema),
    defaultValues: { void_reason: '' },
  })

  const voidMutation = useMutation({
    mutationFn: (values: VoidForm) =>
      apiPost<{ flag: boolean; ms: string }>('ReceiptBook/voidBook', {
        rb_id: selectedBook!.rb_id,
        void_reason: values.void_reason,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        queryClient.invalidateQueries({ queryKey: ['receipt-books'] })
        setVoidOpen(false)
        setSelectedBook(null)
        voidForm.reset()
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleOpenClose(book: BookItem) {
    setSelectedBook(book)
    closeForm.reset({ closed_date: '' })
    setCloseOpen(true)
  }

  function handleOpenVoid(book: BookItem) {
    setSelectedBook(book)
    voidForm.reset({ void_reason: '' })
    setVoidOpen(true)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="ทะเบียนเล่มใบเสร็จรับเงิน"
        subtitle={budgetYear ? `ปีงบประมาณ ${budgetYear}` : undefined}
      />

      {/* ─── Active Book Card ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
          กำลังโหลด...
        </div>
      ) : activeBook ? (
        <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-base">
                  {activeBook.book_code ?? 'ไม่ระบุรหัสเล่ม'}
                </p>
                <p className="text-sm text-green-700">
                  เลขที่ {activeBook.from_no}–{activeBook.to_no} &nbsp;|&nbsp; ใช้ถึง{' '}
                  <span className="font-semibold">{activeBook.current_no}</span>
                  &nbsp;|&nbsp; คงเหลือ{' '}
                  <span className="font-semibold">{activeBook.remaining}</span> ฉบับ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeBook.remaining < 5 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  ใกล้หมดเล่ม!
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-orange-400 text-orange-700 hover:bg-orange-50"
                onClick={() => handleOpenClose(activeBook)}
              >
                ปิดเล่ม
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-red-400 text-red-700 hover:bg-red-50"
                onClick={() => handleOpenVoid(activeBook)}
              >
                <X className="h-3 w-3 mr-1" />
                ยกเลิกเล่ม
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <UsageBar pct={activeBook.usage_pct} />
            <p className="text-xs text-green-600 text-right">{activeBook.usage_pct}% ใช้ไปแล้ว</p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => { addForm.reset(); setAddOpen(true) }}
        >
          <Plus className="h-8 w-8 text-gray-400" />
          <p className="text-gray-500 font-medium">ยังไม่มีเล่มใบเสร็จที่ใช้งานอยู่</p>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            เพิ่มเล่มใบเสร็จ
          </Button>
        </div>
      )}

      {/* เพิ่มเล่ม — ปุ่มบนสุด (กรณีมี activeBook อยู่แล้ว ปุ่มจะแสดงในการ์ด แต่ยังให้เพิ่มได้จากที่นี่) */}
      {activeBook && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { addForm.reset(); setAddOpen(true) }}
          >
            <Plus className="h-4 w-4 mr-1" />
            เพิ่มเล่มใบเสร็จ
          </Button>
        </div>
      )}

      {/* ─── History Table ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">ประวัติเล่มใบเสร็จทั้งหมด</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-blue-900">เล่มที่</th>
                <th className="px-3 py-2 text-right font-bold text-blue-900">เลขที่เริ่ม</th>
                <th className="px-3 py-2 text-right font-bold text-blue-900">เลขที่สิ้นสุด</th>
                <th className="px-3 py-2 text-right font-bold text-blue-900">ใช้ถึง</th>
                <th className="px-3 py-2 text-right font-bold text-blue-900">คงเหลือ</th>
                <th className="px-3 py-2 text-center font-bold text-blue-900">สถานะ</th>
                <th className="px-3 py-2 text-left font-bold text-blue-900">วันเริ่มใช้</th>
                <th className="px-3 py-2 text-left font-bold text-blue-900">วันปิด</th>
                <th className="px-3 py-2 text-left font-bold text-blue-900">หมายเหตุ</th>
                <th className="px-3 py-2 text-left font-bold text-blue-900">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    ไม่พบข้อมูลเล่มใบเสร็จ
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.rb_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-700">
                      {book.book_code ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right">{book.from_no}</td>
                    <td className="px-3 py-2 text-right">{book.to_no}</td>
                    <td className="px-3 py-2 text-right font-semibold">{book.current_no}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          book.remaining < 5 && book.status === 1
                            ? 'text-red-600 font-semibold'
                            : ''
                        }
                      >
                        {book.remaining}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={book.status} />
                    </td>
                    <td className="px-3 py-2 text-gray-600">{fmtDateTH(book.opened_date)}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {book.status === 3
                        ? fmtDateTH(book.voided_date)
                        : fmtDateTH(book.closed_date)}
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">
                      {book.status === 3 && book.void_reason
                        ? `[ยกเลิก] ${book.void_reason}`
                        : (book.note ?? '-')}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {book.status === 1 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => handleOpenClose(book)}
                            >
                              ปิดเล่ม
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleOpenVoid(book)}
                            >
                              ยกเลิก
                            </Button>
                          </>
                        )}
                        {book.status === 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleOpenVoid(book)}
                          >
                            ยกเลิก
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Dialog: เพิ่มเล่มใบเสร็จ ─────────────────────────────────────── */}
      <FormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="เพิ่มเล่มใบเสร็จรับเงิน"
        size="md"
        submitLabel="เพิ่มเล่มใบเสร็จ"
        loading={addMutation.isPending}
        onSubmit={addForm.handleSubmit((v) => addMutation.mutate(v))}
      >
        <div className="space-y-4">
          {/* รหัสเล่ม */}
          <div className="space-y-1">
            <Label>รหัสเล่ม / เล่มที่</Label>
            <Input
              {...addForm.register('book_code')}
              placeholder="เช่น เล่ม 1, REC-2569-001"
            />
          </div>

          {/* เลขที่เริ่ม / สิ้นสุด */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>เลขที่เริ่มต้น <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                {...addForm.register('from_no', { valueAsNumber: true })}
                placeholder="1"
              />
              {addForm.formState.errors.from_no && (
                <p className="text-xs text-red-500">{addForm.formState.errors.from_no.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>เลขที่สิ้นสุด <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                {...addForm.register('to_no', { valueAsNumber: true })}
                placeholder="50"
              />
              {addForm.formState.errors.to_no && (
                <p className="text-xs text-red-500">{addForm.formState.errors.to_no.message}</p>
              )}
            </div>
          </div>

          {/* วันเริ่มใช้ */}
          <div className="space-y-1">
            <Label>วันเริ่มใช้</Label>
            <ThaiDatePicker
              value={addForm.watch('opened_date') ?? ''}
              onChange={(v) => addForm.setValue('opened_date', v, { shouldValidate: true })}
            />
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea
              {...addForm.register('note')}
              placeholder="หมายเหตุเพิ่มเติม..."
              rows={2}
            />
          </div>
        </div>
      </FormDialog>

      {/* ─── Dialog: ปิดเล่ม ──────────────────────────────────────────────── */}
      <FormDialog
        open={closeOpen}
        onClose={() => { setCloseOpen(false); setSelectedBook(null) }}
        title={`ปิดเล่มใบเสร็จ — ${selectedBook?.book_code ?? ''}`}
        size="sm"
        submitLabel="ยืนยันปิดเล่ม"
        loading={closeMutation.isPending}
        onSubmit={closeForm.handleSubmit((v) => closeMutation.mutate(v))}
      >
        {selectedBook && (
          <div className="space-y-4">
            <div className="rounded-lg bg-orange-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">เล่มที่:</span>{' '}
                <span className="font-medium">{selectedBook.book_code ?? '-'}</span>
              </p>
              <p>
                <span className="text-gray-500">ช่วงเลขที่:</span>{' '}
                <span className="font-medium">{selectedBook.from_no}–{selectedBook.to_no}</span>
              </p>
              <p>
                <span className="text-gray-500">คงเหลือ:</span>{' '}
                <span className="font-semibold text-orange-700">{selectedBook.remaining} ฉบับ</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label>วันที่ปิดเล่ม <span className="text-red-500">*</span></Label>
              <ThaiDatePicker
                value={closeForm.watch('closed_date') ?? ''}
                onChange={(v) => closeForm.setValue('closed_date', v, { shouldValidate: true })}
              />
              {closeForm.formState.errors.closed_date && (
                <p className="text-xs text-red-500">{closeForm.formState.errors.closed_date.message}</p>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      {/* ─── Dialog: ยกเลิกเล่ม (Void) ────────────────────────────────────── */}
      <FormDialog
        open={voidOpen}
        onClose={() => { setVoidOpen(false); setSelectedBook(null) }}
        title={`ยกเลิกเล่มใบเสร็จ — ${selectedBook?.book_code ?? ''}`}
        size="sm"
        submitLabel="ยืนยันยกเลิกเล่ม"
        loading={voidMutation.isPending}
        onSubmit={voidForm.handleSubmit((v) => voidMutation.mutate(v))}
      >
        {selectedBook && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm space-y-1">
              <p className="font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                การยกเลิกไม่สามารถย้อนกลับได้
              </p>
              <p>
                <span className="text-gray-500">เล่มที่:</span>{' '}
                <span className="font-medium">{selectedBook.book_code ?? '-'}</span>
              </p>
              <p>
                <span className="text-gray-500">สถานะปัจจุบัน:</span>{' '}
                <StatusBadge status={selectedBook.status} />
              </p>
            </div>

            <div className="space-y-1">
              <Label>เหตุผลการยกเลิก <span className="text-red-500">*</span></Label>
              <Textarea
                {...voidForm.register('void_reason')}
                placeholder="ระบุเหตุผลการยกเลิกเล่มใบเสร็จ..."
                rows={3}
              />
              {voidForm.formState.errors.void_reason && (
                <p className="text-xs text-red-500">{voidForm.formState.errors.void_reason.message}</p>
              )}
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
