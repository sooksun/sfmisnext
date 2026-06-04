'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


export default function PlanTracePage() {
  const { scId, budgetYear } = useAppContext()
  const budgetYearBe = budgetYear >= 2400 ? budgetYear : budgetYear > 0 ? budgetYear + 543 : 0

  const { data, isLoading } = useQuery({
    queryKey: ['plan-trace', scId, budgetYearBe],
    queryFn: () => apiGet<{ data: Record<string, unknown>[]; count: number }>(
      `PlanTrace/overview/${scId}/${budgetYearBe}`,
    ),
    enabled: scId > 0 && budgetYearBe > 0,
  })

  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="ติดตามแผน-โครงการ" subtitle="ภาพรวมงบและการสั่งซื้อต่อโครงการ" />
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'โครงการ', render: (r) => String(r.project_name ?? '—') },
          { header: 'งบโครงการ', render: (r) => fmtBaht(Number(r.total_budget ?? 0)) },
          { header: 'สั่งซื้อแล้ว', render: (r) => fmtBaht(Number(r.total_ordered ?? 0)) },
          { header: 'คงเหลือ', render: (r) => fmtBaht(Number(r.budget_remaining ?? 0)) },
          { header: '% ใช้', render: (r) => `${Number(r.percent_used ?? 0)}%` },
        ]}
      />
    </div>
  )
}
