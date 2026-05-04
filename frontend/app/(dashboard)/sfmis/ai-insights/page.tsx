'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { Brain, TrendingUp, PieChart, BarChart3, Loader2, Sparkles } from 'lucide-react'
import { useAppContext } from '@/hooks/use-app-context'

interface AnalysisResult {
  analysis: string
  rawData: Record<string, unknown>
}

interface AnalysisResponse {
  flag: boolean
  data: AnalysisResult
}

type AnalysisType = 'monthly' | 'budget' | 'trend'

const analysisOptions = [
  {
    type: 'monthly' as AnalysisType,
    title: 'สรุปรายเดือน',
    description: 'สรุปรายรับ-รายจ่ายประจำเดือน',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    type: 'budget' as AnalysisType,
    title: 'วิเคราะห์งบประมาณ',
    description: 'สถานะการใช้งบประมาณทุกหมวด',
    icon: PieChart,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    type: 'trend' as AnalysisType,
    title: 'แนวโน้มรายจ่าย',
    description: 'วิเคราะห์แนวโน้มรายจ่ายย้อนหลัง 6 เดือน',
    icon: TrendingUp,
    color: 'bg-purple-100 text-purple-600',
  },
]

export default function AiInsightsPage() {
  const { scId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543) // CE for API
  const [displayYear, setDisplayYear] = useState('')
  const [results, setResults] = useState<Record<AnalysisType, string>>({
    monthly: '',
    budget: '',
    trend: '',
  })
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType | null>(null)

  const analyzeMonthly = useMutation({
    mutationFn: () => {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return apiPost<AnalysisResponse>('ai/analyze/monthly-summary', {
        sc_id: scId,
        budget_year: budgetYear,
        month,
      })
    },
    onSuccess: (res) => {
      setResults((prev) => ({ ...prev, monthly: res.data.analysis }))
    },
  })

  const analyzeBudget = useMutation({
    mutationFn: () =>
      apiPost<AnalysisResponse>('ai/analyze/budget-utilization', {
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
      }),
    onSuccess: (res) => {
      setResults((prev) => ({ ...prev, budget: res.data.analysis }))
    },
  })

  const analyzeTrend = useMutation({
    mutationFn: () =>
      apiPost<AnalysisResponse>('ai/analyze/spending-trend', {
        sc_id: scId,
        budget_year: budgetYear,
        months: 6,
      }),
    onSuccess: (res) => {
      setResults((prev) => ({ ...prev, trend: res.data.analysis }))
    },
  })

  const handleAnalyze = (type: AnalysisType) => {
    setActiveAnalysis(type)
    switch (type) {
      case 'monthly':
        analyzeMonthly.mutate()
        break
      case 'budget':
        analyzeBudget.mutate()
        break
      case 'trend':
        analyzeTrend.mutate()
        break
    }
  }

  const isAnalyzing = analyzeMonthly.isPending || analyzeBudget.isPending || analyzeTrend.isPending

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI วิเคราะห์รายงานการเงิน"
        subtitle={`ปีงบประมาณ ${displayYear} — ระบบ AI วิเคราะห์และสรุปข้อมูลการเงินด้วย Google Gemini`}
      />

      {/* Analysis buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {analysisOptions.map((opt) => {
          const Icon = opt.icon
          const isActive = activeAnalysis === opt.type
          const isPending =
            (opt.type === 'monthly' && analyzeMonthly.isPending) ||
            (opt.type === 'budget' && analyzeBudget.isPending) ||
            (opt.type === 'trend' && analyzeTrend.isPending)

          return (
            <button
              key={opt.type}
              onClick={() => handleAnalyze(opt.type)}
              disabled={isAnalyzing}
              className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition-all ${
                isActive
                  ? 'border-emerald-300 bg-emerald-50 shadow-md'
                  : 'bg-white hover:bg-gray-50 hover:shadow-sm'
              } disabled:opacity-50`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${opt.color}`}>
                {isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{opt.title}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Results */}
      {activeAnalysis && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              ผลวิเคราะห์ — {analysisOptions.find((o) => o.type === activeAnalysis)?.title}
            </h2>
          </div>

          {results[activeAnalysis] ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {results[activeAnalysis]}
              </div>
            </div>
          ) : isAnalyzing ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Brain className="h-8 w-8 animate-pulse text-emerald-400" />
              <span className="text-gray-500">AI กำลังวิเคราะห์ข้อมูล...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              กดปุ่มด้านบนเพื่อเริ่มวิเคราะห์
            </p>
          )}
        </div>
      )}
    </div>
  )
}
