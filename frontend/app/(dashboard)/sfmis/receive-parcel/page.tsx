'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Eye } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime, fmtDateTH } from '@/lib/utils'

interface ReceiveParcel {
  receive_id: number
  order_id: number
  project_name: string
  receive_date: string
  note: string
  status: number
  total_items: number
  up_by: string
  up_date: string
}

const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'รอตรวจรับ', color: 'text-yellow-600' },
  1: { label: 'ตรวจรับแล้ว', color: 'text-green-600' },
  2: { label: 'ยกเลิก', color: 'text-red-500' },
}

export default function ReceiveParcelPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [deleteTarget, setDeleteTarget] = useState<ReceiveParcel | null>(null)
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
    queryKey: ['receive-parcel', scId, syId],
    queryFn: () => apiGet<ReceiveParcel[]>(`Supplie/loadReceive/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (item: ReceiveParcel) =>
      apiPost('Supplie/removeReceiveParcel', { receive_id: item.receive_id }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ลบเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receive-parcel'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการลบ')
      }
      setDeleteTarget(null)
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ReceiveParcel) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteTarget(item)}
            title="ลบรายการ"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      headerClassName: 'w-16',
    },
    { header: 'โครงการ', key: 'project_name' as keyof ReceiveParcel },
    { header: 'วันที่รับ', render: (item: ReceiveParcel) => <span>{fmtDateTH(item.receive_date)}</span> },
    { header: 'จำนวนรายการ', key: 'total_items' as keyof ReceiveParcel },
    { header: 'หมายเหตุ', key: 'note' as keyof ReceiveParcel },
    {
      header: 'สถานะ',
      render: (item: ReceiveParcel) => {
        const s = statusLabel[item.status] ?? { label: String(item.status), color: '' }
        return <span className={s.color}>{s.label}</span>
      },
    },
    {
      header: 'แก้ไขล่าสุด',
      render: (item: ReceiveParcel) => (
        <div>
          <div>{item.up_by}</div>
          <small className="text-gray-500">{getThaiDateTime(item.up_date)}</small>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รับพัสดุ (ตรวจรับพัสดุ)" />
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
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบ"
        description={`ต้องการลบรายการรับพัสดุของโครงการ "${deleteTarget?.project_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
