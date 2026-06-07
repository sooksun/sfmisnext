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
  project_name?: string
  order_type?: string
  order_name?: string
  details?: string
  budgets: number
  admin_id: number
  order_status: number
  remark: string
  up_by: string
  up_date: string
}

// สถานะตาม parcel_order: 5=ผ่าน ผอ., 6=ตั้งกรรมการ, 7=จัดซื้อ, 9=ยกเลิก
const statusLabel: Record<number, { label: string; color: string }> = {
  5: { label: 'รอเริ่มจัดซื้อ', color: 'text-yellow-600' },
  6: { label: 'ตั้งกรรมการ', color: 'text-indigo-600' },
  7: { label: 'จัดซื้อแล้ว', color: 'text-green-600' },
  9: { label: 'ยกเลิก', color: 'text-red-500' },
}

export default function WithdrawConfirmPage() {
  const { scId, budgetYear } = useAppContext()
  // parcel_order.acad_year เก็บเหมือนกับที่หน้า 1.3 ส่ง (BE เช่น 2569) — ส่งตรงไม่ต้องแปลง
  const yearKey = String(budgetYear || '')
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [approveTarget, setApproveTarget] = useState<SupplieOrder | null>(null)
  const [denyTarget, setDenyTarget] = useState<SupplieOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['supplie-order-confirm', scId, yearKey],
    queryFn: () => apiGet<SupplieOrder[]>(`Supplie/loadSupplieOrder/${scId}/${yearKey}`),
    enabled: scId > 0 && budgetYear > 0,
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
        item.order_status === 5 || item.order_status === 6 ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600"
              onClick={() => setApproveTarget(item)}
              title="เริ่มจัดซื้อ"
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500"
              onClick={() => setDenyTarget(item)}
              title="ยกเลิก"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
      headerClassName: 'w-20',
    },
    { header: 'โครงการ', render: (it: SupplieOrder) => it.project_name ?? it.details ?? '-' },
    { header: 'รายการ', render: (it: SupplieOrder) => it.order_name ?? it.details ?? '-' },
    { header: 'ประเภท', render: (it: SupplieOrder) => it.order_type ?? '-' },
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
        title="ยืนยันการเริ่มจัดซื้อ"
        description={`เริ่มจัดซื้อรายการ "${approveTarget?.order_name ?? approveTarget?.details ?? ''}" หรือไม่?`}
        confirmLabel="เริ่มจัดซื้อ"
        variant="default"
      />

      <ConfirmDialog
        open={!!denyTarget}
        onConfirm={() => denyTarget && updateMutation.mutate({ item: denyTarget, status: 9 })}
        onCancel={() => setDenyTarget(null)}
        title="ยืนยันการยกเลิก"
        description={`ยกเลิกรายการ "${denyTarget?.order_name ?? denyTarget?.details ?? ''}" หรือไม่?`}
        confirmLabel="ยกเลิก"
        variant="destructive"
      />
    </div>
  )
}
