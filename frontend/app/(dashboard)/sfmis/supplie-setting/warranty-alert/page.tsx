'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { apiGet } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface WarrantyItem {
  type: 'contract'
  id: number
  label: string
  amount: number
  warranty_start_date: string | null
  warranty_end_date: string | null
  days_remaining: number
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

function urgencyClass(days: number) {
  if (days <= 7) return 'border-red-400 bg-red-50'
  if (days <= 30) return 'border-amber-400 bg-amber-50'
  return 'border-blue-300 bg-blue-50'
}

function urgencyBadge(days: number) {
  if (days <= 7) return 'bg-red-100 text-red-800'
  if (days <= 30) return 'bg-amber-100 text-amber-800'
  return 'bg-blue-100 text-blue-800'
}

export default function WarrantyAlertPage() {
  const { scId } = useAppContext()
  const [daysAhead, setDaysAhead] = useState(90)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['warranty-alert', scId, daysAhead],
    queryFn: () => apiGet<WarrantyItem[]>(`Supplie_contract/expiring-warranty/${scId}?days=${daysAhead}`),
    enabled: scId > 0,
  })

  const expiredSoon7 = items.filter((i) => i.days_remaining <= 7)
  const expiredSoon30 = items.filter((i) => i.days_remaining > 7 && i.days_remaining <= 30)
  const expiredSoon90 = items.filter((i) => i.days_remaining > 30)

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="แจ้งเตือนรับประกันสินค้าใกล้หมด" />

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">แสดงรายการหมดภายใน</span>
          <select
            className="border rounded-md h-9 px-2 text-sm"
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
          >
            <option value={30}>30 วัน</option>
            <option value={60}>60 วัน</option>
            <option value={90}>90 วัน</option>
            <option value={180}>180 วัน</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-500 py-8 text-center">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <CheckCircle className="h-12 w-12 mb-3 text-green-400" />
            <p className="text-sm">ไม่มีรายการรับประกันหมดภายใน {daysAhead} วัน</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{expiredSoon7.length}</div>
                <div className="text-xs text-red-600 mt-0.5">หมดภายใน 7 วัน</div>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{expiredSoon30.length}</div>
                <div className="text-xs text-amber-600 mt-0.5">8–30 วัน</div>
              </div>
              <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{expiredSoon90.length}</div>
                <div className="text-xs text-blue-600 mt-0.5">31–{daysAhead} วัน</div>
              </div>
            </div>

            {/* Item list */}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-lg border-l-4 p-3 flex items-center justify-between ${urgencyClass(item.days_remaining)}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 pl-6">
                      มูลค่าสัญญา {fmt(item.amount)} บาท
                      {item.warranty_start_date && ` · เริ่มรับประกัน ${fmtDateTH(item.warranty_start_date)}`}
                      {item.warranty_end_date && ` · หมด ${fmtDateTH(item.warranty_end_date)}`}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyBadge(item.days_remaining)}`}>
                    เหลือ {item.days_remaining} วัน
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
