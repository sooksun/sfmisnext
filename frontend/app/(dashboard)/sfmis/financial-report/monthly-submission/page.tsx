'use client'
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Clock, Send, ShieldCheck, PenLine } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: number
  label: string
  checked: boolean
}

interface SubmissionRecord {
  ms_id: number
  sc_id: number
  sy_id: number
  submit_month: string | null
  status: number
  checklist: string | null
  submitted_at: string | null
  submitted_by: number | null
  submitted_by_name: string | null
  note: string | null
  create_date: string | null
  update_date: string | null
  isOverdue: boolean
}

interface AlertData {
  hasAlert: boolean
  overdue_months: string[]
}

interface MonthlyAuditStatus {
  month: string
  signed: boolean
  signed_by: number | null
  signed_name: string | null
  signed_at: string | null
  note: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THAI_MONTH_NAMES: Record<string, string> = {
  '10': 'ต.ค.',
  '11': 'พ.ย.',
  '12': 'ธ.ค.',
  '01': 'ม.ค.',
  '02': 'ก.พ.',
  '03': 'มี.ค.',
  '04': 'เม.ย.',
  '05': 'พ.ค.',
  '06': 'มิ.ย.',
  '07': 'ก.ค.',
  '08': 'ส.ค.',
  '09': 'ก.ย.',
}

const MONTH_ORDER = ['10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMonthKeys(budgetYear: number): string[] {
  // budgetYear e.g. 2568 (BE)
  // Oct-Dec = budgetYear, Jan-Sep = budgetYear+1
  return MONTH_ORDER.map((m) => {
    const y = ['10', '11', '12'].includes(m) ? budgetYear : budgetYear + 1
    return `${y}-${m}`
  })
}

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as ChecklistItem[]
  } catch {
    return []
  }
}

