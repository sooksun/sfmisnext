'use client'
import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, Send, AlertTriangle, Printer } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/ui/export-button'
import { apiGet } from '@/lib/api'
import { exportSheets } from '@/lib/export-xlsx'
import { openPrintWindow, makeHeader, esc } from '@/lib/print-utils'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ItemDef {
  code: string
  topic: number
  weight: number
}
interface TopicDef {
  no: number
  name: string
  max: number
}
interface DistrictRow {
  sc_id: number
  sc_name: string
  student_count: number
  school_size: string
  has_assessment: boolean
  status: number // 0=ไม่มี 1=ร่าง 2=ยืนยัน 3=ส่งเขต
  total_score: number
  max_score: number
  percent: number
  level: number
  level_label: string
  topic_earned: Record<number, number>
  score_by_code: Record<string, number | 'NA'>
}
interface DistrictSummary {
  budget_year: string
  item_defs: ItemDef[]
  topics: TopicDef[]
  rows: DistrictRow[]
  summary: {
    total_schools: number
    evaluated: number
    submitted: number
    level_4: number
    level_3: number
    level_2: number
    level_1: number
    not_submitted: { sc_id: number; sc_name: string; status: number }[]
  }
}

const LEVEL_BADGE: Record<number, { label: string; cls: string }> = {
  4: { label: 'ดีมาก', cls: 'bg-green-100 text-green-700' },
  3: { label: 'ดี', cls: 'bg-blue-100 text-blue-700' },
  2: { label: 'พอใช้', cls: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'ปรับปรุง', cls: 'bg-red-100 text-red-700' },
  0: { label: 'ยังไม่ประเมิน', cls: 'bg-gray-100 text-gray-500' },
}
const STATUS_LABEL: Record<number, string> = {
  0: 'ยังไม่เริ่ม',
  1: 'ร่าง',
  2: 'ยืนยันแล้ว',
  3: 'ส่งเขตแล้ว',
}

