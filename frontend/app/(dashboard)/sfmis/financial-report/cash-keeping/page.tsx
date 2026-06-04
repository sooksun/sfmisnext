'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, RotateCcw, Trash2, AlertTriangle, Banknote, Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { openPrintWindow } from '@/lib/print-utils'
import { officialCashKeepingForm } from '@/lib/official-forms'
import { KRUT_EMBLEM } from '@/lib/krut-emblem'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
import { useAppContext } from '@/hooks/use-app-context'

interface CashKeepingRow {
  ckr_id: number
  record_date: string | null
  amount: number
  money_detail: string | null
  sender_id: number
  sender_name: string | null
  sender_position: string | null
  receiver_id: number
  receiver_name: string | null
  receiver_position: string | null
  note: string | null
  status: number
  returned_date: string | null
  returned_amount: number | null
  return_note: string | null
}

interface AdminItem {
  admin_id: number
  name: string | undefined
  username: string | undefined
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addSchema = z.object({
  record_date: z.string().min(1, 'กรุณาเลือกวันที่'),
  amount: z.number().min(0.01, 'กรุณากรอกจำนวนเงิน'),
  money_detail: z.string().optional(),
  sender_id: z.number().min(1, 'กรุณาเลือกผู้ส่ง'),
  receiver_id: z.number().min(1, 'กรุณาเลือกผู้รับ (ผอ.)'),
  note: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

const returnSchema = z.object({
  returned_date: z.string().min(1, 'กรุณาเลือกวันที่ส่งคืน'),
  returned_amount: z.number().min(0, 'กรุณากรอกจำนวนเงิน'),
  return_note: z.string().optional(),
})
type ReturnForm = z.infer<typeof returnSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export default function CashKeepingPage() {
  const { scId, adminId, syId, scName } = useAppContext()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25

  // ข้อมูลจาก localStorage

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<CashKeepingRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CashKeepingRow | null>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['cash-keeping', scId, syId],
    queryFn: () =>
      apiGet<{ data: CashKeepingRow[]; count: number }>(`CashKeeping/loadRecords/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: adminListRaw } = useQuery({
    queryKey: ['admin-list', scId],
    queryFn: () =>
      apiGet<{ data: AdminItem[]; count: number }>(`B_admin/load_user/${scId}/0/1000`),
    enabled: scId > 0,
  })
  const adminList: AdminItem[] = adminListRaw?.data ?? []

  const rows: CashKeepingRow[] = rawData?.data ?? []
  const keepingRows = rows.filter((r) => r.status === 1)
  const keepingCount = keepingRows.length
  const keepingSum = keepingRows.reduce((s, r) => s + Number(r.amount), 0)

  // ─── Forms ────────────────────────────────────────────────────────────────

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      record_date: new Date().toISOString().substring(0, 10),
      amount: 0,
      money_detail: '',
      sender_id: 0,
      receiver_id: 0,
      note: '',
    },
  })

  const returnForm = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      returned_date: new Date().toISOString().substring(0, 10),
      returned_amount: 0,
      return_note: '',
    },
  })

  // ─── Mutations ────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (values: AddForm) =>
      apiPost('CashKeeping/addRecord', {
        sc_id: scId,
        sy_id: syId,
        record_date: values.record_date,
        amount: values.amount,
        money_detail: values.money_detail || undefined,
        sender_id: values.sender_id,
        receiver_id: values.receiver_id,
        note: values.note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['cash-keeping'] })
        setAddDialogOpen(false)
        addForm.reset({
          record_date: new Date().toISOString().substring(0, 10),
          amount: 0,
          money_detail: '',
          sender_id: 0,
          receiver_id: 0,
          note: '',
        })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const returnMutation = useMutation({
    mutationFn: (values: ReturnForm) =>
      apiPost('CashKeeping/returnRecord', {
        ckr_id: selectedRecord!.ckr_id,
        returned_date: values.returned_date,
        returned_amount: values.returned_amount,
        return_note: values.return_note || undefined,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกการส่งคืนเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['cash-keeping'] })
        setReturnDialogOpen(false)
        setSelectedRecord(null)
        returnForm.reset({
          returned_date: new Date().toISOString().substring(0, 10),
          returned_amount: 0,
          return_note: '',
        })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (ckrId: number) =>
      apiPost('CashKeeping/removeRecord', { ckr_id: ckrId, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['cash-keeping'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด')
      setDeleteTarget(null)
    },
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (n: number) =>
    Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  // พิมพ์แบบฟอร์มทางการ "บันทึกการรับเงินเพื่อเก็บรักษา" (กลุ่มตรวจสอบภายใน สพฐ.)
  const handlePrint = (item: CashKeepingRow) => {
    const body = officialCashKeepingForm({
      scName,
      date: item.record_date ?? undefined,
      rows: [
        {
          detail: item.money_detail || 'เงินสดรับประจำวัน',
          amount: Number(item.amount || 0),
          note: item.note ?? undefined,
        },
      ],
      directorName: item.receiver_name ?? undefined,
      financeOfficerName: item.sender_name ?? undefined,
      returnedDate: item.returned_date,
      returnedAmount: item.returned_amount,
      emblemSrc: KRUT_EMBLEM,
    })
    openPrintWindow({ title: `บันทึกเก็บรักษา_${item.ckr_id}`, body, paper: 'A4' })
  }

  const openReturnDialog = (record: CashKeepingRow) => {
    setSelectedRecord(record)
    returnForm.reset({
      returned_date: new Date().toISOString().substring(0, 10),
      returned_amount: record.amount,
      return_note: '',
    })
    setReturnDialogOpen(true)
  }

  // ─── Table columns ────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'วันที่',
      render: (item: CashKeepingRow) => (
        <span className="whitespace-nowrap">{item.record_date ? fmtDateTH(item.record_date) : '-'}</span>
      ),
    },
    {
      header: 'รายการ/ประเภทเงิน',
      render: (item: CashKeepingRow) => (
        <div>
          <div className="text-sm">{item.money_detail || '-'}</div>
          {item.note && <div className="text-xs text-gray-500 mt-0.5">{item.note}</div>}
        </div>
      ),
    },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: CashKeepingRow) => (
        <span className="font-bold text-gray-800">{fmt(item.amount)}</span>
      ),
    },
    {
      header: 'ผู้ส่ง (เจ้าหน้าที่การเงิน)',
      render: (item: CashKeepingRow) => (
        <div>
          <div className="text-sm">{item.sender_name || '-'}</div>
          {item.sender_position && (
            <div className="text-xs text-gray-500">{item.sender_position}</div>
          )}
        </div>
      ),
    },
    {
      header: 'ผู้รับ (ผอ.)',
      render: (item: CashKeepingRow) => (
        <div>
          <div className="text-sm">{item.receiver_name || '-'}</div>
          {item.receiver_position && (
            <div className="text-xs text-gray-500">{item.receiver_position}</div>
          )}
        </div>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: CashKeepingRow) =>
        item.status === 1 ? (
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs whitespace-nowrap">
            รับเก็บรักษาอยู่
          </span>
        ) : (
          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs whitespace-nowrap">
            ส่งคืนแล้ว
          </span>
        ),
    },
    {
      header: 'วันที่ส่งคืน',
      render: (item: CashKeepingRow) => (
        <span className="whitespace-nowrap text-sm">
          {item.returned_date ? (
            <span>
              {fmtDateTH(item.returned_date)}
              {item.returned_amount != null && (
                <div className="text-xs text-gray-500">{fmt(item.returned_amount)} บาท</div>
              )}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </span>
      ),
    },
    {
      header: 'จัดการ',
      render: (item: CashKeepingRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-7 px-2"
            onClick={() => handlePrint(item)}
            title="พิมพ์บันทึกการรับเงินเพื่อเก็บรักษา"
          >
            <Printer className="h-3 w-3" />
            พิมพ์
          </Button>
          {item.status === 1 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7 px-2"
                onClick={() => openReturnDialog(item)}
              >
                <RotateCcw className="h-3 w-3" />
                ส่งคืน
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="บันทึกการรับเงินเพื่อเก็บรักษา"
        actions={
          <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        }
      />
      <ProcessFlow flow="receive" />

      <div className="p-4 space-y-4">
        {/* ── Summary card ──────────────────────────────────────────────── */}
        {keepingCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-600" />
              <span>
                มีเงินที่ ผอ. รับเก็บรักษาอยู่{' '}
                <strong>{keepingCount} รายการ</strong>{' '}
                รวม <strong>{fmt(keepingSum)} บาท</strong>
              </span>
            </div>
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────────── */}
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

      {/* ── Add Dialog ────────────────────────────────────────────────────── */}
      <FormDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false)
          addForm.reset({
            record_date: new Date().toISOString().substring(0, 10),
            amount: 0,
            money_detail: '',
            sender_id: 0,
            receiver_id: 0,
            note: '',
          })
        }}
        title="เพิ่มบันทึกการรับเงินเพื่อเก็บรักษา"
        size="md"
        onSubmit={addForm.handleSubmit((values) => addMutation.mutate(values))}
        loading={addMutation.isPending}
        submitLabel="บันทึก"
      >
        <div className="space-y-3">
          {/* วันที่ */}
          <div>
            <Label>วันที่รับเก็บรักษา <span className="text-red-500">*</span></Label>
            <ThaiDatePicker
              value={addForm.watch('record_date')}
              onChange={(v) => addForm.setValue('record_date', v, { shouldValidate: true })}
            />
            {addForm.formState.errors.record_date && (
              <p className="text-xs text-red-500 mt-1">{addForm.formState.errors.record_date.message}</p>
            )}
          </div>

          {/* จำนวนเงิน */}
          <div>
            <Label>จำนวนเงิน (บาท) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...addForm.register('amount', { valueAsNumber: true })}
            />
            {addForm.formState.errors.amount && (
              <p className="text-xs text-red-500 mt-1">{addForm.formState.errors.amount.message}</p>
            )}
          </div>

          {/* ประเภทและรายการเงิน */}
          <div>
            <Label>ประเภทและรายการเงินที่รับเก็บ</Label>
            <Input
              placeholder="เช่น เงินสด รายรับประจำวัน"
              {...addForm.register('money_detail')}
            />
          </div>

          {/* ผู้ส่ง */}
          <div>
            <Label>ผู้ส่ง (เจ้าหน้าที่การเงิน) <span className="text-red-500">*</span></Label>
            <Select
              value={addForm.watch('sender_id') > 0 ? String(addForm.watch('sender_id')) : ''}
              onValueChange={(v) => addForm.setValue('sender_id', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- เลือกผู้ส่ง --" />
              </SelectTrigger>
              <SelectContent>
                {adminList.map((a) => (
                  <SelectItem key={a.admin_id} value={String(a.admin_id)}>
                    {a.name ?? a.username ?? `ID ${a.admin_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addForm.formState.errors.sender_id && (
              <p className="text-xs text-red-500 mt-1">{addForm.formState.errors.sender_id.message}</p>
            )}
          </div>

          {/* ผู้รับ (ผอ.) */}
          <div>
            <Label>ผู้รับ (ผู้อำนวยการ) <span className="text-red-500">*</span></Label>
            <Select
              value={addForm.watch('receiver_id') > 0 ? String(addForm.watch('receiver_id')) : ''}
              onValueChange={(v) => addForm.setValue('receiver_id', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- เลือกผู้รับ (ผอ.) --" />
              </SelectTrigger>
              <SelectContent>
                {adminList.map((a) => (
                  <SelectItem key={a.admin_id} value={String(a.admin_id)}>
                    {a.name ?? a.username ?? `ID ${a.admin_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addForm.formState.errors.receiver_id && (
              <p className="text-xs text-red-500 mt-1">{addForm.formState.errors.receiver_id.message}</p>
            )}
          </div>

          {/* หมายเหตุ */}
          <div>
            <Label>หมายเหตุ</Label>
            <Input
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              {...addForm.register('note')}
            />
          </div>
        </div>
      </FormDialog>

      {/* ── Return Dialog ─────────────────────────────────────────────────── */}
      <FormDialog
        open={returnDialogOpen}
        onClose={() => {
          setReturnDialogOpen(false)
          setSelectedRecord(null)
          returnForm.reset({
            returned_date: new Date().toISOString().substring(0, 10),
            returned_amount: 0,
            return_note: '',
          })
        }}
        title="บันทึกการส่งคืนเงิน"
        size="sm"
        onSubmit={returnForm.handleSubmit((values) => returnMutation.mutate(values))}
        loading={returnMutation.isPending}
        submitLabel="บันทึกการส่งคืน"
      >
        <div className="space-y-3">
          {selectedRecord && (
            <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm">
              จำนวนเงินที่รับเก็บ:{' '}
              <strong className="text-gray-800">{fmt(selectedRecord.amount)} บาท</strong>
              {selectedRecord.money_detail && (
                <div className="text-xs text-gray-500 mt-0.5">{selectedRecord.money_detail}</div>
              )}
            </div>
          )}

          {/* วันที่ส่งคืน */}
          <div>
            <Label>วันที่ส่งคืน <span className="text-red-500">*</span></Label>
            <ThaiDatePicker
              value={returnForm.watch('returned_date')}
              onChange={(v) => returnForm.setValue('returned_date', v, { shouldValidate: true })}
            />
            {returnForm.formState.errors.returned_date && (
              <p className="text-xs text-red-500 mt-1">{returnForm.formState.errors.returned_date.message}</p>
            )}
          </div>

          {/* จำนวนเงินที่ส่งคืน */}
          <div>
            <Label>จำนวนเงินที่ส่งคืน (บาท) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...returnForm.register('returned_amount', { valueAsNumber: true })}
            />
            {returnForm.formState.errors.returned_amount && (
              <p className="text-xs text-red-500 mt-1">{returnForm.formState.errors.returned_amount.message}</p>
            )}
          </div>

          {/* หมายเหตุการส่งคืน */}
          <div>
            <Label>หมายเหตุการส่งคืน</Label>
            <Input
              placeholder="หมายเหตุ (ถ้ามี)"
              {...returnForm.register('return_note')}
            />
          </div>
        </div>
      </FormDialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="ยืนยันการลบรายการ"
        description={
          deleteTarget
            ? `ต้องการลบรายการวันที่ ${deleteTarget.record_date ? fmtDateTH(deleteTarget.record_date) : '-'} จำนวน ${fmt(deleteTarget.amount)} บาท ใช่หรือไม่?`
            : 'ต้องการลบรายการนี้ใช่หรือไม่?'
        }
        confirmLabel="ลบรายการ"
        cancelLabel="ยกเลิก"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.ckr_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