function statusBadge(status: number) {
  if (status === 3)
    return <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">ยืนยัน</span>
  if (status === 2)
    return <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">ส่งแล้ว</span>
  return <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">ร่าง</span>
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthlySubmissionPage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const budgetYear = budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543 // BE number
  const qc = useQueryClient()

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [detailRecord, setDetailRecord] = useState<SubmissionRecord | null>(null)
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([])
  const [localNote, setLocalNote] = useState('')
  const [loadingMonth, setLoadingMonth] = useState(false)

  // Read localStorage on mount

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['monthly-submissions', scId, syId],
    queryFn: () =>
      apiGet<{ data: SubmissionRecord[]; count: number }>(
        `MonthlySubmission/loadSubmissions/${scId}/${syId}`,
      ),
    enabled: scId > 0 && syId > 0,
  })

  const { data: alertData } = useQuery({
    queryKey: ['monthly-submission-alert', scId, syId],
    queryFn: () =>
      apiGet<AlertData>(`MonthlySubmission/currentMonthAlert/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  const submissions: SubmissionRecord[] = submissionsData?.data ?? []
  const monthKeys = budgetYear > 0 ? buildMonthKeys(budgetYear) : []

  // Map submit_month -> record
  const recordMap = new Map<string, SubmissionRecord>()
  for (const r of submissions) {
    if (r.submit_month) recordMap.set(r.submit_month, r)
  }

  // ─── Sync detail when submissions reload ────────────────────────────────────

  useEffect(() => {
    if (selectedMonth && recordMap.has(selectedMonth)) {
      const r = recordMap.get(selectedMonth)!
      setDetailRecord(r)
      setLocalChecklist(parseChecklist(r.checklist))
      setLocalNote(r.note ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionsData, selectedMonth])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (vars: { checklist: ChecklistItem[]; note: string }) => {
      if (!detailRecord) throw new Error('no record')
      return apiPost('MonthlySubmission/saveSubmission', {
        sc_id: scId,
        sy_id: syId,
        submit_month: detailRecord.submit_month as string,
        checklist: JSON.stringify(vars.checklist),
        note: vars.note,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'บันทึกเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['monthly-submissions'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!detailRecord) throw new Error('no record')
      return apiPost('MonthlySubmission/submitMonth', {
        ms_id: detailRecord.ms_id,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ส่งรายงานเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['monthly-submissions'] })
        qc.invalidateQueries({ queryKey: ['monthly-submission-alert'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!detailRecord) throw new Error('no record')
      return apiPost('MonthlySubmission/confirmSubmission', {
        ms_id: detailRecord.ms_id,
        up_by: adminId,
      })
    },
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ยืนยันรับรายงานเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['monthly-submissions'] })
        qc.invalidateQueries({ queryKey: ['monthly-submission-alert'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // G10: ผอ.ลงนามประจำเดือน
  const signMonthlyMutation = useMutation({
    mutationFn: (month: string) =>
      apiPost('FinancialAudit/signMonthly', {
        sc_id: scId,
        sy_id: syId,
        month,
        signed_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ผอ.ลงนามประจำเดือนเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['monthly-audit-status'] })
      } else {
        toast.error(res?.ms || 'เกิดข้อผิดพลาด')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาดในการลงนาม'),
  })

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectMonth = useCallback(
    async (monthKey: string) => {
      setSelectedMonth(monthKey)
      const existing = recordMap.get(monthKey)
      if (existing) {
        setDetailRecord(existing)
        setLocalChecklist(parseChecklist(existing.checklist))
        setLocalNote(existing.note ?? '')
        return
      }
      // No existing record — call getOrCreate
      setLoadingMonth(true)
      try {
        const res = await apiPost<SubmissionRecord>('MonthlySubmission/getOrCreate', {
          sc_id: scId,
          sy_id: syId,
          submit_month: monthKey,
        })
        setDetailRecord(res)
        setLocalChecklist(parseChecklist((res as any).checklist))
        setLocalNote((res as any).note ?? '')
        qc.invalidateQueries({ queryKey: ['monthly-submissions'] })
      } catch {
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      } finally {
        setLoadingMonth(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scId, syId, recordMap, qc],
  )

  const handleChecklistToggle = (id: number) => {
    if (!detailRecord || detailRecord.status === 3) return
    const updated = localChecklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    )
    setLocalChecklist(updated)
    // Auto-save
    saveMutation.mutate({ checklist: updated, note: localNote })
  }

  const handleNoteBlur = () => {
    if (!detailRecord || detailRecord.status === 3) return
    saveMutation.mutate({ checklist: localChecklist, note: localNote })
  }

  const handleSave = () => {
    saveMutation.mutate({ checklist: localChecklist, note: localNote })
  }

  const handleSubmit = () => {
    const allChecked = localChecklist.length > 0 && localChecklist.every((c) => c.checked)
    if (!allChecked) {
      toast.error('กรุณาทำเครื่องหมายครบทุกรายการก่อนส่งรายงาน')
      return
    }
    // Save then submit
    saveMutation.mutate(
      { checklist: localChecklist, note: localNote },
      {
        onSuccess: (res: any) => {
          if (res?.flag !== false) submitMutation.mutate()
        },
      },
    )
  }

  const handleConfirm = () => {
    confirmMutation.mutate()
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const overdueCount = alertData?.overdue_months?.length ?? 0

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รายงานการส่งเอกสารประจำเดือน" />

      {/* ── Top Alert Banner ───────────────────────────────────────────────── */}
      {overdueCount > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>
            มี <strong>{overdueCount} เดือน</strong> ที่ยังไม่ส่งรายงาน (เกินกำหนดวันที่ 5 ของเดือนถัดไป)
          </span>
        </div>
      )}

      {/* ── Two-panel layout ───────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left panel — month list */}
        <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {isLoading || budgetYear === 0 ? (
            <div className="text-sm text-gray-400 pt-4 text-center">กำลังโหลด...</div>
          ) : (
            monthKeys.map((mk) => {
              const [, mm] = mk.split('-')
              const rec = recordMap.get(mk)
              const status = rec?.status ?? 0
              const overdue = rec?.isOverdue ?? false
              const isSelected = selectedMonth === mk

              return (
                <button
                  key={mk}
                  onClick={() => handleSelectMonth(mk)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors text-left',
                    isSelected
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{THAI_MONTH_NAMES[mm]}</span>
                    <span className="text-xs text-gray-500">{mk}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {status > 0 ? statusBadge(status) : <span className="text-xs text-gray-300">-</span>}
                    {overdue && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedMonth ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
              <Clock className="h-8 w-8 mb-2 text-gray-300" />
              เลือกเดือนทางซ้ายเพื่อดูรายละเอียด
            </div>
          ) : loadingMonth ? (
            <div className="text-sm text-gray-400 pt-8 text-center">กำลังโหลด...</div>
          ) : detailRecord ? (
            <DetailPanel
              record={detailRecord}
              checklist={localChecklist}
              note={localNote}
              onNoteChange={setLocalNote}
              onNoteBlur={handleNoteBlur}
              onChecklistToggle={handleChecklistToggle}
              onSave={handleSave}
              onSubmit={handleSubmit}
              onConfirm={handleConfirm}
              saving={saveMutation.isPending}
              submitting={submitMutation.isPending}
              confirming={confirmMutation.isPending}
              scId={scId}
              syId={syId}
              onSignMonthly={(month) => signMonthlyMutation.mutate(month)}
              signingMonthly={signMonthlyMutation.isPending}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  record: SubmissionRecord
  checklist: ChecklistItem[]
  note: string
  onNoteChange: (v: string) => void
  onNoteBlur: () => void
  onChecklistToggle: (id: number) => void
  onSave: () => void
  onSubmit: () => void
  onConfirm: () => void
  saving: boolean
  submitting: boolean
  confirming: boolean
  // G10 monthly sign-off
  scId: number
  syId: number
  onSignMonthly: (month: string) => void
  signingMonthly: boolean
}

function DetailPanel({
  record,
  checklist,
  note,
  onNoteChange,
  onNoteBlur,
  onChecklistToggle,
  onSave,
  onSubmit,
  onConfirm,
  saving,
  submitting,
  confirming,
  scId,
  syId,
  onSignMonthly,
  signingMonthly,
}: DetailPanelProps) {
  // G10: load monthly sign-off status
  const { data: auditStatus } = useQuery({
    queryKey: ['monthly-audit-status', scId, syId, record.submit_month],
    queryFn: () =>
      apiGet<MonthlyAuditStatus>(
        `FinancialAudit/monthlyStatus/${scId}/${syId}/${record.submit_month}`,
      ),
    enabled: scId > 0 && syId > 0 && !!record.submit_month && record.status >= 2,
  })
  const monthLabel = record.submit_month
    ? (() => {
        const [, mm] = (record.submit_month as string).split('-')
        return `${THAI_MONTH_NAMES[mm] ?? mm} (${record.submit_month})`
      })()
    : '-'

  const isLocked = record.status === 3

  return (
    <div className="rounded-lg border bg-white p-5 space-y-4 max-w-2xl">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-gray-800">เดือน {monthLabel}</h2>
        {statusBadge(record.status)}
      </div>

      {/* Overdue alert */}
      {record.isOverdue && record.status < 2 && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          เกินกำหนดส่ง (ควรส่งภายในวันที่ 5 ของเดือนถัดไป)
        </div>
      )}

      {/* Confirmed info */}
      {record.status === 3 && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <span>
            ยืนยันรับแล้ว
            {record.submitted_at && ` — ส่งเมื่อ ${fmtDateTH(record.submitted_at)}`}
            {record.submitted_by_name && ` โดย ${record.submitted_by_name}`}
          </span>
        </div>
      )}

      {/* Status 2 info */}
      {record.status === 2 && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Send className="h-4 w-4 shrink-0 text-blue-500" />
          <span>
            ส่งรายงานแล้ว
            {record.submitted_at && ` — ${fmtDateTH(record.submitted_at)}`}
            {record.submitted_by_name && ` โดย ${record.submitted_by_name}`}
          </span>
        </div>
      )}

      {/* Checklist */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">รายการเอกสาร</h3>
        <div className="space-y-2">
          {checklist.length === 0 ? (
            <div className="text-xs text-gray-400">ไม่มีรายการ</div>
          ) : (
            checklist.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors',
                  isLocked ? 'cursor-default bg-gray-50' : 'cursor-pointer hover:bg-gray-50',
                  item.checked ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200',
                )}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onChecklistToggle(item.id)}
                  disabled={isLocked}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span>{item.label}</span>
                {item.checked && <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />}
              </label>
            ))
          )}
        </div>
      </div>

      {/* Note */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">หมายเหตุ</h3>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          disabled={isLocked}
          placeholder={isLocked ? '' : 'หมายเหตุเพิ่มเติม (ถ้ามี)'}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* G10: ผอ.ลงนามประจำเดือน — แสดงเมื่อส่งแล้ว (status >= 2) */}
      {record.status >= 2 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <PenLine className="h-4 w-4 text-indigo-500" />
            ผอ.ลงนามสอบทานรายเดือน
          </h3>
          {auditStatus?.signed ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
              <span>
                ลงนามแล้ว
                {auditStatus.signed_name && ` — ${auditStatus.signed_name}`}
                {auditStatus.signed_at && ` (${fmtDateTH(auditStatus.signed_at)})`}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">ยังไม่ได้ลงนาม</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                onClick={() => record.submit_month && onSignMonthly(record.submit_month)}
                disabled={signingMonthly}
              >
                <PenLine className="h-3.5 w-3.5" />
                {signingMonthly ? 'กำลังลงนาม...' : 'ลงนามสอบทาน'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {record.status === 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting || saving}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
            </Button>
          </>
        )}

        {record.status === 2 && (
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={confirming}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {confirming ? 'กำลังยืนยัน...' : 'ยืนยันรับ'}
          </Button>
        )}

        {record.status === 3 && (
          <div className="text-sm text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            รายการนี้ถูกล็อกแล้ว
          </div>
        )}
      </div>
    </div>
  )
}