export default function DistrictAssessmentPage() {
  const { budgetYear: budgetYearRaw, userType } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)

  const { data, isLoading } = useQuery<DistrictSummary>({
    queryKey: ['district-assessment', budgetYear],
    queryFn: () => apiGet<DistrictSummary>(`Financial_assessment/districtSummary/${budgetYear}`),
    enabled: budgetYearRaw > 0 && userType === 1,
  })

  const handleExport = () => {
    if (!data) return
    // ชีต 1: แบบ สพท. 2544 — คะแนนรายข้อครบ 52 ช่อง + รวมรายประเด็น + รวม + ระดับ
    const sheet1 = data.rows.map((r, idx) => {
      const row: Record<string, unknown> = {
        ลำดับที่: idx + 1,
        โรงเรียน: r.sc_name,
        จำนวนนักเรียน: r.student_count || '',
        ขนาดโรงเรียน: r.school_size,
      }
      for (const t of data.topics) {
        for (const d of data.item_defs.filter((i) => i.topic === t.no)) {
          const v = r.score_by_code[d.code]
          row[`ข้อ ${d.code}`] = v === undefined ? '' : v === 'NA' ? 'N/A' : v
        }
        row[`รวมประเด็น ${t.no}`] = r.has_assessment
          ? (r.topic_earned[t.no] ?? 0)
          : ''
      }
      row['คะแนนรวม'] = r.has_assessment ? r.total_score : ''
      row['ระดับ'] = r.level || ''
      row['ผลการประเมิน'] = r.has_assessment ? r.level_label : 'ไม่ได้จัดส่ง'
      row['สถานะ'] = STATUS_LABEL[r.status]
      return row
    })
    // ชีต 2: สรุปผลการประเมิน (ท้ายแบบ สพท.)
    const s = data.summary
    const sheet2: Record<string, unknown>[] = [
      { รายการ: '1. จำนวนโรงเรียนที่เป็นหน่วยงานย่อยในสังกัด', จำนวน: s.total_schools, หน่วย: 'แห่ง' },
      { รายการ: '2. จำนวนโรงเรียนที่มีการจัดส่งแบบประเมินตนเอง', จำนวน: s.evaluated, หน่วย: 'แห่ง' },
      { รายการ: '3.1 ระดับดีมาก', จำนวน: s.level_4, หน่วย: 'แห่ง' },
      { รายการ: '3.2 ระดับดี', จำนวน: s.level_3, หน่วย: 'แห่ง' },
      { รายการ: '3.3 ระดับพอใช้', จำนวน: s.level_2, หน่วย: 'แห่ง' },
      { รายการ: '3.4 ระดับปรับปรุง', จำนวน: s.level_1, หน่วย: 'แห่ง' },
      { รายการ: '4. จำนวนโรงเรียนที่ไม่ได้จัดส่งแบบประเมินตนเอง', จำนวน: s.not_submitted.length, หน่วย: 'แห่ง' },
      ...s.not_submitted.map((n, i) => ({
        รายการ: `   4.${i + 1} ${n.sc_name}`,
        จำนวน: '',
        หน่วย: STATUS_LABEL[n.status],
      })),
    ]
    exportSheets(
      [
        { name: 'แบบ สพท. 2544', rows: sheet1 },
        { name: 'สรุปผลการประเมิน', rows: sheet2 },
      ],
      `แบบสพท2544_${budgetYear}`,
    )
  }

  // พิมพ์แบบ สพท. 2544 เป็น PDF (A4 แนวนอน — คะแนนรวมรายประเด็น + สรุปท้ายแบบ)
  const handlePrint = () => {
    if (!data) return
    const s = data.summary
    const rows = data.rows
      .map((r, idx) => {
        const cells = data.topics
          .map(
            (t) =>
              `<td class="num">${r.has_assessment ? (r.topic_earned[t.no] ?? 0) : '-'}</td>`,
          )
          .join('')
        return `<tr>
          <td class="center">${idx + 1}</td>
          <td>${esc(r.sc_name)}</td>
          <td class="num">${r.student_count || '-'}</td>
          <td class="center">${esc(r.school_size)}</td>
          ${cells}
          <td class="num"><b>${r.has_assessment ? r.total_score : '-'}</b></td>
          <td class="center">${r.level || '-'}</td>
          <td class="center">${r.has_assessment ? esc(r.level_label) : 'ไม่ได้จัดส่ง'}</td>
        </tr>`
      })
      .join('')
    const topicHead = data.topics
      .map((t) => `<th title="${esc(t.name)}">${t.no}<br/><span style="font-weight:normal">(${t.max})</span></th>`)
      .join('')
    const notSent = s.not_submitted.length
      ? `<p style="margin-top:3mm"><b>4. โรงเรียนที่ไม่ได้จัดส่งแบบประเมินตนเอง จำนวน ${s.not_submitted.length} แห่ง:</b> ${s.not_submitted.map((n, i) => `${i + 1}) ${esc(n.sc_name)}`).join(' ')}</p>`
      : ''
    openPrintWindow({
      title: `แบบสพท2544_${budgetYear}`,
      body:
        makeHeader({
          title: 'แบบสังเคราะห์ผลการประเมินการปฏิบัติงาน (แบบ สพท. 2544)',
          subtitle: `ด้านการเงิน การบัญชีของสถานศึกษาที่ปฏิบัติตามระบบควบคุมทางการเงินของหน่วยงานย่อย พ.ศ. 2544 · ปีงบประมาณ พ.ศ. ${budgetYear}`,
        }) +
        `<table><thead>
          <tr><th>ลำดับ</th><th>โรงเรียน</th><th>นักเรียน</th><th>ขนาด</th>${topicHead}<th>รวม<br/>(100)</th><th>ระดับ</th><th>ผลการประเมิน</th></tr>
        </thead><tbody>${rows}</tbody></table>
        <div style="margin-top:5mm; font-size:14pt">
          <p><b>สรุปผลการประเมิน</b></p>
          <p>1. จำนวนโรงเรียนที่เป็นหน่วยงานย่อยในสังกัด จำนวน ${s.total_schools} แห่ง</p>
          <p>2. จำนวนโรงเรียนที่มีการจัดส่งแบบประเมินตนเอง จำนวน ${s.evaluated} แห่ง</p>
          <p>3. ผลการประเมินตนเองของโรงเรียนในสังกัด:
            ระดับดีมาก ${s.level_4} แห่ง · ระดับดี ${s.level_3} แห่ง ·
            ระดับพอใช้ ${s.level_2} แห่ง · ระดับปรับปรุง ${s.level_1} แห่ง</p>
          ${notSent}
        </div>
        <p class="footer-note">หมายเหตุ: คะแนนรายข้อครบ 52 ช่องตามแบบ สพท. 2544 อยู่ในไฟล์ Excel ที่ส่งออกจากระบบ</p>`,
      paper: 'A4 landscape',
    })
  }

  if (userType !== 1)
    return (
      <div className="p-6 text-gray-500">
        หน้านี้สำหรับผู้ดูแลระบบ/เขตพื้นที่การศึกษาเท่านั้น
      </div>
    )
  if (isLoading || !data) return <div className="p-6 text-gray-500">กำลังโหลด…</div>

  const s = data.summary

  return (
    <div className="pb-16">
      <PageHeader
        title="แบบ สพท. 2544 — สังเคราะห์ผลการประเมินระดับเขต"
        subtitle={`ผลการประเมินตนเองด้านการเงิน การบัญชีของสถานศึกษาในสังกัด · ปีงบประมาณ ${budgetYear}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" /> PDF แบบ สพท.
            </Button>
            <ExportButton onExport={handleExport} label="Excel แบบ สพท." />
          </div>
        }
      />

      <div className="px-3 sm:px-5 space-y-5">
        {/* สรุปผล */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<Building2 className="h-4 w-4" />} label="โรงเรียนในสังกัด" value={s.total_schools} cls="text-gray-700" />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="ประเมินแล้ว" value={s.evaluated} cls="text-indigo-700" />
          <StatCard label="ดีมาก" value={s.level_4} cls="text-green-700" />
          <StatCard label="ดี" value={s.level_3} cls="text-blue-700" />
          <StatCard label="พอใช้" value={s.level_2} cls="text-yellow-700" />
          <StatCard label="ปรับปรุง" value={s.level_1} cls="text-red-700" />
        </div>

        {/* ตารางรายโรงเรียน */}
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">โรงเรียน</th>
                <th className="px-2 py-2 text-right">นักเรียน</th>
                <th className="px-2 py-2 text-center">ขนาด</th>
                {data.topics.map((t) => (
                  <th key={t.no} className="px-2 py-2 text-right" title={t.name}>
                    {t.no} <span className="text-gray-400">/{t.max}</span>
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-bold">รวม</th>
                <th className="px-2 py-2 text-right">%</th>
                <th className="px-2 py-2 text-center">ระดับ</th>
                <th className="px-2 py-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((r, idx) => {
                const lb = LEVEL_BADGE[r.level] ?? LEVEL_BADGE[0]
                return (
                  <tr key={r.sc_id} className={cn(!r.has_assessment && 'bg-gray-50/60 text-gray-400')}>
                    <td className="px-3 py-1.5">{idx + 1}</td>
                    <td className="px-3 py-1.5 font-medium">{r.sc_name}</td>
                    <td className="px-2 py-1.5 text-right">{r.student_count || '-'}</td>
                    <td className="px-2 py-1.5 text-center">{r.school_size}</td>
                    {data.topics.map((t) => (
                      <td key={t.no} className="px-2 py-1.5 text-right tabular-nums">
                        {r.has_assessment ? (r.topic_earned[t.no] ?? 0) : '-'}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">
                      {r.has_assessment ? r.total_score : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.has_assessment ? `${r.percent}%` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', lb.cls)}>
                        {lb.label}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {r.status === 3 ? (
                        <Badge variant="success" className="gap-1"><Send className="h-3 w-3" />ส่งแล้ว</Badge>
                      ) : (
                        <span className="text-xs text-gray-500">{STATUS_LABEL[r.status]}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* โรงเรียนที่ยังไม่ส่ง */}
        {s.not_submitted.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-amber-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              โรงเรียนที่ยังไม่จัดส่งแบบประเมินตนเอง ({s.not_submitted.length} แห่ง)
            </div>
            <ul className="text-sm text-amber-700 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
              {s.not_submitted.map((n, i) => (
                <li key={n.sc_id}>
                  {i + 1}. {n.sc_name}{' '}
                  <span className="text-amber-500">({STATUS_LABEL[n.status]})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  cls,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  cls: string
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {icon}
        {label}
      </div>
      <div className={cn('text-2xl font-extrabold tabular-nums', cls)}>{value}</div>
    </div>
  )
}
