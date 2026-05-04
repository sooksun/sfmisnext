'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocCounterRow {
  doc_type: string
  last_no: number
  next_no: number
  formatted_next: string
  budget_year: string
}

interface LoadCountersResponse {
  data: DocCounterRow[]
  count: number
}

interface ApiResult {
  flag: boolean
  ms: string
}

// ─── Label map ────────────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  BC: 'ใบสำคัญรับเงิน',
  BJ: 'ใบสำคัญจ่าย',
  BY: 'สัญญายืมเงิน',
  BG: 'เบิก/จ่าย',
}

const DOC_TYPE_COLOR: Record<string, string> = {
  BC: 'bg-blue-100 text-blue-700',
  BJ: 'bg-orange-100 text-orange-700',
  BY: 'bg-purple-100 text-purple-700',
  BG: 'bg-green-100 text-green-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocCounterPage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const apiYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543)
  const qc = useQueryClient()

  // ── localStorage state ──────────────────────────────────────────────────────

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<DocCounterRow | null>(null)

  // ── Query ──────────────────────────────────────────────────────────────────
  const enabled = scId > 0 && apiYear !== ''

  const { data, isLoading } = useQuery({
    queryKey: ['doc-counter', scId, apiYear],
    queryFn: () => apiGet<LoadCountersResponse>(`DocCounter/loadCounters/${scId}/${apiYear}`),
    enabled,
  })

  const rows: DocCounterRow[] = data?.data ?? []

  // ── Reset mutation ─────────────────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: (row: DocCounterRow) =>
      apiPost<ApiResult>('DocCounter/resetCounter', {
        sc_id: scId,
        budget_year: apiYear,
        doc_type: row.doc_type,
        reset_to: 0,
      }),
    onSuccess: (res) => {
      if (res.flag) {
        toast.success(res.ms)
        qc.invalidateQueries({ queryKey: ['doc-counter'] })
        setResetTarget(null)
      } else {
        toast.error(res.ms)
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดในการรีเซ็ต'),
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ตั้งเลขที่เอกสารอัตโนมัติ" />

      <div className="p-4 space-y-4">
        {budgetYear && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <Hash className="h-4 w-4" />
            ปีงบประมาณ พ.ศ. <span className="font-semibold text-gray-700">{budgetYear}</span>
          </p>
        )}

        {/* ── Table card ───────────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-left">
                <th className="px-4 py-3 font-medium w-8 text-center">#</th>
                <th className="px-4 py-3 font-medium">ประเภทเอกสาร</th>
                <th className="px-4 py-3 font-medium w-24 text-center">รหัส</th>
                <th className="px-4 py-3 font-medium w-32 text-right">เลขที่ล่าสุด</th>
                <th className="px-4 py-3 font-medium w-44 text-right">เลขที่ถัดไป</th>
                <th className="px-4 py-3 font-medium w-32 text-center">ปีงบประมาณ</th>
                <th className="px-4 py-3 font-medium w-28 text-center">รีเซ็ต</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                      กำลังโหลด...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.doc_type} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {DOC_TYPE_LABEL[row.doc_type] ?? row.doc_type}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          DOC_TYPE_COLOR[row.doc_type] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {row.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {row.last_no.toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-blue-700 tabular-nums">
                        {row.formatted_next}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.budget_year}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => setResetTarget(row)}
                        title={`รีเซ็ตเลขที่ ${row.doc_type}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        รีเซ็ต
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Info note ────────────────────────────────────────────────────── */}
        <p className="text-xs text-gray-400">
          * เลขที่ถัดไปจะถูกออกให้อัตโนมัติเมื่อบันทึกเอกสาร — การรีเซ็ตจะตั้งค่าเลขที่ล่าสุดเป็น 0
        </p>
      </div>

      {/* ── Reset confirm dialog ──────────────────────────────────────────── */}
      <FormDialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="ยืนยันการรีเซ็ตเลขที่เอกสาร"
        onSubmit={() => resetTarget && resetMutation.mutate(resetTarget)}
        submitLabel="ยืนยันรีเซ็ต"
        loading={resetMutation.isPending}
        size="sm"
      >
        {resetTarget && (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              ต้องการรีเซ็ตเลขที่เอกสาร{' '}
              <span className="font-semibold">
                {DOC_TYPE_LABEL[resetTarget.doc_type] ?? resetTarget.doc_type}
              </span>{' '}
              (<span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${DOC_TYPE_COLOR[resetTarget.doc_type] ?? 'bg-gray-100 text-gray-700'}`}>
                {resetTarget.doc_type}
              </span>){' '}
              เป็น 0 หรือไม่?
            </p>
            <p className="text-gray-500 text-xs">
              เลขที่ถัดไปหลังรีเซ็ตจะเป็น{' '}
              <span className="font-semibold text-blue-700">
                {(resetTarget.doc_type in { BC: 1, BJ: 1, BY: 1, BG: 1 }
                  ? { BC: 'บค.', BJ: 'บจ.', BY: 'บย.', BG: 'บง.' }[resetTarget.doc_type]
                  : resetTarget.doc_type) + `1/${budgetYear}`}
              </span>
            </p>
          </div>
        )}
      </FormDialog>
    </div>
  )
}
