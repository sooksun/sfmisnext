'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost } from '@/lib/api'
import { getThaiDateTime } from '@/lib/utils'

interface ReceiveParcel {
  receive_id: number
  order_id: number
  admin_id: number
  project_name: string
  receive_date: string
  note: string
  receive_status: number
  total_items: number
  up_by: string
  up_date: string
}

interface ParcelDetailItem {
  rp_id: number
  supp_id: number
  sp_name: string
  un_name: string
  rp_total: number
  balance: number
  remain: number
}

interface ParcelDetailData {
  parcel_detail: ParcelDetailItem[]
  balance: { supp_id: number; trans_balance: number }[]
}

const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'รอตรวจรับ', color: 'text-yellow-600' },
  1: { label: 'ตรวจรับแล้ว', color: 'text-green-600' },
  2: { label: 'ยกเลิก', color: 'text-red-500' },
}

export default function ReceiveParcelConfirmPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [confirmTarget, setConfirmTarget] = useState<ReceiveParcel | null>(null)
  const [detailData, setDetailData] = useState<ParcelDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
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
    queryKey: ['receive-parcel-confirm', scId, syId],
    queryFn: () => apiGet<ReceiveParcel[]>(`supplie/loadReceive/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  async function openConfirm(item: ReceiveParcel) {
    setConfirmTarget(item)
    setLoadingDetail(true)
    try {
      const res = await apiGet<ParcelDetailData>(
        `supplie/loadParcelDetailWithdraw/${item.order_id}/${item.receive_id}/${scId}`
      )
      const enriched = {
        ...res,
        parcel_detail: res.parcel_detail.map((el) => {
          const bal = res.balance.find((b) => b.supp_id === el.supp_id)
          return {
            ...el,
            balance: bal?.trans_balance ?? 0,
            remain: (bal?.trans_balance ?? 0) - el.rp_total,
          }
        }),
      }
      setDetailData(enriched)
    } catch {
      toast.error('ไม่สามารถโหลดรายละเอียดได้')
    } finally {
      setLoadingDetail(false)
    }
  }

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!confirmTarget || !detailData) throw new Error('No data')
      const detail = detailData.parcel_detail.map((el) => ({
        supp_id: el.supp_id,
        trans_in: 0,
        trans_out: el.rp_total,
      }))
      return apiPost('supplie/confiirmWithDrawParcel', {
        order: {
          receive_id: confirmTarget.receive_id,
          receive_status: 1,
        },
        detail,
      })
    },
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('ยืนยันการตรวจรับเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['receive-parcel-confirm'] })
        setConfirmTarget(null)
        setDetailData(null)
      } else {
        toast.error(res.ms || 'มีปัญหาในการยืนยัน')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const rows = Array.isArray(data) ? data : []

  const columns = [
    {
      header: 'จัดการ',
      render: (item: ReceiveParcel) =>
        item.receive_status === 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openConfirm(item)}
            title="ยืนยันตรวจรับ"
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        ) : null,
      headerClassName: 'w-16',
    },
    { header: 'โครงการ', key: 'project_name' as keyof ReceiveParcel },
    { header: 'วันที่รับ', key: 'receive_date' as keyof ReceiveParcel },
    { header: 'จำนวนรายการ', key: 'total_items' as keyof ReceiveParcel },
    { header: 'หมายเหตุ', key: 'note' as keyof ReceiveParcel },
    {
      header: 'สถานะ',
      render: (item: ReceiveParcel) => {
        const s = statusLabel[item.receive_status] ?? { label: String(item.receive_status), color: '' }
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

  const detailColumns = [
    { header: 'รายการพัสดุ', key: 'sp_name' as keyof ParcelDetailItem },
    { header: 'หน่วย', key: 'un_name' as keyof ParcelDetailItem },
    { header: 'จำนวนที่รับ', key: 'rp_total' as keyof ParcelDetailItem },
    {
      header: 'คงเหลือในคลัง',
      render: (item: ParcelDetailItem) => <span>{item.balance}</span>,
    },
    {
      header: 'คงเหลือหลังรับ',
      render: (item: ParcelDetailItem) => (
        <span className={item.remain < 0 ? 'text-red-500' : ''}>{item.remain}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ยืนยันการรับพัสดุ" />
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

      <FormDialog
        open={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setDetailData(null) }}
        title={`ยืนยันการตรวจรับพัสดุ — ${confirmTarget?.project_name ?? ''}`}
        onSubmit={() => confirmMutation.mutate()}
        loading={confirmMutation.isPending || loadingDetail}
        submitLabel="ยืนยันตรวจรับ"
      >
        <div className="space-y-3">
          {loadingDetail ? (
            <p className="text-gray-500 text-sm">กำลังโหลดรายละเอียด...</p>
          ) : detailData ? (
            <>
              <Label>รายการพัสดุที่รับ</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-1 text-left">รายการ</th>
                      <th className="border px-2 py-1 text-center">หน่วย</th>
                      <th className="border px-2 py-1 text-right">จำนวนรับ</th>
                      <th className="border px-2 py-1 text-right">คงเหลือในคลัง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.parcel_detail.map((el) => (
                      <tr key={el.supp_id}>
                        <td className="border px-2 py-1">{el.sp_name}</td>
                        <td className="border px-2 py-1 text-center">{el.un_name}</td>
                        <td className="border px-2 py-1 text-right">{el.rp_total}</td>
                        <td className="border px-2 py-1 text-right">{el.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">การยืนยันจะอัปเดตสต็อกพัสดุในคลัง</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">ไม่มีรายละเอียด</p>
          )}
        </div>
      </FormDialog>
    </div>
  )
}
