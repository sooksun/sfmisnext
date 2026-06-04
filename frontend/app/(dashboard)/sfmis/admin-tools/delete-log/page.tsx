'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'


const TABLES = [
  { key: 'pln_project', label: 'โครงการ' },
  { key: 'parcel_order', label: 'ขอซื้อ/ขอจ้าง' },
  { key: 'tb_invoice', label: 'ใบสำคัญจ่าย' },
]

export default function DeleteLogPage() {
  const { scId } = useAppContext()
  const [table, setTable] = useState(TABLES[0].key)

  const { data, isLoading } = useQuery({
    queryKey: ['delete-log', scId, table],
    queryFn: () => apiGet<Record<string, unknown>[]>(`Delete_log/listBySchool/${scId}/${table}`),
    enabled: scId > 0,
  })

  const rows = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <PageHeader title="บันทึกการลบข้อมูล" subtitle="ตรวจสอบประวัติการลบ (soft delete)" />
      <div className="flex flex-wrap gap-2">
        {TABLES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTable(t.key)}
            className={`rounded-md border px-3 py-1.5 text-sm ${table === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DataTable
        loading={isLoading}
        data={rows}
        total={rows.length}
        page={0}
        pageSize={rows.length || 20}
        onPageChange={() => {}}
        columns={[
          { header: 'รหัส', render: (r) => String(r.record_id ?? r.id ?? '—') },
          { header: 'ลบโดย', render: (r) => String(r.deleted_by ?? '—') },
          { header: 'วันที่', render: (r) => fmtDateTH(String(r.deleted_at ?? r.cre_date ?? '')) },
        ]}
      />
    </div>
  )
}
