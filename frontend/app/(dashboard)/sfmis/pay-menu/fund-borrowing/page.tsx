'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, RotateCcw, Ban } from 'lucide-react'
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
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'

interface FbItem {
  fb_id: number
  from_money_type_id: number
  from_money_type_name: string | null
  to_money_type_id: number
  to_money_type_name: string | null
  amount: number
  borrow_date: string | null
  repay_date: string | null
  purpose: string | null
  status: number
  is_outstanding: boolean
}

interface BudgetTypeItem {
  bg_type_id: number
  budget_type: string
}

const addSchema = z.object({
  from_money_type_id: z.number({ error: 'เลือกประเภทเงินต้นทาง' }).min(1, 'เลือกประเภทเงินต้นทาง'),
  to_money_type_id: z.number({ error: 'เลือกประเภทเงินปลายทาง' }).min(1, 'เลือกประเภทเงินปลายทาง'),
  amount: z.number({ error: 'ระบุจำนวนเงิน' }).min(0.01, 'จำนวนเงินต้องมากกว่า 0'),
  borrow_date: z.string().min(1, 'ระบุวันที่ยืม'),
  purpose: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

export default function FundBorrowingPage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [repayTarget, setRepayTarget] = useState<FbItem | null>(null)
  const [repayDate, setRepayDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['fund-borrowings', scId, syId, apiYear],
    queryFn: () =>
      apiGet<{ data: FbItem[]; count: number; total_outstanding: number }>(
        `FundBorrowing/loadBorrowings/${scId}/${syId}/${apiYear}`,
      ),
    enabled: scId > 0 && syId > 0,
  })

  const { data: budgetTypesData } = useQuery({
    queryKey: ['budget-types', scId],
    queryFn: () => apiGet<{ data: BudgetTypeItem[] }>(`Policy/loadBudgetIncomeType/${scId}`),
    enabled: scId > 0,
  })
  const moneyTypes = budgetTypesData?.data ?? []

  const form = useForm<AddForm>({ resolver: zodResolver(addSchema) })

  const addMut = useMutation({
    mutationFn: (v: AddForm) =>
      apiPost<{ flag: boolean; ms: string }>('FundBorrowing/addBorrowing', {
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        ...v,
      }),
    onSuccess: (res) => {
      toast[res.flag ? 'success' : 'error'](res.ms)
      if (res.flag) {
        setAddOpen(false)
        form.reset()
        qc.invalidateQueries({ queryKey: ['fund-borrowings', scId, syId, apiYear] })
      }
    },
    onError: (e: Error) => toast.error(e.message || 'บันทึกไม่สำเร็จ'),
  })

  const repayMut = useMutation({
    mutationFn: (v: { fb_id: number; repay_date: string }) =>
      apiPost<{ flag: boolean; ms: string }>('FundBorrowing/repayBorrowing', v),
    onSuccess: (res) => {
      toast[res.flag ? 'success' : 'error'](res.ms)
      if (res.flag) {
        setRepayTarget(null)
        qc.invalidateQueries({ queryKey: ['fund-borrowings', scId, syId, apiYear] })
      }
    },
  })

  const cancelMut = useMutation({
    mutationFn: (fb_id: number) =>
      apiPost<{ flag: boolean; ms: string }>('FundBorrowing/cancelBorrowing', { fb_id }),
    onSuccess: (res) => {
      toast[res.flag ? 'success' : 'error'](res.ms)
      if (res.flag) qc.invalidateQueries({ queryKey: ['fund-borrowings', scId, syId, apiYear] })
    },
  })

  const rows = data?.data ?? []
  const fromVal = form.watch('from_money_type_id')
  const toVal = form.watch('to_money_type_id')
  const borrowDate = form.watch('borrow_date')

  return (
    <div className="space-y-4">
      <PageHeader
        title="ยืมเงินข้ามประเภท"
        subtitle="ยืมเงินจากประเภทเงินหนึ่งไปจ่ายแทนอีกประเภท แล้วคืนภายในปีงบ (เงินผ่าน/เงินฝากให้ยืมไม่ได้)"
        actions={
          <Button onClick={() => { form.reset(); setAddOpen(true) }}>
            <Plus className="mr-1 h-4 w-4" /> เพิ่มการยืม
          </Button>
        }
      />

      {data && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ยอดค้างคืนรวม: <b>{fmtBaht(data.total_outstanding ?? 0)}</b> บาท
        </div>
      )}

      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'จากประเภทเงิน', render: (r: FbItem) => r.from_money_type_name ?? String(r.from_money_type_id) },
          { header: 'ไปประเภทเงิน', render: (r: FbItem) => r.to_money_type_name ?? String(r.to_money_type_id) },
          { header: 'จำนวนเงิน', className: 'text-right', render: (r: FbItem) => fmtBaht(r.amount) },
          { header: 'วันที่ยืม', render: (r: FbItem) => (r.borrow_date ? fmtDateTH(r.borrow_date) : '—') },
          { header: 'วันที่คืน', render: (r: FbItem) => (r.repay_date ? fmtDateTH(r.repay_date) : '—') },
          {
            header: 'สถานะ',
            render: (r: FbItem) =>
              r.status === 1 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">ค้างคืน</span>
              ) : r.status === 2 ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">คืนแล้ว</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">ยกเลิก</span>
              ),
          },
          {
            header: '',
            render: (r: FbItem) =>
              r.status === 1 ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setRepayTarget(r); setRepayDate('') }}>
                    <RotateCcw className="mr-1 h-3 w-3" /> คืนเงิน
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(r.fb_id)}>
                    <Ban className="h-3 w-3" />
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />

      {/* เพิ่มการยืม */}
      <FormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="เพิ่มการยืมเงินข้ามประเภท"
        onSubmit={form.handleSubmit((v) => addMut.mutate(v))}
        loading={addMut.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label>จากประเภทเงิน (ผู้ให้ยืม)</Label>
            <Select value={fromVal ? String(fromVal) : ''} onValueChange={(v) => form.setValue('from_money_type_id', Number(v), { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="เลือกประเภทเงิน" /></SelectTrigger>
              <SelectContent>
                {moneyTypes.map((m) => (
                  <SelectItem key={m.bg_type_id} value={String(m.bg_type_id)}>{m.budget_type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.from_money_type_id && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.from_money_type_id.message}</p>
            )}
          </div>
          <div>
            <Label>ไปประเภทเงิน (ผู้ยืม)</Label>
            <Select value={toVal ? String(toVal) : ''} onValueChange={(v) => form.setValue('to_money_type_id', Number(v), { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="เลือกประเภทเงิน" /></SelectTrigger>
              <SelectContent>
                {moneyTypes.map((m) => (
                  <SelectItem key={m.bg_type_id} value={String(m.bg_type_id)}>{m.budget_type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.to_money_type_id && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.to_money_type_id.message}</p>
            )}
          </div>
          <div>
            <Label>จำนวนเงิน (บาท)</Label>
            <Input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} />
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div>
            <Label>วันที่ยืม</Label>
            <ThaiDatePicker value={borrowDate ?? ''} onChange={(v) => form.setValue('borrow_date', v, { shouldValidate: true })} />
            {form.formState.errors.borrow_date && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.borrow_date.message}</p>
            )}
          </div>
          <div>
            <Label>วัตถุประสงค์</Label>
            <Input {...form.register('purpose')} placeholder="เช่น สำรองจ่ายค่าอาหารกลางวัน" />
          </div>
        </div>
      </FormDialog>

      {/* คืนเงิน */}
      <FormDialog
        open={!!repayTarget}
        onClose={() => setRepayTarget(null)}
        title="บันทึกการคืนเงินยืมข้ามประเภท"
        onSubmit={() => {
          if (!repayTarget) return
          if (!repayDate) { toast.error('กรุณาระบุวันที่คืน'); return }
          repayMut.mutate({ fb_id: repayTarget.fb_id, repay_date: repayDate })
        }}
        loading={repayMut.isPending}
      >
        {repayTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              คืนเงิน {fmtBaht(repayTarget.amount)} บาท จาก “{repayTarget.to_money_type_name}” → “{repayTarget.from_money_type_name}”
            </p>
            <div>
              <Label>วันที่คืน</Label>
              <ThaiDatePicker value={repayDate} onChange={setRepayDate} />
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
