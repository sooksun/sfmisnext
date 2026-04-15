'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'

interface SupplieOrder {
  so_id: number
  order_id: number
  project_name: string
  sp_name: string
  un_name: string
  amount: number
  requester_name: string
  request_date: string
  status: number
  up_by: string
  up_date: string
}

const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'รออนุมัติ', color: 'text-yellow-600' },
  1: { label: 'อนุมัติแล้ว', color: 'text-green-600' },
  2: { label: 'ปฏิเสธ', color: 'text-red-500' },
}

export default function WithdrawPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [approveTarget, setApproveTarget] = useState<SupplieOrder | null>(null)
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
    queryKey: ['supplie-order', scId, syId],
    queryFn: () => apiGet<SupplieOrder[]>(`Supplie/loadGetSupplieOrder/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const approveMutation = useMutation({
    mutationFn: (item: SupplieOrder) =>
      apiPost('Supplie/updateSupplieOrder', {
        so_id: item.so_id,
        status: 1,
        sc_id: scId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('อนุมัติเบิกพัสดุเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['supplie-order'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการอนุมัติ')
      }
      setApproveTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: SupplieOrder) =>
        item.status === 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setApproveTarget(item)}
            title="อนุมัติเบิก"
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        ) : null,
      headerClassName: 'w-16',
    },
    { header: 'โครงการ', key: 'project_name' as keyof SupplieOrder },
    { header: 'ชื่อวัสดุ', key: 'sp_name' as keyof SupplieOrder },
    { header: 'หน่วย', key: 'un_name' as keyof SupplieOrder },
    { header: 'จำนวน', key: 'amount' as keyof SupplieOrder },
    { header: 'ผู้เบิก', key: 'requester_name' as keyof SupplieOrder },
    { header: 'วันที่ขอ', key: 'request_date' as keyof SupplieOrder },
    {
      header: 'สถานะ',
      render: (item: SupplieOrder) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
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
      <PageHeader title="เบิกพัสดุ" />
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
        onConfirm={() => approveTarget && approveMutation.mutate(approveTarget)}
        onCancel={() => setApproveTarget(null)}
        title="ยืนยันการอนุมัติเบิก"
        description={`อนุมัติเบิก "${approveTarget?.sp_name}" จำนวน ${approveTarget?.amount} ${approveTarget?.un_name} หรือไม่?`}
        confirmLabel="อนุมัติ"
        variant="default"
      />
    </div>
  )
}
