'use client'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
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
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'

// ====== Types ================================================================

interface WCRow {
  wc_id: number
  wc_no: string
  of_id: number
  wc_rank: number
  cer_date: string
  sy_id: number
  year: string
  status: number
  detail: string
  p_name: string
  amount: number
  deduct: number
  update_date: string
}

interface CheckItem {
  of_id: number
  of_no: string
  detail: string
  p_name: string
  amount: number
  cal_vat: number // 1 = คำนวน VAT ก่อน, 2 = ไม่คำนวน
}

// ====== Zod schema ===========================================================

const wcSchema = z.object({
  of_id: z.number().min(1, 'กรุณาเลือกใบสำคัญจ่าย'),
  wc_no: z.string().min(1, 'กรุณากรอกเล่มที่/เลขที่'),
  wc_rank: z.number().min(1, 'กรุณากรอกลำดับที่ในแบบ'),
  cer_date: z.string().min(1, 'กรุณาเลือกวันที่ออกหนังสือ'),
  status: z.number(),
})
type WCForm = z.infer<typeof wcSchema>

// ====== Helpers ==============================================================

const STATUS_LABEL: Record<number, { text: string; color: string }> = {
  100: { text: 'กำลังดำเนินการ', color: 'text-blue-600 bg-blue-50' },
  101: { text: 'ออกหนังสือรับรองแล้ว', color: 'text-green-600 bg-green-50' },
}

/** คำนวณภาษีหัก ณ ที่จ่าย (1%)
 *  - cal_vat=1: ถอน VAT ออกก่อน (amount×7/107) แล้วหัก 1%
 *  - อื่น ๆ: หัก 1% จากยอดเต็ม */
