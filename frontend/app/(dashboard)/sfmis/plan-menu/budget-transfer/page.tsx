'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


export default function BudgetTransferPage() {
  const { scId, budgetYear } = useAppContext()
  const budgetYearBe = budgetYear >= 2400 ? budgetYear : budgetYear > 0 ? budgetYear + 543 : 0

  const { data, isLoading } = useQuery({
    queryKey: ['budget-transfer', scId, budgetYearBe],
    queryFn: () => apiGet<{ data: Record<string, unknown>[]; count: number }>(
      `BudgetTransfer/load/${scId}/${budgetYearBe}`,
    ),
    enabled: scId > 0 && budgetYearBe > 0,
  })

  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title="โอนงบประมาณ" subtitle="โอนงบระหว่างหมวด/โครงการ" />
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'เลขที่', render: (r) => String(r.bt_no ?? '—') },
          { header: 'วันที่', render: (r) => fmtDateTH(String(r.bt_date ?? '')) },
          { header: 'จำนวนเงิน', render: (r) => fmtBaht(Number(r.amount ?? 0)) },
          { header: 'สถานะ', render: (r) => String(r.status_name ?? r.status ?? '—') },
          { header: 'เหตุผล', render: (r) => String(r.reason ?? '—') },
        ]}
      />
    </div>
  )
}
