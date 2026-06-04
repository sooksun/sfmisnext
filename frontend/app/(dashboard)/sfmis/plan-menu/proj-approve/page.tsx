'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Ban, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

// ====== Status Machine =====================================================
// 0=ทบทวนใหม่ | 1=ขอ | 2=แผน | 3=การเงิน | 4=พัสดุ | 5=ผอ.
// 6=ตั้งกรรมการ | 7=จัดซื้อ | 8=สำเร็จ | 9=ยกเลิก
// ===========================================================================

interface ParcelOrder {
  order_id: number
  order_status: number
  details: string
  budgets: number
  remark: string
  remark_cf_plan: string
  remark_cf_business: string
  remark_cf_suppile: string
  remark_cf_ceo: string
  cancel_reason?: string
  cancel_date?: string | null
  is_urgent?: number
  urgent_clause?: string
  urgent_reason?: string
  sc_id: number
  acad_year: number
}

type ApprovalStage = 'plan' | 'business' | 'supplie' | 'ceo'

interface ActionTarget {
  item: ParcelOrder
  stage: ApprovalStage
  isReject: boolean
}

const STAGE_META: Record<ApprovalStage, {
  label: string
  approveStatus: number
  endpoint: string
  remarkField: keyof ParcelOrder
}> = {
  plan:     { label: 'หัวหน้าฝ่ายแผนงาน',  approveStatus: 2, endpoint: 'Project_approve/approveParcelByPlan',      remarkField: 'remark_cf_plan'     },
  business: { label: 'หัวหน้าฝ่ายการเงิน',  approveStatus: 3, endpoint: 'Project_approve/approveParcelByBusiness',  remarkField: 'remark_cf_business' },
  supplie:  { label: 'หัวหน้าฝ่ายพัสดุ',    approveStatus: 4, endpoint: 'Project_approve/approveParcelBySupplie',   remarkField: 'remark_cf_suppile'  },
  ceo:      { label: 'ผู้อำนวยการ',          approveStatus: 5, endpoint: 'Project_approve/approveParcelByCeo',       remarkField: 'remark_cf_ceo'      },
}

const STATUS_LABEL: Record<number, { text: string; color: string }> = {
  0: { text: 'ทบทวนใหม่', color: 'text-orange-500 bg-orange-50' },
  1: { text: 'รอการอนุมัติ', color: 'text-blue-600 bg-blue-50' },
  2: { text: 'ผ่านแผนงาน', color: 'text-indigo-600 bg-indigo-50' },
  3: { text: 'ผ่านการเงิน', color: 'text-purple-600 bg-purple-50' },
  4: { text: 'ผ่านพัสดุ', color: 'text-teal-600 bg-teal-50' },
  5: { text: 'ผ่าน ผอ.', color: 'text-green-600 bg-green-50' },
  6: { text: 'ตั้งกรรมการ', color: 'text-green-700 bg-green-100' },
  7: { text: 'จัดซื้อ/จัดจ้าง', color: 'text-green-800 bg-green-100' },
  8: { text: 'สำเร็จ', color: 'text-gray-600 bg-gray-100' },
  9: { text: 'ยกเลิก', color: 'text-red-700 bg-red-100' },
}

const remarkSchema = z.object({
  remark_cf: z.string().min(1, 'กรุณากรอกเหตุผล'),
})
type RemarkForm = z.infer<typeof remarkSchema>

