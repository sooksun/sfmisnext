'use client'

import type { ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { fmtBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'

interface DashboardSummary {
  budgetReceived: number
  budgetAnnual: number
  disbursement: number
  remaining: number
}

interface PredictBudget {
  predicted: number
  actual: number
  difference: number
  real_budget: number
}

interface PieChartData {
  data: number[]
  labels: string[]
}

interface BarChartData {
  labels: string[]
  data: { income: number; expense: number }[]
}

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full shrink-0 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 tabular-nums">{fmtBaht(value)}</p>
      </div>
    </div>
  )
}

export function DashboardBudgetSection() {
  const { scId, budgetYear } = useAppContext()
  const budgetYearBe = budgetYear >= 2400 ? budgetYear : budgetYear > 0 ? budgetYear + 543 : 0
  const chartYearCe = budgetYearBe > 0 ? budgetYearBe - 543 : new Date().getFullYear()
  const enabled = scId > 0

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary', scId],
    queryFn: () => apiPost<DashboardSummary>('Dashboard/load_dashboard', { sc_id: scId }),
    enabled,
  })

  const { data: predict } = useQuery({
    queryKey: ['dashboard-predict', scId, budgetYearBe],
    queryFn: () => apiGet<PredictBudget>(`Dashboard/predictBudget/${scId}/${budgetYearBe}`),
    enabled: enabled && budgetYearBe > 0,
  })

  const { data: pieRaw } = useQuery({
    queryKey: ['dashboard-pie', scId, chartYearCe],
    queryFn: () =>
      apiGet<PieChartData>(`Dashboard/loadChartBudgetType_Pie?sc_id=${scId}&year=${chartYearCe}`),
    enabled,
  })

  const { data: barRaw } = useQuery({
    queryKey: ['dashboard-bar', scId, chartYearCe],
    queryFn: () =>
      apiGet<BarChartData>(`Dashboard/loadChartBudgetType_Bar?sc_id=${scId}&year=${chartYearCe}`),
    enabled,
  })

  const pieData =
    pieRaw?.labels?.map((name, i) => ({ name, value: pieRaw.data[i] ?? 0 })) ?? []

  const barData =
    barRaw?.labels?.map((name, i) => ({
      name: name.length > 18 ? `${name.slice(0, 16)}…` : name,
      income: barRaw.data[i]?.income ?? 0,
      expense: barRaw.data[i]?.expense ?? 0,
    })) ?? []

  if (!enabled) {
    return (
      <p className="text-sm text-gray-500 rounded-lg border bg-white p-4">
        กรุณาเข้าสู่ระบบและเลือกปีงบประมาณเพื่อดูสรุปงบประมาณ
      </p>
    )
  }

  const diffClass =
    (predict?.difference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">สรุปงบประมาณ</h2>
        <p className="text-sm text-gray-500">ข้อมูลจากระบบการเงินโรงเรียน</p>
      </div>

      {loadingSummary ? (
        <p className="text-sm text-gray-400">กำลังโหลดสรุป...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="รับเงินรวม" value={summary?.budgetReceived ?? 0} icon={TrendingUp} accent="bg-green-100 text-green-600" />
          <SummaryCard label="งบประมาณปี" value={summary?.budgetAnnual ?? 0} icon={Wallet} accent="bg-indigo-100 text-indigo-600" />
          <SummaryCard label="เบิกจ่ายรวม" value={summary?.disbursement ?? 0} icon={TrendingDown} accent="bg-orange-100 text-orange-600" />
          <SummaryCard label="คงเหลือ" value={summary?.remaining ?? 0} icon={PiggyBank} accent="bg-blue-100 text-blue-600" />
        </div>
      )}

      {predict && budgetYearBe > 0 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            ประมาณการ vs รับจริง (ปีงบ {budgetYearBe})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">ประมาณการ</p><p className="font-semibold tabular-nums">{fmtBaht(predict.predicted)}</p></div>
            <div><p className="text-gray-500">งบจริง</p><p className="font-semibold tabular-nums">{fmtBaht(predict.real_budget)}</p></div>
            <div><p className="text-gray-500">รับจริง</p><p className="font-semibold tabular-nums">{fmtBaht(predict.actual)}</p></div>
            <div><p className="text-gray-500">ส่วนต่าง</p><p className={`font-semibold tabular-nums ${diffClass}`}>{fmtBaht(predict.difference)}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm min-h-[280px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">สัดส่วนรายรับตามประเภทเงิน</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">ไม่มีข้อมูล</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props) => {
                    const pct = ((props.percent ?? 0) * 100).toFixed(0)
                    return `${props.name} ${pct}%`
                  }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtBaht(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm min-h-[280px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">รายรับ vs รายจ่ายตามประเภทเงิน</h3>
          {barData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">ไม่มีข้อมูล</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtBaht(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="income" name="รายรับ" fill="#4f46e5" />
                <Bar dataKey="expense" name="รายจ่าย" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
