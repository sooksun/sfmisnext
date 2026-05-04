'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { AlertTriangle, AlertCircle, Info, Shield, RefreshCw } from 'lucide-react'
import { useAppContext } from '@/hooks/use-app-context'

interface FinancialAlert {
  type: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string
  relatedId?: number | string
}

interface AlertsResponse {
  flag: boolean
  data: FinancialAlert[]
  count: number
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 border-red-200',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'รุนแรง',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'เตือน',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'แจ้งเตือน',
  },
}

export default function AiAlertsPage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543) // CE for API
  const [displayYear, setDisplayYear] = useState('')

  const { data, isLoading, refetch } = useQuery<AlertsResponse>({
    queryKey: ['ai-alerts', scId, budgetYear],
    queryFn: () => apiGet(`ai/validate/alerts/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYear !== '',
    refetchOnWindowFocus: false,
  })

  const alerts = data?.data ?? []
  const errorCount = alerts.filter((a) => a.severity === 'error').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length
  const infoCount = alerts.filter((a) => a.severity === 'info').length

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI ตรวจสอบข้อมูลผิดปกติ"
        subtitle={`ปีงบประมาณ ${displayYear} — ระบบ AI วิเคราะห์ข้อมูลการเงินอัตโนมัติ`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <Shield className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500">รายการทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-red-50 p-4 shadow-sm">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-xs text-gray-500">รุนแรง</p>
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-amber-50 p-4 shadow-sm">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-xs text-gray-500">เตือน</p>
            <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-4 shadow-sm">
          <Info className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">แจ้งเตือน</p>
            <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
          </div>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          ตรวจสอบใหม่
        </button>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="ml-3 text-gray-500">AI กำลังวิเคราะห์ข้อมูล...</span>
          </div>
        )}

        {!isLoading && alerts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-emerald-50 py-12 text-center">
            <Shield className="h-12 w-12 text-emerald-400" />
            <p className="text-lg font-semibold text-emerald-700">ไม่พบข้อมูลผิดปกติ</p>
            <p className="text-sm text-emerald-600">ข้อมูลการเงินทั้งหมดอยู่ในเกณฑ์ปกติ</p>
          </div>
        )}

        {alerts.map((alert, i) => {
          const config = severityConfig[alert.severity]
          const Icon = config.icon
          return (
            <div
              key={`${alert.type}-${i}`}
              className={`flex gap-3 rounded-lg border p-4 ${config.bg}`}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{alert.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
                    {config.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{alert.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
