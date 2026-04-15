'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'

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
  up_by: string
  up_date: string
}

// สถานะตาม request_withdraw.status (state machine 100 series)
const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'กำลังทำ', color: 'text-gray-500' },
  100: { label: 'รอหัวหน้าตรวจสอบ', color: 'text-yellow-600' },
  101: { label: 'หัวหน้าไม่อนุมัติ', color: 'text-red-500' },
  102: { label: 'หัวหน้าอนุมัติ / รอ ผอ.', color: 'text-blue-600' },
  200: { label: 'ผอ. อนุมัติ', color: 'text-green-600' },
  201: { label: 'ยกเลิกเช็ค', color: 'text-red-500' },
  202: { label: 'ออกเช็ค', color: 'text-green-700' },
}

// ใบที่ยังทำงานต่อได้ = สถานะรอการอนุมัติในขั้นปัจจุบัน (100 = รอหัวหน้า, 102 = รอ ผอ.)
const PENDING_STATUSES = new Set([100, 102])

export default function ConfirmInvoicePage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [approveTarget, setApproveTarget] = useState<ConfirmInvoice | null>(null)
  const [denyTarget, setDenyTarget] = useState<ConfirmInvoice | null>(null)
  const [scId, setScId] = useState(0)
  const [syId, setSyId] = useState(0)
  const [permission, setPermission] = useState(0)

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('data') || '{}')
      if (userData?.sc_id) setScId(Number(userData.sc_id))
      if (userData?.permission) setPermission(Number(userData.permission))
    } catch {}
    try {
      const years = JSON.parse(localStorage.getItem('years') || '{}')
      if (years?.sy_date?.sy_id) setSyId(Number(years.sy_date.sy_id))
    } catch {}
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['confirm-invoice', scId, permission, syId],
    queryFn: () => apiGet<ConfirmInvoice[]>(`Invoice/loadConfirmInvoice/${scId}/${permission}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  // คำนวณ status ใหม่จาก status ปัจจุบัน + การตัดสินใจ (อนุมัติ/ปฏิเสธ)
  // 100 -> อนุมัติ = 102, ปฏิเสธ = 101
  // 102 -> อนุมัติ = 200, ปฏิเสธ = 101
  const nextStatus = (current: number, approve: boolean): number => {
    if (!approve) return 101
    if (current === 100) return 102
    if (current === 102) return 200
    return current
  }

  const confirmMutation = useMutation({
    mutationFn: ({ rw_id, status }: { rw_id: number; status: number }) =>
      apiPost('Invoice/ConfirmInvoice', { rw_id, status }),
    onSuccess: (res: any, vars) => {
      if (res.flag) {
        const approved = vars.status === 102 || vars.status === 200
        toast.success(approved ? 'อนุมัติเรียบร้อยแล้ว' : 'ปฏิเสธเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['confirm-invoice'] })
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
      render: (item: ConfirmInvoice) =>
        PENDING_STATUSES.has(item.status) ? (
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
              title="ไม่ผ่าน"
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
      header: 'แก้ไขล่าสุด',
      render: (item: ConfirmInvoice) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ตรวจสอบใบสำคัญจ่าย" />
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
        title="ยืนยันการอนุมัติ"
        description={`อนุมัติใบสำคัญจ่าย "${approveTarget?.invoice_no} — ${approveTarget?.invoice_name}" หรือไม่?`}
        confirmLabel="อนุมัติ"
        variant="default"
      />

      <ConfirmDialog
        open={!!denyTarget}
        onConfirm={() =>
          denyTarget &&
          confirmMutation.mutate({
            rw_id: denyTarget.rw_id,
            status: nextStatus(denyTarget.status, false),
          })
        }
        onCancel={() => setDenyTarget(null)}
        title="ยืนยันการปฏิเสธ"
        description={`ปฏิเสธใบสำคัญจ่าย "${denyTarget?.invoice_no} — ${denyTarget?.invoice_name}" หรือไม่?`}
        confirmLabel="ปฏิเสธ"
        variant="destructive"
      />
    </div>
  )
}
