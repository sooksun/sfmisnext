'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface SupplieOrder {
  order_id: number
  sc_id: number
  project_name: string
  order_type: string
  order_name: string
  budgets: number
  admin_id: number
  order_status: number
  remark: string
  up_by: string
  up_date: string
}

const statusLabel: Record<number, { label: string; color: string }> = {
  1: { label: 'รออนุมัติ', color: 'text-yellow-600' },
  5: { label: 'ไม่อนุมัติ', color: 'text-red-500' },
  7: { label: 'อนุมัติแล้ว', color: 'text-green-600' },
}

export default function WithdrawConfirmPage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [approveTarget, setApproveTarget] = useState<SupplieOrder | null>(null)
  const [denyTarget, setDenyTarget] = useState<SupplieOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['supplie-order-confirm', scId, apiYear],
    queryFn: () => apiGet<SupplieOrder[]>(`Supplie/loadSupplieOrder/${scId}/${apiYear}`),
    enabled: scId > 0 && apiYear !== '',
  })

  const updateMutation = useMutation({
    mutationFn: ({ item, status, remark }: { item: SupplieOrder; status: number; remark?: string }) =>
      apiPost('Supplie/updateSupplieOrder', {
        order_id: item.order_id,
        order_status: status,
        remark: remark ?? '',
      }),
    onSuccess: (res: any, vars) => {
      if (res.flag) {
        toast.success(vars.status === 7 ? 'อนุมัติเรียบร้อยแล้ว' : 'ปฏิเสธเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['supplie-order-confirm'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการดำเนินการ')
      }
      setApproveTarget(null)
      setDenyTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: SupplieOrder) =>
        item.order_status === 1 ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600"
              onClick={() => setApproveTarget(item)}
              title="อนุมัติ"
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500"
              onClick={() => setDenyTarget(item)}
              title="ปฏิเสธ"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
      headerClassName: 'w-20',
    },
    { header: 'โครงการ', key: 'project_name' as keyof SupplieOrder },
    { header: 'รายการ', key: 'order_name' as keyof SupplieOrder },
    { header: 'ประเภท', key: 'order_type' as keyof SupplieOrder },
    {
      header: 'งบประมาณ',
      render: (item: SupplieOrder) => (
        <span>{Number(item.budgets).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: 'สถานะ',
      render: (item: SupplieOrder) => {
        const s = statusLabel[item.order_status] ?? { label: String(item.order_status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    { header: 'หมายเหตุ', key: 'remark' as keyof SupplieOrder },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: SupplieOrder) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <ProcessFlow flow="procure" />
      <PageHeader title="อนุมัติขอซื้อ/ขอจ้าง" />
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
        onConfirm={() => approveTarget && updateMutation.mutate({ item: approveTarget, status: 7 })}
        onCancel={() => setApproveTarget(null)}
        title="ยืนยันการอนุมัติ"
        description={`อนุมัติรายการ "${approveTarget?.order_name}" หรือไม่?`}
        confirmLabel="อนุมัติ"
        variant="default"
      />

      <ConfirmDialog
        open={!!denyTarget}
        onConfirm={() => denyTarget && updateMutation.mutate({ item: denyTarget, status: 5 })}
        onCancel={() => setDenyTarget(null)}
        title="ยืนยันการปฏิเสธ"
        description={`ปฏิเสธรายการ "${denyTarget?.order_name}" หรือไม่?`}
        confirmLabel="ปฏิเสธ"
        variant="destructive"
      />
    </div>
  )
}
