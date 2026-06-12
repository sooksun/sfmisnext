'use client'
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Bot,
  PenLine,
  Sparkles,
  ShieldCheck,
  Send,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/ui/export-button'
import { AttachmentPanel } from '@/components/shared/attachment-panel'
import { apiGet, apiPost } from '@/lib/api'
import { exportSheets } from '@/lib/export-xlsx'
import { openPrintWindow, makeHeader, esc } from '@/lib/print-utils'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'
import { Printer } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Answer = 'yes' | 'no' | 'na'

interface AssessItem {
  item_code: string
  topic_no: number
  label: string
  weight: number
  mode: 'auto' | 'prefill' | 'manual'
  na_allowed: boolean
  evidence: string | null
  answer: Answer
  score: number
  auto_result: string | null
  auto_detail: string | null
  attachment_id: number | null
  note: string | null
}
interface AssessTopic {
  no: number
  name: string
  max: number
  earned: number
  possible: number
}
interface AssessHead {
  fa_id: number
  sc_id: number
  sy_id: number
  budget_year: string | null
  as_of_date: string | null
  student_count: number
  total_score: number
  max_score: number
  percent: number
  level: number
  level_label: string
  status: number
  note: string | null
  plan_committee_date: string | null
  plan_committee_doc_no: string | null
}
interface AssessView {
  head: AssessHead
  topics: AssessTopic[]
  items: AssessItem[]
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LEVEL_STYLE: Record<number, { bg: string; text: string; ring: string }> = {
  4: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-300' },
  3: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-300' },
  2: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-300' },
  1: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' },
}

function modeBadge(mode: AssessItem['mode']) {
  if (mode === 'auto')
    return (
      <Badge variant="default" className="gap-1 bg-violet-100 text-violet-700">
        <Bot className="h-3 w-3" /> ระบบตรวจให้
      </Badge>
    )
  if (mode === 'prefill')
    return (
      <Badge variant="warning" className="gap-1">
        <Sparkles className="h-3 w-3" /> ระบบเสนอ โปรดยืนยัน
      </Badge>
    )
  return (
    <Badge variant="outline" className="gap-1">
      <PenLine className="h-3 w-3" /> ยืนยันเอง
    </Badge>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SelfAssessmentPage() {
  const { scId, syId, budgetYear: budgetYearRaw, adminId, scName } = useAppContext()
  const budgetYear = String(budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543)
  const qc = useQueryClient()

  const queryKey = ['financial-assessment', scId, budgetYear]
  const { data, isLoading } = useQuery<AssessView>({
    queryKey,
    queryFn: () =>
      apiGet<AssessView>(`Financial_assessment/load/${scId}/${syId}/${budgetYear}`),
    enabled: scId > 0 && budgetYearRaw > 0,
  })

  // local draft of answers/notes
  const [draft, setDraft] = useState<Record<string, { answer: Answer; note: string }>>({})
  const [asOf, setAsOf] = useState<string>('')
  const [studentCount, setStudentCount] = useState<string>('')

  const locked = (data?.head.status ?? 1) >= 2

  const itemState = useCallback(
    (it: AssessItem): { answer: Answer; note: string } =>
      draft[it.item_code] ?? { answer: it.answer, note: it.note ?? '' },
    [draft],
  )

  // คำนวณคะแนนสด (preview) จาก draft
  const live = useMemo(() => {
    if (!data) return null
    let total = 0
    let max = 0
    const perTopic: Record<number, { earned: number; possible: number }> = {}
    for (const it of data.items) {
      const ans = itemState(it).answer
      if (!perTopic[it.topic_no]) perTopic[it.topic_no] = { earned: 0, possible: 0 }
      if (ans === 'na') continue
      max += it.weight
      perTopic[it.topic_no].possible += it.weight
      if (ans === 'yes') {
        total += it.weight
        perTopic[it.topic_no].earned += it.weight
      }
    }
    const percent = max > 0 ? Math.round(((total / max) * 100 + Number.EPSILON) * 100) / 100 : 0
    const level = percent >= 85 ? 4 : percent >= 70 ? 3 : percent >= 60 ? 2 : 1
    const levelLabel = ['', 'ปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก'][level]
    return { total: round2(total), max: round2(max), percent, level, levelLabel, perTopic }
  }, [data, itemState])

  const saveMut = useMutation({
    mutationFn: () =>
      apiPost('Financial_assessment/save', {
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        as_of_date: asOf || data?.head.as_of_date || undefined,
        student_count: studentCount ? Number(studentCount) : data?.head.student_count,
        items: Object.entries(draft).map(([code, v]) => ({
          item_code: code,
          answer: v.answer,
          note: v.note,
        })),
        up_by: adminId,
      }),
    onSuccess: (r: unknown) => {
      const res = r as { flag: boolean; ms: string }
      if (res.flag) {
        toast.success(res.ms)
        setDraft({})
        qc.invalidateQueries({ queryKey })
      } else toast.error(res.ms)
    },
    onError: () => toast.error('บันทึกไม่สำเร็จ'),
  })

  const confirmMut = useMutation({
    mutationFn: () =>
      apiPost('Financial_assessment/confirm', { fa_id: data!.head.fa_id, up_by: adminId }),
    onSuccess: (r: unknown) => {
      const res = r as { flag: boolean; ms: string }
      res.flag ? toast.success(res.ms) : toast.error(res.ms)
      qc.invalidateQueries({ queryKey })
    },
  })

  const submitMut = useMutation({
    mutationFn: () =>
      apiPost(`Financial_assessment/markSubmitted/${data!.head.fa_id}`, {}),
    onSuccess: (r: unknown) => {
      const res = r as { flag: boolean; ms: string }
      res.flag ? toast.success(res.ms) : toast.error(res.ms)
      qc.invalidateQueries({ queryKey })
    },
  })

  const autoMut = useMutation({
    mutationFn: () => apiPost(`Financial_assessment/runAuto/${data!.head.fa_id}`, {}),
    onSuccess: (r: unknown) => {
      const res = r as { flag: boolean; ms: string }
      if (res.flag) {
        toast.success(res.ms)
        setDraft({})
        qc.invalidateQueries({ queryKey })
      } else toast.error(res.ms)
    },
    onError: () => toast.error('ประเมินอัตโนมัติไม่สำเร็จ'),
  })

  const [committeeDate, setCommitteeDate] = useState<string>('')
  const [committeeDoc, setCommitteeDoc] = useState<string>('')
  const attestMut = useMutation({
    mutationFn: () =>
      apiPost('Financial_assessment/saveAttestation', {
        sc_id: scId,
        sy_id: syId,
        budget_year: budgetYear,
        plan_committee_date: committeeDate || data?.head.plan_committee_date || null,
        plan_committee_doc_no: committeeDoc || data?.head.plan_committee_doc_no || null,
        up_by: adminId,
      }),
    onSuccess: (r: unknown) => {
      const res = r as { flag: boolean; ms: string }
      res.flag ? toast.success(res.ms) : toast.error(res.ms)
      qc.invalidateQueries({ queryKey })
    },
  })

  const setAnswer = (it: AssessItem, answer: Answer) => {
    if (locked) return
    setDraft((d) => ({ ...d, [it.item_code]: { answer, note: itemState(it).note } }))
  }
  const setNote = (it: AssessItem, note: string) => {
    if (locked) return
    setDraft((d) => ({ ...d, [it.item_code]: { answer: itemState(it).answer, note } }))
  }

  const ansText = (a: Answer) =>
    a === 'yes' ? 'มี/ใช่' : a === 'na' ? 'N/A' : 'ไม่มี/ไม่ใช่'

  // Export Excel: ชีต 1 = แบบ 2544-2 (ให้คะแนนรายข้อ), ชีต 2 = แบบ 2544-3 (สรุปรายประเด็น)
  const handleExport = () => {
    if (!data) return
    const sheet2: Record<string, unknown>[] = []
    for (const t of data.topics) {
      for (const it of data.items.filter((i) => i.topic_no === t.no)) {
        const st = itemState(it)
        sheet2.push({
          ข้อ: it.item_code,
          รายการ: it.label,
          คะแนนเต็ม: it.weight,
          ผล: ansText(st.answer),
          คะแนนที่ได้: st.answer === 'yes' ? it.weight : st.answer === 'na' ? 'N/A' : 0,
          บันทึกเพิ่มเติม: st.note ?? '',
        })
      }
    }
    sheet2.push({
      ข้อ: '',
      รายการ: 'รวมทั้งสิ้น',
      คะแนนเต็ม: live?.max ?? 100,
      ผล: `ระดับ ${live?.levelLabel ?? ''}`,
      คะแนนที่ได้: live?.total ?? 0,
      บันทึกเพิ่มเติม: `${live?.percent ?? 0}%`,
    })

    const sheet3 = data.topics.map((t) => ({
      ประเด็น: `${t.no}. ${t.name}`,
      คะแนนเต็ม: t.max,
      คะแนนที่ได้: round2(live?.perTopic[t.no]?.earned ?? 0),
    }))
    sheet3.push({
      ประเด็น: `รวม (ระดับ ${live?.levelLabel ?? ''} · ${live?.percent ?? 0}%)`,
      คะแนนเต็ม: live?.max ?? 100,
      คะแนนที่ได้: live?.total ?? 0,
    })

    exportSheets(
      [
        { name: 'แบบ 2544-2', rows: sheet2 },
        { name: 'แบบ 2544-3', rows: sheet3 },
      ],
      `ประเมินตนเอง_2544_${budgetYear}`,
    )
  }

  // พิมพ์แบบ 2544-2 (ให้คะแนนรายข้อ) + แบบ 2544-3 (สรุปรายประเด็น) เป็น PDF ชุดเดียว
  const handlePrint23 = () => {
    if (!data) return
    // ── แบบ 2544-2: ตารางรายข้อ จัดกลุ่มตามประเด็น + รวมท้ายประเด็น ──
    let body2 = ''
    for (const t of data.topics) {
      const items = data.items.filter((i) => i.topic_no === t.no)
      const rows = items
        .map((it) => {
          const st = itemState(it)
          const got =
            st.answer === 'yes' ? it.weight : st.answer === 'na' ? 'N/A' : 0
          return `<tr>
            <td class="center" style="width:8%">${esc(it.item_code)}</td>
            <td>${esc(it.label)}</td>
            <td class="num" style="width:10%">${it.weight}</td>
            <td class="center" style="width:11%">${esc(ansText(st.answer))}</td>
            <td class="num" style="width:10%">${got}</td>
          </tr>`
        })
        .join('')
      const earned = round2(live?.perTopic[t.no]?.earned ?? 0)
      body2 += `<table><thead>
        <tr><th colspan="5" style="text-align:left">${esc(`${t.no}. ${t.name}`)}</th></tr>
        <tr><th>ข้อ</th><th>รายการ</th><th>คะแนนเต็ม</th><th>ผล</th><th>คะแนนที่ได้</th></tr>
        </thead><tbody>${rows}
        <tr><td colspan="2" class="right"><b>รวมประเด็นที่ ${t.no}</b></td>
        <td class="num"><b>${t.max}</b></td><td></td><td class="num"><b>${earned}</b></td></tr>
        </tbody></table>`
    }
    body2 += `<div class="meta" style="margin-top:4mm"><div><b>รวมทั้งสิ้น:</b> ${live?.total ?? 0} / ${live?.max ?? 100} คะแนน (${live?.percent ?? 0}%)</div><div><b>ระดับ:</b> ${live?.levelLabel ?? ''}</div></div>`

    // ── แบบ 2544-3: สรุปรายประเด็น (ขึ้นหน้าใหม่) ──
    const rows3 = data.topics
      .map((t) => {
        const earned = round2(live?.perTopic[t.no]?.earned ?? 0)
        const possible = round2(live?.perTopic[t.no]?.possible ?? t.max)
        return `<tr>
          <td>${esc(`${t.no}. ${t.name}`)}</td>
          <td class="num">${t.max}</td>
          <td class="num">${possible}</td>
          <td class="num">${earned}</td>
        </tr>`
      })
      .join('')
    const body3 = `
      <div style="page-break-before: always"></div>
      ${makeHeader({
        title: 'แบบรายงานผลการประเมินการปฏิบัติงาน (แบบ 2544-3)',
        subtitle: `ด้านการเงิน การบัญชีของสถานศึกษาที่ปฏิบัติตามระบบควบคุมทางการเงินของหน่วยงานย่อย พ.ศ. 2544 · ปีงบประมาณ พ.ศ. ${budgetYear}`,
        scName: scName || undefined,
        docDate: data.head.as_of_date || undefined,
      })}
      <table><thead>
        <tr><th>ประเด็นการประเมิน</th><th>คะแนนเต็ม</th><th>ฐานคะแนน (หลังตัด N/A)</th><th>คะแนนที่ได้</th></tr>
      </thead><tbody>${rows3}
        <tr><td class="right"><b>รวมทั้งสิ้น</b></td>
        <td class="num"><b>100</b></td>
        <td class="num"><b>${live?.max ?? 100}</b></td>
        <td class="num"><b>${live?.total ?? 0}</b></td></tr>
      </tbody></table>
      <div class="meta" style="margin-top:4mm">
        <div><b>คิดเป็นร้อยละ:</b> ${live?.percent ?? 0}%</div>
        <div><b>ผลการประเมินการปฏิบัติงานอยู่ในระดับ:</b> ${live?.levelLabel ?? ''} (${live?.level ?? 1})</div>
      </div>
      <div class="sign-row">
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">(..............................................)</div><div class="sign-label">ผู้ประเมิน</div></div>
        <div class="sign-box"><div class="sign-line"></div><div class="sign-label">(..............................................)</div><div class="sign-label">ผู้อำนวยการสถานศึกษา</div></div>
      </div>`

    openPrintWindow({
      title: `แบบ2544-2-3_${budgetYear}`,
      body:
        makeHeader({
          title: 'แบบสรุปผลการประเมินการปฏิบัติงาน (แบบ 2544-2)',
          subtitle: `ด้านการเงิน การบัญชีของสถานศึกษาที่ปฏิบัติตามระบบควบคุมทางการเงินของหน่วยงานย่อย พ.ศ. 2544 · ปีงบประมาณ พ.ศ. ${budgetYear} · จำนวนนักเรียน ${data.head.student_count || '-'} คน`,
          scName: scName || undefined,
          docDate: data.head.as_of_date || undefined,
        }) +
        body2 +
        body3,
      paper: 'A4',
    })
  }

  // พิมพ์แบบ 2544-1 (Checklist A4)
  const handlePrint = () => {
    if (!data) return
    const cell = (a: Answer, want: Answer) =>
      a === want ? '<td class="center">✓</td>' : '<td class="center"></td>'
    let bodyTables = ''
    for (const t of data.topics) {
      const items = data.items.filter((i) => i.topic_no === t.no)
      const rows = items
        .map((it) => {
          const st = itemState(it)
          return `<tr>
            <td class="center">${esc(it.item_code)}</td>
            <td>${esc(it.label)}</td>
            ${cell(st.answer, 'yes')}${cell(st.answer, 'no')}${cell(st.answer, 'na')}
            <td>${esc(st.note ?? '')}</td>
          </tr>`
        })
        .join('')
      bodyTables += `<table><thead>
        <tr><th colspan="6" style="text-align:left">${esc(t.no + '. ' + t.name)} (เต็ม ${t.max} คะแนน)</th></tr>
        <tr><th style="width:8%">ข้อ</th><th>รายการ</th><th style="width:7%">มี/ใช่</th><th style="width:7%">ไม่มี</th><th style="width:7%">N/A</th><th style="width:22%">บันทึกเพิ่มเติม</th></tr>
        </thead><tbody>${rows}</tbody></table>`
    }
    const summary = `<div class="meta" style="margin-top:6mm"><div><b>คะแนนรวม:</b> ${live?.total ?? 0} / ${live?.max ?? 100} (${live?.percent ?? 0}%)</div><div><b>ผลการประเมินอยู่ในระดับ:</b> ${live?.levelLabel ?? ''}</div></div>`
    const signs = `<div class="sign-row">
      <div class="sign-box"><div class="sign-line"></div><div class="sign-label">(..............................................)</div><div class="sign-label">ผู้ประเมิน</div></div>
      <div class="sign-box"><div class="sign-line"></div><div class="sign-label">(..............................................)</div><div class="sign-label">ผู้ประเมิน</div></div>
    </div>
    <div class="sign-row"><div class="sign-box"><div class="sign-line"></div><div class="sign-label">(..............................................)</div><div class="sign-label">ผู้อำนวยการสถานศึกษา</div></div></div>`
    openPrintWindow({
      title: `แบบ2544-1_${budgetYear}`,
      body:
        makeHeader({
          title: 'แบบประเมินการปฏิบัติงานด้านการเงิน การบัญชีของสถานศึกษา (แบบ 2544-1)',
          subtitle: `ที่ปฏิบัติตามระบบควบคุมทางการเงินของหน่วยงานย่อย พ.ศ. 2544 · ประจำปีงบประมาณ พ.ศ. ${budgetYear}`,
          scName: scName || undefined,
          docDate: data.head.as_of_date || undefined,
        }) +
        bodyTables +
        summary +
        signs,
      paper: 'A4',
    })
  }

  if (!scId || !budgetYearRaw)
    return <div className="p-6 text-gray-500">กรุณาเลือกปีงบประมาณก่อน</div>
  if (isLoading || !data) return <div className="p-6 text-gray-500">กำลังโหลด…</div>

  const ls = LEVEL_STYLE[live?.level ?? 1]
  const hasDraft = Object.keys(draft).length > 0

  return (
    <div className="pb-20">
      <PageHeader
        title="ประเมินตนเองด้านการเงิน การบัญชี (แบบ 2544)"
        subtitle={`ระบบควบคุมทางการเงินของหน่วยงานย่อย พ.ศ. 2544 · ปีงบประมาณ ${budgetYear}`}
        actions={
          <div className="flex items-center gap-2">
            {!locked && (
              <Button
                variant="outline"
                onClick={() => autoMut.mutate()}
                disabled={autoMut.isPending}
                className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                <Bot className="h-4 w-4" /> คำนวณอัตโนมัติ
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" /> PDF 2544-1
            </Button>
            <Button variant="outline" onClick={handlePrint23} className="gap-1.5">
              <Printer className="h-4 w-4" /> PDF 2544-2+3
            </Button>
            <ExportButton onExport={handleExport} label="Excel 2544-2/3" />
            {!locked && (
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !hasDraft}>
                บันทึก
              </Button>
            )}
          </div>
        }
      />

      <div className="px-3 sm:px-5 space-y-5">
        {/* สรุปคะแนน */}
        <div
          className={cn(
            'rounded-xl ring-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4',
            ls.bg,
            ls.ring,
          )}
        >
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-extrabold', ls.text)}>
              {live?.total ?? 0}
            </span>
            <span className="text-gray-500">/ {live?.max ?? 100} คะแนน</span>
          </div>
          <div className={cn('text-lg font-bold', ls.text)}>
            {live?.percent ?? 0}% · ระดับ{live?.levelLabel}
          </div>
          <div className="flex-1" />
          {locked ? (
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {data.head.status === 3 ? 'ส่งเขตแล้ว' : 'ยืนยันแล้ว'}
            </Badge>
          ) : (
            <Badge variant="outline">ร่าง</Badge>
          )}
        </div>

        {/* meta */}
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm">
            <span className="block text-gray-500 mb-1">เพียงวันที่</span>
            <Input
              type="date"
              disabled={locked}
              defaultValue={data.head.as_of_date ?? ''}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-44"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-500 mb-1">จำนวนนักเรียน (คน)</span>
            <Input
              type="number"
              disabled={locked}
              defaultValue={data.head.student_count || ''}
              onChange={(e) => setStudentCount(e.target.value)}
              className="w-32"
            />
          </label>
        </div>

        {/* ข้อ 1.4 — ความเห็นชอบแผนจาก กก.สถานศึกษา (แหล่งข้อมูลให้ระบบประเมินอัตโนมัติ) */}
        <div className="rounded-lg border border-dashed bg-gray-50/60 p-3 flex flex-wrap gap-3 items-end">
          <div className="text-sm text-gray-600 w-full sm:w-auto sm:mr-2">
            <span className="font-semibold">ข้อ 1.4</span> ความเห็นชอบแผนจาก กก.สถานศึกษา
          </div>
          <label className="text-sm">
            <span className="block text-gray-500 mb-1">วันที่เห็นชอบ</span>
            <Input
              type="date"
              disabled={locked}
              defaultValue={data.head.plan_committee_date ?? ''}
              onChange={(e) => setCommitteeDate(e.target.value)}
              className="w-44"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-500 mb-1">เลขที่หนังสือ/มติ</span>
            <Input
              disabled={locked}
              defaultValue={data.head.plan_committee_doc_no ?? ''}
              onChange={(e) => setCommitteeDoc(e.target.value)}
              className="w-48"
              placeholder="เช่น ๑/๒๕๖๙"
            />
          </label>
          {!locked && (
            <Button
              variant="outline"
              onClick={() => attestMut.mutate()}
              disabled={attestMut.isPending}
            >
              บันทึก แล้วคำนวณใหม่
            </Button>
          )}
        </div>

        {/* ประเด็น + ข้อ */}
        {data.topics.map((t) => {
          const items = data.items.filter((i) => i.topic_no === t.no)
          const pt = live?.perTopic[t.no]
          return (
            <div key={t.no} className="rounded-xl border bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                <h3 className="font-bold text-gray-800">
                  {t.no}. {t.name}
                </h3>
                <span className="text-sm font-semibold text-gray-600">
                  {round2(pt?.earned ?? 0)} / {t.max} คะแนน
                </span>
              </div>
              <div className="divide-y">
                {items.map((it) => {
                  const st = itemState(it)
                  return (
                    <div key={it.item_code} className="p-3 sm:px-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono font-bold text-gray-400">
                              {it.item_code}
                            </span>
                            {modeBadge(it.mode)}
                            <span className="text-xs text-gray-400">({it.weight} คะแนน)</span>
                            {it.evidence && (
                              <Link
                                href={it.evidence}
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                ดูหลักฐาน <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{it.label}</p>
                          {it.auto_detail && (
                            <p
                              className={cn(
                                'mt-1 text-xs inline-flex items-start gap-1 rounded px-1.5 py-0.5',
                                it.auto_result === 'yes'
                                  ? 'bg-green-50 text-green-700'
                                  : it.auto_result === 'no'
                                    ? 'bg-red-50 text-red-700'
                                    : it.auto_result === 'na'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-amber-50 text-amber-700',
                              )}
                            >
                              <Bot className="h-3 w-3 mt-0.5 shrink-0" />
                              {it.auto_detail}
                            </p>
                          )}
                          {!locked && (
                            <Textarea
                              placeholder="บันทึกเพิ่มเติม…"
                              value={st.note}
                              onChange={(e) => setNote(it, e.target.value)}
                              className="mt-2 text-sm min-h-[36px]"
                              rows={1}
                            />
                          )}
                          {locked && st.note && (
                            <p className="mt-1 text-xs text-gray-500">📝 {st.note}</p>
                          )}
                        </div>
                        {/* answer toggle */}
                        <div className="flex gap-1 shrink-0">
                          <AnswerBtn
                            active={st.answer === 'yes'}
                            onClick={() => setAnswer(it, 'yes')}
                            color="green"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                            label="มี/ใช่"
                            disabled={locked}
                          />
                          <AnswerBtn
                            active={st.answer === 'no'}
                            onClick={() => setAnswer(it, 'no')}
                            color="red"
                            icon={<XCircle className="h-4 w-4" />}
                            label="ไม่มี"
                            disabled={locked}
                          />
                          {it.na_allowed && (
                            <AnswerBtn
                              active={st.answer === 'na'}
                              onClick={() => setAnswer(it, 'na')}
                              color="gray"
                              icon={<MinusCircle className="h-4 w-4" />}
                              label="N/A"
                              disabled={locked}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* เอกสาร/หลักฐานประกอบการประเมิน */}
        <AttachmentPanel
          refType="fin_assessment"
          refId={data.head.fa_id}
          scId={scId}
          title="เอกสาร/หลักฐานประกอบการประเมิน (แนบรวม)"
          readOnly={locked}
        />

        {/* actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          {!locked && (
            <Button
              variant="outline"
              onClick={() => confirmMut.mutate()}
              disabled={confirmMut.isPending || hasDraft}
              className="gap-1.5"
              title={hasDraft ? 'บันทึกก่อนยืนยัน' : ''}
            >
              <ShieldCheck className="h-4 w-4" /> ยืนยันผล (ผอ.)
            </Button>
          )}
          {data.head.status === 2 && (
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="gap-1.5">
              <Send className="h-4 w-4" /> ทำเครื่องหมายส่งเขตแล้ว
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function AnswerBtn({
  active,
  onClick,
  color,
  icon,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  color: 'green' | 'red' | 'gray'
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  const palette = {
    green: active ? 'bg-green-600 text-white border-green-600' : 'text-green-700 border-green-200 hover:bg-green-50',
    red: active ? 'bg-red-600 text-white border-red-600' : 'text-red-700 border-red-200 hover:bg-red-50',
    gray: active ? 'bg-gray-600 text-white border-gray-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50',
  }[color]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-lg border text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed',
        palette,
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
