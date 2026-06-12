'use client'
import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/api'
import { fmtDateTH, cn } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

interface LogRow {
  al_id: string
  admin_id: number
  admin_name: string | null
  role: number
  action: string
  module: string | null
  method: string | null
  route: string | null
  entity_id: string | null
  summary: string | null
  detail_json: string | null
  success: number
  ip: string | null
  cre_date: string | null
}
interface ListResp {
  data: LogRow[]
  count: number
  page: number
  pageSize: number
}
interface Facets {
  modules: string[]
  actions: string[]
}

const ACTION_CLS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  approve: 'bg-violet-100 text-violet-700',
  confirm: 'bg-indigo-100 text-indigo-700',
  export: 'bg-amber-100 text-amber-700',
  login: 'bg-gray-100 text-gray-600',
  action: 'bg-gray-100 text-gray-600',
}
const ACTION_TH: Record<string, string> = {
  create: 'สร้าง',
  update: 'แก้ไข',
  delete: 'ลบ',
  approve: 'อนุมัติ',
  confirm: 'ยืนยัน',
  export: 'ส่งออก',
  login: 'เข้าระบบ',
  action: 'ดำเนินการ',
}
const ROLE_TH: Record<number, string> = {
  1: 'Super', 2: 'ผอ.', 3: 'จนท.แผน', 4: 'จนท.พัสดุ', 5: 'จนท.การเงิน', 6: 'หน.แผน', 7: 'หน.พัสดุ', 8: 'หน.การเงิน',
}

export default function ActivityLogPage() {
  const { scId, userType } = useAppContext()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [module, setModule] = useState('')
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detail, setDetail] = useState<LogRow | null>(null)

  const { data: facets } = useQuery<Facets>({
    queryKey: ['activity-facets', scId],
    queryFn: () => apiGet<Facets>(`Activity_log/facets/${scId}`),
    enabled: scId > 0 && (userType === 1 || userType === 2),
  })

  const params = new URLSearchParams({
    sc_id: String(scId),
    page: String(page),
    pageSize: '50',
  })
  if (action) params.set('action', action)
  if (module) params.set('module', module)
  if (q) params.set('q', q)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)

  const { data, isLoading } = useQuery<ListResp>({
    queryKey: ['activity-log', scId, page, action, module, q, dateFrom, dateTo],
    queryFn: () => apiGet<ListResp>(`Activity_log/list?${params.toString()}`),
    enabled: scId > 0 && (userType === 1 || userType === 2),
    placeholderData: keepPreviousData,
  })

  if (userType !== 1 && userType !== 2)
    return <div className="p-6 text-gray-500">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</div>

  const rows = data?.data ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / data.pageSize)) : 1
  const resetPage = (fn: () => void) => { fn(); setPage(1) }

  return (
    <div className="pb-16">
      <PageHeader
        title="บันทึกกิจกรรม (Activity Log)"
        subtitle="ประวัติการทำงานทุกการบันทึก/แก้ไข/ลบ/อนุมัติในระบบ"
      />
      <div className="px-3 sm:px-5 space-y-4">
        {/* filters */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && resetPage(() => setQ(qInput))}
              placeholder="ค้นหา ผู้ใช้/รายละเอียด…"
              className="pl-8 w-56"
            />
          </div>
          <select value={action} onChange={(e) => resetPage(() => setAction(e.target.value))} className="h-9 rounded-md border border-gray-200 px-2 text-sm">
            <option value="">ทุกการกระทำ</option>
            {(facets?.actions ?? []).map((a) => <option key={a} value={a}>{ACTION_TH[a] ?? a}</option>)}
          </select>
          <select value={module} onChange={(e) => resetPage(() => setModule(e.target.value))} className="h-9 rounded-md border border-gray-200 px-2 text-sm max-w-44">
            <option value="">ทุกโมดูล</option>
            {(facets?.modules ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="text-sm">
            <span className="block text-gray-500 text-xs">ตั้งแต่</span>
            <Input type="date" value={dateFrom} onChange={(e) => resetPage(() => setDateFrom(e.target.value))} className="w-40" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-500 text-xs">ถึง</span>
            <Input type="date" value={dateTo} onChange={(e) => resetPage(() => setDateTo(e.target.value))} className="w-40" />
          </label>
        </div>

        <div className="text-xs text-gray-500">{data ? `พบ ${data.count.toLocaleString()} รายการ` : ''}</div>

        {/* table */}
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600 text-left">
                <th className="px-3 py-2">เวลา</th>
                <th className="px-3 py-2">ผู้ใช้</th>
                <th className="px-3 py-2">การกระทำ</th>
                <th className="px-3 py-2">โมดูล</th>
                <th className="px-3 py-2">รายละเอียด</th>
                <th className="px-2 py-2 text-center">ผล</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">กำลังโหลด…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">ไม่พบบันทึก</td></tr>
              ) : rows.map((r) => (
                <tr key={r.al_id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{fmtDateTH(r.cre_date)}</td>
                  <td className="px-3 py-1.5">
                    <div className="font-medium text-gray-800">{r.admin_name ?? `#${r.admin_id}`}</div>
                    <div className="text-xs text-gray-400">{ROLE_TH[r.role] ?? r.role}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', ACTION_CLS[r.action] ?? ACTION_CLS.action)}>
                      {ACTION_TH[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{r.module}{r.entity_id && <span className="text-gray-400"> #{r.entity_id}</span>}</td>
                  <td className="px-3 py-1.5 text-gray-500 max-w-xs truncate">{r.summary}</td>
                  <td className="px-2 py-1.5 text-center">
                    {r.success ? <CheckCircle2 className="h-4 w-4 text-green-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {r.detail_json && (
                      <button onClick={() => setDetail(r)} className="text-gray-400 hover:text-indigo-600"><Eye className="h-4 w-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">หน้า {page} / {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <History className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold">รายละเอียดกิจกรรม #{detail.al_id}</h3>
            </div>
            <dl className="text-sm space-y-1.5">
              <Row k="เวลา" v={fmtDateTH(detail.cre_date)} />
              <Row k="ผู้ใช้" v={`${detail.admin_name ?? detail.admin_id} (${ROLE_TH[detail.role] ?? detail.role})`} />
              <Row k="การกระทำ" v={`${ACTION_TH[detail.action] ?? detail.action} · ${detail.module ?? ''} ${detail.entity_id ? '#' + detail.entity_id : ''}`} />
              <Row k="เส้นทาง" v={`${detail.method} ${detail.route}`} />
              <Row k="IP" v={detail.ip ?? '-'} />
            </dl>
            <p className="text-xs text-gray-500 mt-3 mb-1">ข้อมูลที่ส่ง (ปิด field อ่อนไหวอัตโนมัติ):</p>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto whitespace-pre-wrap break-all">{prettyJson(detail.detail_json)}</pre>
            <div className="text-right mt-4">
              <Button variant="outline" onClick={() => setDetail(null)}>ปิด</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-500 w-20 shrink-0">{k}</dt>
      <dd className="text-gray-800 break-all">{v}</dd>
    </div>
  )
}
function prettyJson(s: string | null): string {
  if (!s) return '-'
  try { return JSON.stringify(JSON.parse(s.replace(/…$/, '')), null, 2) } catch { return s }
}