function calcDeduct(amount: number, calVat: number): number {
  if (calVat === 1) {
    const vat = amount - (amount * 7) / 107
    return vat * 0.01
  }
  return amount * 0.01
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

// ============================================================================

export default function WithholdingCertificatePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WCRow | null>(null)
  const [editing, setEditing] = useState<WCRow | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [year, setYear] = useState('')
  const [upBy, setUpBy] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
      if (userData?.admin_id) setUpBy(Number(userData.admin_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
      if (years?.budget_date?.budget_year) setYear(String(years.budget_date.budget_year))
    } catch {}
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: listData, isLoading } = useQuery({
    queryKey: ['wc-list', scId, syId],
    queryFn: () =>
      apiGet<WCRow[]>(`Withholding_certificate/loadWithholdingCertificate/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const { data: checksData } = useQuery({
    queryKey: ['wc-checks', scId, syId],
    queryFn: () =>
      apiGet<CheckItem[]>(`Withholding_certificate/loadCheck/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const rows = Array.isArray(listData) ? listData : []
  const checks = Array.isArray(checksData) ? checksData : []

  // ── Form ─────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WCForm>({
    resolver: zodResolver(wcSchema),
    defaultValues: { of_id: 0, wc_no: '', wc_rank: 1, cer_date: '', status: 100 },
  })

  const ofId = watch('of_id')
  const status = watch('status')
  const cerDate = watch('cer_date')

  // หาข้อมูลเช็คที่เลือก เพื่อแสดงยอดเงินและคำนวณภาษี
  const selectedCheck = useMemo(
    () => checks.find((c) => c.of_id === ofId) ?? null,
    [checks, ofId],
  )

  const deductCalc = useMemo(
    () => (selectedCheck ? calcDeduct(selectedCheck.amount, selectedCheck.cal_vat) : 0),
    [selectedCheck],
  )

  // สถานะ 101 = ออกแล้ว → ล็อกฟอร์ม
  const isLocked = status === 101

  // ── Mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (form: WCForm) => {
      const payload = { ...form, sc_id: scId, sy_id: syId, year, up_by: upBy }
      if (editing) {
        return apiPost('Withholding_certificate/updateWithholdingCertificate', {
          ...payload,
          wc_id: editing.wc_id,
        })
      }
      return apiPost('Withholding_certificate/addWithholdingCertificate', payload)
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['wc-list'] })
        setDialogOpen(false)
        reset()
      } else {
        toast.error(res?.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: WCRow) =>
      apiPost('Withholding_certificate/updateWithholdingCertificate', {
        wc_id: item.wc_id,
        del: 1,
        up_by: upBy,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['wc-list'] })
      } else {
        toast.error(res?.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null)
    reset({
      of_id: 0,
      wc_no: '',
      wc_rank: 1,
      cer_date: new Date().toISOString().substring(0, 10),
      status: 100,
    })
    setDialogOpen(true)
  }

  function openEdit(item: WCRow) {
    setEditing(item)
    reset({
      of_id: item.of_id,
      wc_no: item.wc_no ?? '',
      wc_rank: item.wc_rank ?? 1,
      cer_date: item.cer_date ? String(item.cer_date).substring(0, 10) : '',
      status: item.status,
    })
    setDialogOpen(true)
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'จัดการ',
      render: (item: WCRow) => (
        <div className="flex gap-1">
          {item.status !== 101 && (
            <Button size="sm" variant="warning" onClick={() => openEdit(item)} title="แก้ไข">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteTarget(item)}
            title="ลบ"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      headerClassName: 'w-24',
    },
    {
      header: 'เล่มที่/เลขที่',
      render: (item: WCRow) => <span className="font-medium">{item.wc_no || '—'}</span>,
    },
    { header: 'ผู้รับเงิน / คู่สัญญา', key: 'p_name' as keyof WCRow },
    { header: 'รายการ', key: 'detail' as keyof WCRow },
    {
      header: 'จำนวนเงิน (บาท)',
      render: (item: WCRow) => (
        <span className="font-mono text-right block">{fmt(item.amount)}</span>
      ),
    },
    {
      header: 'ภาษีหัก ณ ที่จ่าย (บาท)',
      render: (item: WCRow) => (
        <span className="font-mono text-right block text-orange-600">{fmt(item.deduct)}</span>
      ),
    },
    {
      header: 'วันที่ออก',
      render: (item: WCRow) => (
        <span>{fmtDateTH(item.cer_date)}</span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: WCRow) => {
        const s = STATUS_LABEL[item.status] ?? { text: String(item.status), color: 'text-gray-500 bg-gray-50' }
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
            {s.text}
          </span>
        )
      },
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: WCRow) => (
        <small className="text-gray-500">{getThaiDateTime(item.update_date)}</small>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="หนังสือรับรองการหักภาษี ณ ที่จ่าย"
        actions={
          <Button onClick={openAdd} disabled={scId === 0}>
            <Plus className="h-4 w-4" />
            เพิ่มหนังสือรับรอง
          </Button>
        }
      />

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

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <FormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); reset() }}
        title={editing ? 'แก้ไขหนังสือรับรอง' : 'เพิ่มหนังสือรับรองการหักภาษี ณ ที่จ่าย'}
        onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
      >
        <div className="space-y-3">

          {/* เลือกใบสำคัญจ่าย (เช็ค) */}
          <div>
            <Label>ใบสำคัญจ่าย (เช็ค) *</Label>
            <Select
              value={ofId > 0 ? String(ofId) : ''}
              onValueChange={(v) => setValue('of_id', Number(v))}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกใบสำคัญจ่าย" />
              </SelectTrigger>
              <SelectContent>
                {checks.map((c) => (
                  <SelectItem key={c.of_id} value={String(c.of_id)}>
                    {c.of_no ? `${c.of_no} — ` : ''}{c.p_name} ({fmt(c.amount)} บาท)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.of_id && <p className="text-red-500 text-xs mt-1">{errors.of_id.message}</p>}
          </div>

          {/* ยอดเงินและภาษีคำนวณอัตโนมัติ */}
          {selectedCheck && (
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">จำนวนเงินในใบสำคัญ</p>
                <p className="font-mono font-medium">{fmt(selectedCheck.amount)} บาท</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ภาษีหัก ณ ที่จ่าย (1%)</p>
                <p className="font-mono font-medium text-orange-600">{fmt(deductCalc)} บาท</p>
                {selectedCheck.cal_vat === 1 && (
                  <p className="text-xs text-gray-400">คำนวณจากยอดหลัง VAT</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* เล่มที่/เลขที่ */}
            <div>
              <Label>เล่มที่ / เลขที่ *</Label>
              <Input
                {...register('wc_no')}
                placeholder="เช่น 01/2567"
                disabled={isLocked}
              />
              {errors.wc_no && <p className="text-red-500 text-xs mt-1">{errors.wc_no.message}</p>}
            </div>

            {/* ลำดับที่ในแบบ */}
            <div>
              <Label>ลำดับที่ในแบบ *</Label>
              <Input
                type="number"
                min="1"
                {...register('wc_rank', { valueAsNumber: true })}
                placeholder="1"
                disabled={isLocked}
              />
              {errors.wc_rank && <p className="text-red-500 text-xs mt-1">{errors.wc_rank.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* วันที่ออกหนังสือ */}
            <div>
              <Label>วันที่ออกหนังสือรับรอง *</Label>
              <ThaiDatePicker
                value={cerDate}
                onChange={(v) => setValue('cer_date', v, { shouldValidate: true })}
                disabled={isLocked}
              />
              {errors.cer_date && <p className="text-red-500 text-xs mt-1">{errors.cer_date.message}</p>}
            </div>

            {/* สถานะ */}
            <div>
              <Label>สถานะ</Label>
              <Select
                value={String(status)}
                onValueChange={(v) => setValue('status', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">กำลังดำเนินการ</SelectItem>
                  <SelectItem value="101">ออกหนังสือรับรองแล้ว</SelectItem>
                </SelectContent>
              </Select>
              {status === 101 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ เมื่อเปลี่ยนเป็น &quot;ออกแล้ว&quot; จะไม่สามารถแก้ไขได้อีก
                </p>
              )}
            </div>
          </div>
        </div>
      </FormDialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบหนังสือรับรอง "${deleteTarget?.wc_no || `#${deleteTarget?.wc_id}`}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
