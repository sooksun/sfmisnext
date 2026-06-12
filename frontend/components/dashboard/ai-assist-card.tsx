'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface SummaryResp { summary: string; source: 'ai' | 'rule' }
interface AskResp { answer: string; source: 'ai' | 'rule' }

export function AiAssistCard() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AskResp | null>(null)

  const { data: summary } = useQuery<SummaryResp>({
    queryKey: ['ai-daily-summary', scId, budgetYear],
    queryFn: () => apiGet<SummaryResp>(`Ai_assist/dailySummary/${scId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
    staleTime: 10 * 60 * 1000,
  })

  const askMut = useMutation({
    mutationFn: (q: string) =>
      apiPost<AskResp>('Ai_assist/ask', { sc_id: scId, budget_year: budgetYear, question: q }),
    onSuccess: (r) => setAnswer(r),
  })

  if (!scId) return null

  return (
    <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-100">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <h2 className="font-bold text-gray-800">ผู้ช่วยการเงิน AI</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {summary?.summary ?? 'กำลังสรุปงานวันนี้…'}
        </p>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && question.trim() && askMut.mutate(question.trim())}
            placeholder="ถามผู้ช่วย เช่น เดือนนี้ต้องทำอะไร…"
            className="flex-1 h-9 rounded-md border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button
            onClick={() => question.trim() && askMut.mutate(question.trim())}
            disabled={askMut.isPending || !question.trim()}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {askMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ถาม
          </button>
        </div>

        {answer && (
          <div className="rounded-lg bg-white border border-violet-100 p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">{answer.answer}</p>
            <span className={cn('text-[10px] mt-1 inline-block', answer.source === 'ai' ? 'text-violet-500' : 'text-gray-400')}>
              {answer.source === 'ai' ? '✦ ตอบโดย AI' : 'จากข้อมูลงานค้าง'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
