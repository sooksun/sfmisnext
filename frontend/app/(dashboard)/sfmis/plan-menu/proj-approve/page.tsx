'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import { apiGet, apiPost } from '@/lib/api'

// ====== Status Machine =====================================================
// 0=ทบทวนใหม่ | 1=ขอ | 2=แผน | 3=การเงิน | 4=พัสดุ | 5=ผอ.
// 6=ตั้งกรรมการ | 7=จัดซื้อ | 8=สำเร็จ
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
}

const remarkSchema = z.object({
  remark_cf: z.string().min(1, 'กรุณากรอกเหตุผล'),
})
type RemarkForm = z.infer<typeof remarkSchema>

export default function ProjApprovePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['proj-approve', scId, syId, page, pageSize],
    queryFn: () =>
      apiGet<{ data: ParcelOrder[]; count: number }>(
        `Project_approve/loadProjectApprove/${scId}/${syId}/${page}/${pageSize}`
      ),
    enabled: scId > 0 && syId > 0,
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
    { header: '#', render: (item: ParcelOrder) => <span className="text-gray-500 text-xs">{item.order_id}</span> },
    {
      header: 'โครงการ/รายการ',
      render: (item: ParcelOrder) => (
        <div>
          <p className="font-medium">{item.details || `คำสั่งซื้อ #${item.order_id}`}</p>
          {item.remark && item.order_status === 0 && (
            <p className="text-xs text-orange-600 mt-0.5">⚠ {item.remark}</p>
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
          {item.order_status >= 2 && item.order_status !== 0
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
          {item.order_status >= 3 && item.order_status !== 0
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
          {item.order_status >= 4 && item.order_status !== 0
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
          {item.order_status >= 5 && item.order_status !== 0
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
