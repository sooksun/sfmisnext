'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


export default function IntraBankTransferPage() {
  const { scId } = useAppContext()

  const { data, isLoading } = useQuery({
    queryKey: ['intra-bank-transfer', scId],
    queryFn: () => apiGet<{ data: Record<string, unknown>[] }>(`IntraBankTransfer/load/${scId}`),
    enabled: scId > 0,
  })

  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="โอนเงินระหว่างบัญชี" subtitle="ทะเบียนโอนเงินภายในโรงเรียน" />
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'เลขที่', render: (r) => String(r.ibt_no ?? '—') },
          { header: 'วันที่', render: (r) => fmtDateTH(String(r.transfer_date ?? '')) },
          { header: 'จำนวนเงิน', render: (r) => fmtBaht(Number(r.amount ?? 0)) },
          { header: 'วิธี', render: (r) => String(r.transfer_method_name ?? '—') },
          { header: 'สถานะ', render: (r) => String(r.status_name ?? '—') },
        ]}
      />
    </div>
  )
}
