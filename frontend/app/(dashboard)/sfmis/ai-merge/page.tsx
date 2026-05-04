'use client'
import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAppContext } from '@/hooks/use-app-context'

interface ColumnMapping {
  excel_column: string
  db_field: string
  confidence: number
  ai_reason: string
}

interface MappingResponse {
  flag: boolean
  data: ColumnMapping[]
}

const TARGET_TABLES = [
  { value: 'financial_transactions', label: 'รายการเงิน (financial_transactions)' },
  { value: 'request_withdraw', label: 'ใบสำคัญจ่าย (request_withdraw)' },
  { value: 'bank_ledger_entry', label: 'รายการฝากธนาคาร (bank_ledger_entry)' },
  { value: 'loan_agreement', label: 'สัญญายืมเงิน (loan_agreement)' },
]

export default function AiMergePage() {
  const { scId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = String(budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543) // CE for API
  const [displayYear, setDisplayYear] = useState('')
  const [targetTable, setTargetTable] = useState('financial_transactions')

  // Excel data
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  // AI mapping results
  const [mappings, setMappings] = useState<ColumnMapping[]>([])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (evt) => {
        const data = evt.target?.result
        const wb = XLSX.read(data, { type: 'binary' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
        if (json.length > 0) {
          setHeaders(Object.keys(json[0]))
          setRows(json.slice(0, 10)) // ส่งแค่ 10 แถวแรกให้ AI
        }
      }
      reader.readAsBinaryString(file)
    },
    [],
  )

  const suggestMapping = useMutation({
    mutationFn: () =>
      apiPost<MappingResponse>('ai/merge/excel-mapping', {
        sc_id: scId,
        budget_year: budgetYear,
        target_table: targetTable,
        headers,
        rows: rows.slice(0, 5),
      }),
    onSuccess: (res) => {
      setMappings(res.data)
    },
  })

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-50'
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI นำเข้าข้อมูล (Data Merge)"
        subtitle={`ปีงบประมาณ ${displayYear} — AI ช่วยจับคู่ column Excel กับฐานข้อมูล`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload section */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-500" />
            อัพโหลดไฟล์ Excel
          </h2>

          {/* Target table select */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ตารางเป้าหมาย
          </label>
          <select
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            {TARGET_TABLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* File input */}
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-indigo-400 hover:bg-indigo-50">
            <FileSpreadsheet className="h-10 w-10 text-gray-400" />
            <span className="text-sm text-gray-500">
              {fileName || 'คลิกเพื่อเลือกไฟล์ .xlsx / .csv'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Preview */}
          {headers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                พบ {headers.length} columns, {rows.length} แถว (ตัวอย่าง)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <button
                onClick={() => suggestMapping.mutate()}
                disabled={suggestMapping.isPending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {suggestMapping.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                AI วิเคราะห์ Mapping
              </button>
            </div>
          )}
        </div>

        {/* Mapping results */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            ผลการจับคู่โดย AI
          </h2>

          {mappings.length === 0 && !suggestMapping.isPending && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-400">
              <ArrowRight className="h-8 w-8" />
              <p className="text-sm">อัพโหลด Excel แล้วกด "AI วิเคราะห์" เพื่อเริ่มต้น</p>
            </div>
          )}

          {suggestMapping.isPending && (
            <div className="flex items-center gap-3 py-12 justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <span className="text-gray-500">AI กำลังวิเคราะห์ column...</span>
            </div>
          )}

          {mappings.length > 0 && (
            <div className="space-y-2">
              {mappings.map((m) => (
                <div
                  key={m.excel_column}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
                        {m.excel_column}
                      </span>
                      <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-mono text-emerald-700">
                        {m.db_field}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{m.ai_reason}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.confidence >= 0.7 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColor(m.confidence)}`}
                    >
                      {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
