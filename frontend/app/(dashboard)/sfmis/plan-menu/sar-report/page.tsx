'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


export default function SarReportPage() {
  const { scId } = useAppContext()

  const { data, isLoading } = useQuery({
    queryKey: ['sar-report', scId],
    queryFn: () => apiGet<{ data: Record<string, unknown>[] }>(`SarReport/load/${scId}`),
    enabled: scId > 0,
  })

  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="รายงาน SAR" subtitle="Self Assessment Report" />
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'ปีงบ', render: (r) => String(r.budget_year ?? '—') },
          { header: 'ชื่อรายงาน', render: (r) => String(r.title ?? '—') },
          { header: 'คะแนน', render: (r) => String(r.overall_score ?? '—') },
          { header: 'ระดับ', render: (r) => String(r.overall_level ?? '—') },
          { header: 'สถานะ', render: (r) => String(r.status_name ?? '—') },
        ]}
      />
    </div>
  )
}