export default function ProjApprovePage() {
  const { scId, adminId, budgetYear } = useAppContext()
  // budgetYear = school_year.budget_year (ค.ศ. เช่น 2026)
  // parcel_order.acad_year เก็บเป็น ค.ศ. เช่นกัน → ส่งตรงได้เลย
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ParcelOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [urgentTarget, setUrgentTarget] = useState<ParcelOrder | null>(null)
  const [urgentClause, setUrgentClause] = useState('56(2)(ง)')
  const [urgentReason, setUrgentReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['proj-approve', scId, budgetYear, page, pageSize],
    queryFn: () =>
      apiGet<{ data: ParcelOrder[]; count: number }>(
        `Project_approve/loadProjectApprove/${scId}/${budgetYear}/${page}/${pageSize}`
      ),
    enabled: scId > 0 && budgetYear > 0,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RemarkForm>({
    resolver: zodResolver(remarkSchema),
  })

  // Approve (ไม่ต้องกรอก remark)
  const approveMutation = useMutation({
    mutationFn: ({ item, stage }: { item: ParcelOrder; stage: ApprovalStage }) => {
      const meta = STAGE_META[stage]
      return apiPost(meta.endpoint, {
        order_id: item.order_id,
        order_status: meta.approveStatus,
        remark: `(${meta.label}) : อนุมัติ`,
        remark_cf: '',
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('อนุมัติเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['proj-approve'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการอนุมัติ')
      }
      setActionTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // Reject (ต้องกรอก remark)
  const rejectMutation = useMutation({
    mutationFn: ({ item, stage, remark_cf }: { item: ParcelOrder; stage: ApprovalStage; remark_cf: string }) => {
      const meta = STAGE_META[stage]
      return apiPost(meta.endpoint, {
        order_id: item.order_id,
        order_status: 0,
        remark: `(${meta.label}) : ${remark_cf}`,
        remark_cf,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ส่งกลับทบทวนเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['proj-approve'] })
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
      setActionTarget(null)
      reset()
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const cancelMutation = useMutation({
    mutationFn: (vars: { order_id: number; cancel_reason: string }) =>
      apiPost('Project_approve/cancelParcelOrder', { ...vars, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['proj-approve'] })
        setCancelTarget(null)
        setCancelReason('')
      } else {
        toast.error(res.ms || 'มีปัญหาในการยกเลิก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const urgentMutation = useMutation({
    mutationFn: (vars: {
      order_id: number
      is_urgent: number
      urgent_clause?: string
      urgent_reason?: string
    }) => apiPost('Project_approve/setParcelOrderUrgent', { ...vars, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['proj-approve'] })
        setUrgentTarget(null)
        setUrgentReason('')
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  function openApprove(item: ParcelOrder, stage: ApprovalStage) {
    setActionTarget({ item, stage, isReject: false })
  }

  function openReject(item: ParcelOrder, stage: ApprovalStage) {
    reset({ remark_cf: '' })
    setActionTarget({ item, stage, isReject: true })
  }

  function handleActionConfirm(form?: RemarkForm) {
    if (!actionTarget) return
    const { item, stage, isReject } = actionTarget
    if (isReject && form) {
      rejectMutation.mutate({ item, stage, remark_cf: form.remark_cf })
    } else {
      approveMutation.mutate({ item, stage })
    }
  }

  function StageButton({ item, stage }: { item: ParcelOrder; stage: ApprovalStage }) {
    const meta = STAGE_META[stage]
    const prevStatus = meta.approveStatus - 1
    const isActive = item.order_status === prevStatus

    if (!isActive) return null
    return (
      <div className="flex gap-1">
        <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
          onClick={() => openApprove(item, stage)}>
          <CheckCircle className="h-3 w-3 mr-1" /> อนุมัติ
        </Button>
        <Button size="sm" variant="destructive" className="h-6 px-2 text-xs"
          onClick={() => openReject(item, stage)}>
          <XCircle className="h-3 w-3 mr-1" /> ส่งคืน
        </Button>
      </div>
    )
  }

  const fmt = (n: number) =>
    Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ParcelOrder) => {
        const cancellable = item.order_status !== 8 && item.order_status !== 9
        return (
          <div className="flex gap-1">
            {cancellable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs text-red-600"
                  onClick={() => { setCancelTarget(item); setCancelReason('') }}
                  title="ยกเลิกคำสั่งซื้อ"
                >
                  <Ban className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-6 px-2 text-xs ${item.is_urgent ? 'text-amber-600 border-amber-300 bg-amber-50' : ''}`}
                  onClick={() => {
                    setUrgentTarget(item)
                    setUrgentClause(item.urgent_clause || '56(2)(ง)')
                    setUrgentReason(item.urgent_reason || '')
                  }}
                  title={item.is_urgent ? 'แก้ไข/ยกเลิกสถานะเร่งด่วน' : 'ทำเครื่องหมายเร่งด่วน ม.56(2)(ง)'}
                >
                  <Zap className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )
      },
      headerClassName: 'w-20',
    },
    { header: '#', render: (item: ParcelOrder) => <span className="text-gray-500 text-xs">{item.order_id}</span> },
    {
      header: 'โครงการ/รายการ',
      render: (item: ParcelOrder) => (
        <div>
          <div className="flex items-center gap-1">
            <p className="font-medium">{item.details || `คำสั่งซื้อ #${item.order_id}`}</p>
            {!!item.is_urgent && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
                title={item.urgent_reason || ''}
              >
                เร่งด่วน ม.{item.urgent_clause || '56(2)(ง)'}
              </span>
            )}
          </div>
          {item.remark && item.order_status === 0 && (
            <p className="text-xs text-orange-600 mt-0.5">⚠ {item.remark}</p>
          )}
          {item.order_status === 9 && item.cancel_reason && (
            <p className="text-xs text-red-600 mt-0.5">ยกเลิก: {item.cancel_reason}</p>
          )}
        </div>
      ),
    },
    {
      header: 'วงเงิน (บาท)',
      render: (item: ParcelOrder) => (
        <span className="font-mono">{fmt(item.budgets)}</span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: ParcelOrder) => {
        const s = STATUS_LABEL[item.order_status] ?? { text: `${item.order_status}`, color: 'text-gray-500 bg-gray-50' }
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
            {s.text}
          </span>
        )
      },
    },
    {
      header: 'หัวหน้าแผนงาน',
      render: (item: ParcelOrder) => (
        <>
          {item.order_status >= 2 && item.order_status !== 0 && item.order_status !== 9
            ? <span className="text-xs text-green-600 font-medium">✓ อนุมัติ</span>
            : <StageButton item={item} stage="plan" />}
          {item.remark_cf_plan && <p className="text-xs text-gray-500 mt-0.5">{item.remark_cf_plan}</p>}
        </>
      ),
    },
    {
      header: 'หัวหน้าการเงิน',
      render: (item: ParcelOrder) => (
        <>
          {item.order_status >= 3 && item.order_status !== 0 && item.order_status !== 9
            ? <span className="text-xs text-green-600 font-medium">✓ อนุมัติ</span>
            : <StageButton item={item} stage="business" />}
          {item.remark_cf_business && <p className="text-xs text-gray-500 mt-0.5">{item.remark_cf_business}</p>}
        </>
      ),
    },
    {
      header: 'หัวหน้าพัสดุ',
      render: (item: ParcelOrder) => (
        <>
          {item.order_status >= 4 && item.order_status !== 0 && item.order_status !== 9
            ? <span className="text-xs text-green-600 font-medium">✓ อนุมัติ</span>
            : <StageButton item={item} stage="supplie" />}
          {item.remark_cf_suppile && <p className="text-xs text-gray-500 mt-0.5">{item.remark_cf_suppile}</p>}
        </>
      ),
    },
    {
      header: 'ผู้อำนวยการ',
      render: (item: ParcelOrder) => (
        <>
          {item.order_status >= 5 && item.order_status !== 0 && item.order_status !== 9
            ? <span className="text-xs text-green-600 font-medium">✓ อนุมัติ</span>
            : <StageButton item={item} stage="ceo" />}
          {item.remark_cf_ceo && <p className="text-xs text-gray-500 mt-0.5">{item.remark_cf_ceo}</p>}
        </>
      ),
    },
  ]

  const isLoading2 = approveMutation.isPending || rejectMutation.isPending

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="อนุมัติโครงการจัดซื้อจัดจ้าง" />
      <ProcessFlow flow="plan" />
      <div className="p-4">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.count ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>

      {/* Approve Dialog (ยืนยันเฉย ๆ ไม่ต้องกรอก remark) */}
      {actionTarget && !actionTarget.isReject && (
        <FormDialog
          open={true}
          onClose={() => setActionTarget(null)}
          title={`ยืนยันอนุมัติ — ${STAGE_META[actionTarget.stage].label}`}
          onSubmit={() => handleActionConfirm()}
          loading={isLoading2}
          submitLabel="อนุมัติ"
        >
          <p className="text-sm">
            อนุมัติรายการ <strong>{actionTarget.item.details || `#${actionTarget.item.order_id}`}</strong>
            {' '}วงเงิน <strong>{fmt(actionTarget.item.budgets)} บาท</strong> หรือไม่?
          </p>
        </FormDialog>
      )}

      {/* Cancel Order Dialog */}
      {cancelTarget && (
        <FormDialog
          open={true}
          onClose={() => { setCancelTarget(null); setCancelReason('') }}
          title="ยกเลิกคำสั่งซื้อ"
          onSubmit={() => {
            if (!cancelReason.trim()) { toast.error('กรุณาระบุเหตุผล'); return }
            cancelMutation.mutate({
              order_id: cancelTarget.order_id,
              cancel_reason: cancelReason.trim(),
            })
          }}
          loading={cancelMutation.isPending}
          submitLabel="ยืนยันยกเลิก"
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              ยกเลิกคำสั่งซื้อ <strong>{cancelTarget.details || `#${cancelTarget.order_id}`}</strong>
              {' '}วงเงิน <strong>{fmt(cancelTarget.budgets)} บาท</strong>?
            </p>
            <div>
              <Label>เหตุผลการยกเลิก <span className="text-red-500">*</span></Label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น ร้านค้าส่งของไม่ได้ / เปลี่ยนสเปก / ยกเลิกโครงการ"
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </FormDialog>
      )}

      {/* Urgent Flag Dialog */}
      {urgentTarget && (
        <FormDialog
          open={true}
          onClose={() => { setUrgentTarget(null); setUrgentReason('') }}
          title={urgentTarget.is_urgent ? 'แก้ไขสถานะเร่งด่วน' : 'ทำเครื่องหมายจัดซื้อเร่งด่วน'}
          onSubmit={() => {
            if (!urgentReason.trim()) { toast.error('กรุณาระบุเหตุผลเร่งด่วน'); return }
            urgentMutation.mutate({
              order_id: urgentTarget.order_id,
              is_urgent: 1,
              urgent_clause: urgentClause.trim() || '56(2)(ง)',
              urgent_reason: urgentReason.trim(),
            })
          }}
          loading={urgentMutation.isPending}
          submitLabel="บันทึกเร่งด่วน"
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              รายการ: <strong>{urgentTarget.details || `#${urgentTarget.order_id}`}</strong>
            </p>
            {urgentTarget.is_urgent ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  onClick={() =>
                    urgentMutation.mutate({
                      order_id: urgentTarget.order_id,
                      is_urgent: 0,
                    })
                  }
                  disabled={urgentMutation.isPending}
                >
                  ยกเลิกสถานะเร่งด่วน
                </Button>
              </div>
            ) : null}
            <div>
              <Label>มาตรา/อนุมาตรา</Label>
              <Input
                value={urgentClause}
                onChange={(e) => setUrgentClause(e.target.value)}
                placeholder="เช่น 56(2)(ง)"
              />
            </div>
            <div>
              <Label>เหตุผลความจำเป็นเร่งด่วน <span className="text-red-500">*</span></Label>
              <textarea
                value={urgentReason}
                onChange={(e) => setUrgentReason(e.target.value)}
                placeholder="เช่น อุปกรณ์เสียหายเร่งด่วน / กำหนดใช้งานไม่ทันการประกวดราคาปกติ"
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </FormDialog>
      )}

      {/* Reject Dialog (ต้องกรอกเหตุผล) */}
      {actionTarget && actionTarget.isReject && (
        <FormDialog
          open={true}
          onClose={() => { setActionTarget(null); reset() }}
          title={`ส่งกลับทบทวน — ${STAGE_META[actionTarget.stage].label}`}
          onSubmit={() => handleSubmit((form) => handleActionConfirm(form))()}
          loading={isLoading2}
          submitLabel="ส่งกลับทบทวน"
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              รายการ: <strong>{actionTarget.item.details || `#${actionTarget.item.order_id}`}</strong>
            </p>
            <div>
              <Label>เหตุผลที่ส่งกลับ <span className="text-red-500">*</span></Label>
              <textarea
                {...register('remark_cf')}
                placeholder="กรุณาระบุเหตุผล..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.remark_cf && (
                <p className="text-red-500 text-xs mt-1">{errors.remark_cf.message}</p>
              )}
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  )
}
