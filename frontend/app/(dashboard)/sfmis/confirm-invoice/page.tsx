'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface ConfirmInvoice {
  rw_id: number
  sc_id: number
  invoice_no: string
  invoice_name: string
  invoice_date: string
  budgets: number
  project_name: string
  partner_name: string
  bank_name: string
  account_no: string
  budget_type_name: string
  status: number
  remark: string
  precheck_note: string
  up_by: string
  up_date: string
}

// สถานะตาม request_withdraw.status
const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'ร่าง', color: 'text-gray-500' },
  50: { label: 'รอเจ้าหน้าที่ตรวจฎีกา', color: 'text-amber-600' },
  51: { label: 'ตรวจไม่ผ่าน — ส่งกลับแก้ไข', color: 'text-orange-600' },
  100: { label: 'ตรวจแล้ว รอหัวหน้าอนุมัติ', color: 'text-yellow-600' },
  101: { label: 'หัวหน้าไม่อนุมัติ', color: 'text-red-500' },
  102: { label: 'หัวหน้าอนุมัติ / รอ ผอ.', color: 'text-blue-600' },
  200: { label: 'ผอ. อนุมัติ', color: 'text-green-600' },
  201: { label: 'ยกเลิกเช็ค', color: 'text-red-500' },
  202: { label: 'ออกเช็ค', color: 'text-green-700' },
}

// ใบที่ต้องดำเนินการในขั้นนี้ ๆ
const PENDING_STATUSES = new Set([50, 100, 102])

// map admin.type → permission (status ที่ user เห็น/ตรวจได้)
//   type=5 เจ้าหน้าที่การเงิน → 50
//   type=8 หัวหน้าการเงิน     → 100
//   type=2 ผอ.                → 102
//   อื่น ๆ (1 = super admin)  → 0 = เห็นรวม
function mapUserTypeToPermission(t: number): number {
  if (t === 5) return 50
  if (t === 8) return 100
  if (t === 2) return 102
  return 0
}

export default function ConfirmInvoicePage() {
  const { scId, syId, userType, adminId } = useAppContext()
  const permission = mapUserTypeToPermission(userType)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [approveTarget, setApproveTarget] = useState<ConfirmInvoice | null>(null)
  const [denyTarget, setDenyTarget] = useState<ConfirmInvoice | null>(null)
  const [denyNote, setDenyNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['confirm-invoice', scId, permission, syId],
    queryFn: () => apiGet<ConfirmInvoice[]>(`Invoice/loadConfirmInvoice/${scId}/${permission}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  // คำนวณ status ถัดไปจาก status ปัจจุบัน + การตัดสินใจ
  //  50  → อนุมัติ = 100, ตีกลับ = 51
  //  100 → อนุมัติ = 102, ไม่อนุมัติ = 101
  //  102 → อนุมัติ = 200, ไม่อนุมัติ = 101
  const nextStatus = (current: number, approve: boolean): number => {
    if (current === 50) return approve ? 100 : 51
    if (current === 100) return approve ? 102 : 101
    if (current === 102) return approve ? 200 : 101
    return current
  }

  const confirmMutation = useMutation({
    mutationFn: (payload: {
      rw_id: number
      status: number
      precheck_note?: string
    }) =>
      apiPost('Invoice/ConfirmInvoice', {
        ...payload,
        up_by: adminId,
      }),
    onSuccess: (res: any, vars) => {
      if (res.flag) {
        const approved = [100, 102, 200].includes(vars.status)
        toast.success(approved ? 'อนุมัติเรียบร้อยแล้ว' : 'บันทึกการไม่ผ่าน/ตีกลับแล้ว')
        qc.invalidateQueries({ queryKey: ['confirm-invoice'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการดำเนินการ')
      }
      setApproveTarget(null)
      setDenyTarget(null)
      setDenyNote('')
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ConfirmInvoice) =>
        PENDING_STATUSES.has(item.status) ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600"
              onClick={() => setApproveTarget(item)}
              title={item.status === 50 ? 'ตรวจผ่าน' : 'อนุมัติ'}
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500"
              onClick={() => { setDenyTarget(item); setDenyNote('') }}
              title={item.status === 50 ? 'ตีกลับ' : 'ไม่ผ่าน'}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
      headerClassName: 'w-20',
    },
    { header: 'เลขที่ใบสำคัญ', key: 'invoice_no' as keyof ConfirmInvoice },
    { header: 'รายการ', key: 'invoice_name' as keyof ConfirmInvoice },
    { header: 'โครงการ', key: 'project_name' as keyof ConfirmInvoice },
    { header: 'ร้านค้า', key: 'partner_name' as keyof ConfirmInvoice },
    {
      header: 'จำนวนเงิน',
      render: (item: ConfirmInvoice) => (
        <span>{Number(item.budgets).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
      ),
    },
    { header: 'ธนาคาร', key: 'bank_name' as keyof ConfirmInvoice },
    { header: 'เลขที่บัญชี', key: 'account_no' as keyof ConfirmInvoice },
    {
      header: 'สถานะ',
      render: (item: ConfirmInvoice) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'หมายเหตุตรวจ',
      render: (item: ConfirmInvoice) => (
        <span className="text-xs text-gray-600">{item.precheck_note ?? ''}</span>
      ),
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ConfirmInvoice) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  const approveVerb = approveTarget?.status === 50 ? 'ตรวจผ่าน' : 'อนุมัติ'
  const denyIsReject = denyTarget?.status === 50

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title={
          permission === 50
            ? 'ตรวจฎีกา (เจ้าหน้าที่การเงิน)'
            : 'ตรวจสอบใบสำคัญจ่าย'
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

      <ConfirmDialog
        open={!!approveTarget}
        onConfirm={() =>
          approveTarget &&
          confirmMutation.mutate({
            rw_id: approveTarget.rw_id,
            status: nextStatus(approveTarget.status, true),
          })
        }
        onCancel={() => setApproveTarget(null)}
        title={`ยืนยันการ${approveVerb}`}
        description={`${approveVerb}ใบสำคัญจ่าย "${approveTarget?.invoice_no} — ${approveTarget?.invoice_name}" หรือไม่?`}
        confirmLabel={approveVerb}
        variant="default"
      />

      {/* Dialog ตีกลับ/ไม่อนุมัติ — ถ้ามาจาก status 50 ขอเหตุผลด้วย */}
      <FormDialog
        open={!!denyTarget}
        onClose={() => { setDenyTarget(null); setDenyNote('') }}
        title={denyIsReject ? 'ตีกลับให้แก้ไข' : 'ยืนยันไม่อนุมัติ'}
        onSubmit={() => {
          if (!denyTarget) return
          if (denyIsReject && !denyNote.trim()) {
            toast.error('กรุณาระบุเหตุผล')
            return
          }
          confirmMutation.mutate({
            rw_id: denyTarget.rw_id,
            status: nextStatus(denyTarget.status, false),
            precheck_note: denyIsReject ? denyNote.trim() : undefined,
          })
        }}
        loading={confirmMutation.isPending}
        submitLabel={denyIsReject ? 'ตีกลับ' : 'ไม่อนุมัติ'}
      >
        <div className="space-y-3">
          <div className="text-sm">
            ใบสำคัญ: <strong>{denyTarget?.invoice_no}</strong> — {denyTarget?.invoice_name}
          </div>
          {denyIsReject && (
            <div>
              <Label>เหตุผลที่ตีกลับ *</Label>
              <Input
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
                placeholder="เช่น เอกสารแนบไม่ครบ / จำนวนเงินไม่ตรง"
              />
            </div>
          )}
        </div>
      </FormDialog>
    </div>
  )
}
