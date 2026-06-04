'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


export default function ProjectFollowupPage() {
  const { scId, budgetYear } = useAppContext()
  const budgetYearBe = budgetYear >= 2400 ? budgetYear : budgetYear > 0 ? budgetYear + 543 : 0

  const { data, isLoading } = useQuery({
    queryKey: ['project-followup', scId, budgetYearBe],
    queryFn: () => apiGet<{ data: Record<string, unknown>[]; count: number }>(
      `ProjectFollowup/summary/${scId}/${budgetYearBe}`,
    ),
    enabled: scId > 0 && budgetYearBe > 0,
  })

  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="ติดตามผลโครงการ" subtitle="สรุปรายงานผลต่อโครงการ" />
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'รหัสโครงการ', render: (r) => String(r.project_id ?? '—') },
          { header: '% ความก้าวหน้า', render: (r) => `${Number(r.latest_percent ?? 0)}%` },
          { header: 'ใช้จ่ายจริง', render: (r) => fmtBaht(Number(r.latest_actual ?? 0)) },
          { header: 'วันที่รายงานล่าสุด', render: (r) => fmtDateTH(String(r.latest_date ?? '')) },
          { header: 'จำนวนรายงาน', render: (r) => String(r.report_count ?? 0) },
        ]}
      />
    </div>
  )
}
