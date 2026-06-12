'use client'
import { School, CalendarDays, User, Sparkles, Brain, AlertTriangle, GitMerge } from 'lucide-react'
import Link from 'next/link'
import { useAppContext } from '@/hooks/use-app-context'
import { WorkAlertCard } from '@/components/dashboard/work-alert-card'
import { DailyCheckBanner } from '@/components/dashboard/daily-check-banner'
import { AiAssistCard } from '@/components/dashboard/ai-assist-card'
import { DashboardBudgetSection } from '@/components/dashboard/dashboard-budget-section'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { CashDepositModal } from '@/components/dashboard/cash-deposit-modal'
import { WorkflowGuide } from '@/components/dashboard/workflow-guide'

export default function DashboardPage() {
  const { userName, scName, syYear, budgetYear: budgetYearRaw } = useAppContext()

  const user = userName ? { name: userName, sc_name: scName } : null
  const yearInfo = (syYear > 0 || budgetYearRaw > 0)
    ? {
        sy_year: syYear,
        budget_year: budgetYearRaw > 0 ? (budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543) : undefined,
      }
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white shadow">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          ยินดีต้อนรับสู่ระบบ SFMIS
        </h1>
        <p className="mt-1 text-indigo-100 text-sm md:text-base">
          ระบบบริหารจัดการการเงินโรงเรียน (School Finance Management Information System)
        </p>
      </div>

      {/* แถบเตือนปิดยอดประจำวัน (เด่น) */}
      <DailyCheckBanner />

      {/* งานที่ต้องทำ + ผู้ช่วย AI */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkAlertCard />
        <AiAssistCard />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* User card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 shrink-0">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ผู้ใช้งาน</p>
            <p className="font-semibold text-gray-900 truncate">
              {user?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* School card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 shrink-0">
            <School className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">โรงเรียน</p>
            <p className="font-semibold text-gray-900 truncate">
              {user?.sc_name ?? '—'}
            </p>
          </div>
        </div>

        {/* School year card */}
        <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 shrink-0">
            <CalendarDays className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ปีการศึกษา / ปีงบประมาณ</p>
            <p className="font-semibold text-gray-900">
              {yearInfo?.sy_year ?? '—'}{' '}
              <span className="text-gray-400 font-normal">/</span>{' '}
              {yearInfo?.budget_year ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Popup เตือนนำเงินสดฝากธนาคารตามระเบียบ 2562 (เมื่อเลยกำหนด) */}
      <CashDepositModal />

      {/* แจ้งเตือนการเงิน (ดอกเบี้ย/ภาษี/เงินยืม/เงินสดเกินวงเงิน) */}
      <AlertsWidget />

      <WorkflowGuide />

      <DashboardBudgetSection />

      {/* AI Assistant cards */}
      <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">AI Assistant</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Google Gemini
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/sfmis/ai-insights"
            className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 shrink-0">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">วิเคราะห์รายงาน</p>
              <p className="text-xs text-gray-500">AI สรุปข้อมูลการเงิน</p>
            </div>
          </Link>
          <Link
            href="/sfmis/ai-alerts"
            className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">ตรวจสอบข้อมูล</p>
              <p className="text-xs text-gray-500">แจ้งเตือนผิดปกติ</p>
            </div>
          </Link>
          <Link
            href="/sfmis/ai-merge"
            className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 shrink-0">
              <GitMerge className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">นำเข้าข้อมูล</p>
              <p className="text-xs text-gray-500">AI ช่วย merge Excel</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
