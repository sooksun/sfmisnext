'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { apiGet } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SchoolOption { sc_id: number; sc_name: string }

interface PlanData {
  sc_id: number; sc_name: string; budget_year: number
  projects: any[]; orders: any[]; followups: any[]
  budget_summary: { total_budget: number; total_procurement: number; approved_procurement: number }
}
interface FinanceData {
  sc_id: number; sc_name: string; budget_year: number
  summary: { total_in: number; total_out: number; balance: number }
  by_type: { bg_type_id: number; bg_name: string; total_in: number; total_out: number }[]
  monthly: { ym: string; in: number; out: number }[]
  receives: { receive_id: number; receive_no: string; receive_date: string; amount: number }[]
  withdraws: { rw_id: number; rw_no: string; rw_date: string; rw_total: number; rw_status: number }[]
}
interface SupplyData {
  sc_id: number; sc_name: string; budget_year: number
  summary: { total_orders: number; total_budget: number; approved_budget: number; received_count: number }
  orders: { order_id: number; doc_no: string; order_status: number; budgets: number; order_date: string; details: string; job_type: number }[]
  receive_records: any[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtB = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const TH_MONTH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const fmtYM = (ym: string) => { const [y,m] = ym.split('-'); return `${TH_MONTH[+m-1]} ${+y+543}` }
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '-'

const PROJ_STATUS: Record<number,{l:string;c:string}> = {
  0:{l:'ร่าง',c:'bg-gray-100 text-gray-600'}, 1:{l:'รออนุมัติ',c:'bg-yellow-100 text-yellow-700'},
  2:{l:'อนุมัติ',c:'bg-blue-100 text-blue-700'}, 3:{l:'กำลังทำ',c:'bg-indigo-100 text-indigo-700'},
  4:{l:'รอตรวจสรุป',c:'bg-purple-100 text-purple-700'}, 5:{l:'ปิด',c:'bg-green-100 text-green-700'},
  6:{l:'ติดขัด',c:'bg-red-100 text-red-600'}, 9:{l:'ยกเลิก',c:'bg-gray-200 text-gray-500'},
}
const ORDER_STATUS: Record<number,{l:string;c:string}> = {
  100:{l:'ร่าง',c:'bg-gray-100 text-gray-500'}, 101:{l:'รอผอ.',c:'bg-yellow-100 text-yellow-700'},
  102:{l:'รออนุมัติ',c:'bg-orange-100 text-orange-700'}, 200:{l:'อนุมัติ',c:'bg-green-100 text-green-700'},
  201:{l:'รับของ',c:'bg-blue-100 text-blue-700'}, 299:{l:'ยกเลิก',c:'bg-red-100 text-red-500'},
}
const RW_STATUS: Record<number,string> = {
  0:'ร่าง', 1:'รออนุมัติ', 2:'อนุมัติ', 3:'จ่ายแล้ว', 100:'ยกเลิก',
}

const Badge = ({s,map}:{s:number;map:Record<number,{l:string;c:string}>}) => {
  const m = map[s] ?? {l:String(s),c:'bg-gray-100 text-gray-500'}
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.c}`}>{m.l}</span>
}

const TABS = ['แผนงาน/โครงการ','การเงิน','พัสดุ/จัดซื้อ'] as const
type Tab = typeof TABS[number]

// ── Component ─────────────────────────────────────────────────────────────────
export default function AreaSchoolReportPage() {
  const { userType, budgetYear: ctxYear } = useAppContext()
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [scId, setScId] = useState<number>(0)
  const [year, setYear] = useState<number>(0)
  const [tab, setTab] = useState<Tab>('แผนงาน/โครงการ')
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [finData, setFinData] = useState<FinanceData | null>(null)
  const [supData, setSupData] = useState<SupplyData | null>(null)
  const [loading, setLoading] = useState(false)

  // โหลดรายชื่อโรงเรียน
  useEffect(() => {
    apiGet<SchoolOption[]>('area/schools').then((list) => {
      setSchools(list)
      if (list.length) setScId(list[0].sc_id)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    setYear(ctxYear || new Date().getFullYear() + 543)
  }, [ctxYear])

  // โหลดข้อมูลตาม tab ที่เลือก
  const load = useCallback(async () => {
    if (!scId || !year) return
    setLoading(true)
    try {
      if (tab === 'แผนงาน/โครงการ') {
        const d = await apiGet<PlanData>(`area/school/${scId}/plan?budget_year=${year}`)
        setPlanData(d)
      } else if (tab === 'การเงิน') {
        const d = await apiGet<FinanceData>(`area/school/${scId}/finance?budget_year=${year}`)
        setFinData(d)
      } else {
        const d = await apiGet<SupplyData>(`area/school/${scId}/supply?budget_year=${year}`)
        setSupData(d)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [scId, year, tab])

  useEffect(() => { load() }, [load])

  if (userType !== 1 && userType !== 9) return <div className="p-6 text-red-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>

  const selectedSchool = schools.find(s => s.sc_id === scId)

  return (
    <div className="p-4 space-y-4">
      {/* Header + selectors */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">รายงานรายโรงเรียน</h1>
          {selectedSchool && <p className="text-sm text-gray-500 mt-0.5">{selectedSchool.sc_name} · ปีงบ {year}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-3 py-1.5 text-sm min-w-[200px]"
            value={scId}
            onChange={e => { setScId(Number(e.target.value)); setPlanData(null); setFinData(null); setSupData(null) }}
          >
            {schools.map(s => <option key={s.sc_id} value={s.sc_id}>{s.sc_name}</option>)}
          </select>
          <select
            className="border rounded px-3 py-1.5 text-sm"
            value={year}
            onChange={e => { setYear(Number(e.target.value)); setPlanData(null); setFinData(null); setSupData(null) }}
          >
            {[2569,2568,2567,2566].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400 py-4">กำลังโหลด...</p>}

      {/* Tab content */}
      {!loading && tab === 'แผนงาน/โครงการ' && planData && <PlanTab data={planData} />}
      {!loading && tab === 'การเงิน' && finData && <FinanceTab data={finData} />}
      {!loading && tab === 'พัสดุ/จัดซื้อ' && supData && <SupplyTab data={supData} />}
    </div>
  )
}

// ── Plan Tab ──────────────────────────────────────────────────────────────────
function PlanTab({ data }: { data: PlanData }) {
  const bs = data.budget_summary
  return (
    <div className="space-y-4">
      {/* สรุปงบ */}
      <div className="grid grid-cols-3 gap-3">
        <SCard label="งบโครงการรวม" val={fmtN(bs.total_budget)} sub="บาท" />
        <SCard label="วงเงินจัดซื้อรวม" val={fmtN(bs.total_procurement)} sub="บาท" color="text-orange-600" />
        <SCard label="อนุมัติจัดซื้อแล้ว" val={fmtN(bs.approved_procurement)} sub="บาท" color="text-green-600" />
      </div>

      {/* รายการโครงการ */}
      <Section title={`โครงการทั้งหมด (${data.projects.length} โครงการ)`}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">ชื่อโครงการ</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
              <th className="px-3 py-2 text-right">งบประมาณ</th>
              <th className="px-3 py-2 text-center">ความคืบหน้า</th>
              <th className="px-3 py-2 text-center">วันสิ้นสุด</th>
              <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.projects.map(p => (
              <tr key={p.proj_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[220px]"><p className="truncate font-medium">{p.proj_name}</p></td>
                <td className="px-3 py-2 text-center"><Badge s={p.proj_status} map={PROJ_STATUS} /></td>
                <td className="px-3 py-2 text-right">{fmtN(Number(p.proj_budget??0))}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full min-w-[50px]">
                      <div className="h-full bg-blue-500 rounded-full" style={{width:`${p.progress_percent??0}%`}} />
                    </div>
                    <span className="text-xs text-gray-500 w-7">{Number(p.progress_percent??0).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{fmtDate(p.end_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{p.owner_name||'-'}</td>
              </tr>
            ))}
            {!data.projects.length && <EmptyRow cols={6} />}
          </tbody>
        </table>
      </Section>

      {/* ใบจัดซื้อ */}
      <Section title={`ใบจัดซื้อ/จัดจ้าง (${data.orders.length} รายการ)`}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">เลขที่</th>
              <th className="px-3 py-2 text-left">รายการ</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
              <th className="px-3 py-2 text-right">วงเงิน (บาท)</th>
              <th className="px-3 py-2 text-center">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.orders.map(o => (
              <tr key={o.order_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500">{o.doc_no||'-'}</td>
                <td className="px-3 py-2 max-w-[200px]"><p className="truncate">{o.details||'-'}</p></td>
                <td className="px-3 py-2 text-center"><Badge s={o.order_status} map={ORDER_STATUS} /></td>
                <td className="px-3 py-2 text-right font-medium">{fmtN(Number(o.budgets??0))}</td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{fmtDate(o.order_date)}</td>
              </tr>
            ))}
            {!data.orders.length && <EmptyRow cols={5} />}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ── Finance Tab ───────────────────────────────────────────────────────────────
function FinanceTab({ data }: { data: FinanceData }) {
  const s = data.summary
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SCard label="รวมรายรับ" val={fmtB(s.total_in)} sub="บาท" color="text-green-600" />
        <SCard label="รวมรายจ่าย" val={fmtB(s.total_out)} sub="บาท" color="text-red-600" />
        <SCard label="คงเหลือ" val={fmtB(s.balance)} sub="บาท" color={s.balance>=0?'text-blue-700':'text-red-700'} />
      </div>

      {/* รายรับ-จ่ายแยกประเภทเงิน */}
      <Section title="สรุปแยกประเภทเงิน">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">ประเภทเงิน</th>
              <th className="px-3 py-2 text-right">รายรับ (บาท)</th>
              <th className="px-3 py-2 text-right">รายจ่าย (บาท)</th>
              <th className="px-3 py-2 text-right">คงเหลือ (บาท)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.by_type.map(t => (
              <tr key={t.bg_type_id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{t.bg_name}</td>
                <td className="px-3 py-2 text-right text-green-700">{fmtB(t.total_in)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtB(t.total_out)}</td>
                <td className={`px-3 py-2 text-right font-medium ${t.total_in-t.total_out>=0?'text-blue-700':'text-red-700'}`}>{fmtB(t.total_in-t.total_out)}</td>
              </tr>
            ))}
            {!data.by_type.length && <EmptyRow cols={4} />}
          </tbody>
          {data.by_type.length>0 && (
            <tfoot className="bg-gray-50 font-semibold text-sm">
              <tr>
                <td className="px-3 py-2">รวม</td>
                <td className="px-3 py-2 text-right text-green-700">{fmtB(s.total_in)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtB(s.total_out)}</td>
                <td className={`px-3 py-2 text-right ${s.balance>=0?'text-blue-700':'text-red-700'}`}>{fmtB(s.balance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Section>

      {/* รายเดือน */}
      {data.monthly.length>0 && (
        <Section title="รายรับ-จ่ายรายเดือน">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">เดือน</th>
                <th className="px-3 py-2 text-right">รายรับ (บาท)</th>
                <th className="px-3 py-2 text-right">รายจ่าย (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.monthly.map(m => (
                <tr key={m.ym} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{fmtYM(m.ym)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmtB(m.in)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtB(m.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* รายรับ */}
        <Section title={`ใบนำส่งเงิน/รายรับ (${data.receives.length} รายการ)`}>
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">เลขที่</th>
                <th className="px-3 py-1.5 text-right">จำนวน (บาท)</th>
                <th className="px-3 py-1.5 text-center">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.receives.map(r => (
                <tr key={r.receive_id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">{r.receive_no||'-'}</td>
                  <td className="px-3 py-1.5 text-right text-green-700">{fmtB(r.amount)}</td>
                  <td className="px-3 py-1.5 text-center text-gray-500">{fmtDate(r.receive_date)}</td>
                </tr>
              ))}
              {!data.receives.length && <EmptyRow cols={3} />}
            </tbody>
          </table>
        </Section>

        {/* รายจ่าย */}
        <Section title={`ใบเบิก/รายจ่าย (${data.withdraws.length} รายการ)`}>
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left">เลขที่</th>
                <th className="px-3 py-1.5 text-right">จำนวน (บาท)</th>
                <th className="px-3 py-1.5 text-center">สถานะ</th>
                <th className="px-3 py-1.5 text-center">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.withdraws.map(w => (
                <tr key={w.rw_id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">{w.rw_no||'-'}</td>
                  <td className="px-3 py-1.5 text-right text-red-600">{fmtB(w.rw_total)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-xs text-gray-500">{RW_STATUS[w.rw_status]??w.rw_status}</span>
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-500">{fmtDate(w.rw_date)}</td>
                </tr>
              ))}
              {!data.withdraws.length && <EmptyRow cols={4} />}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  )
}

// ── Supply Tab ────────────────────────────────────────────────────────────────
function SupplyTab({ data }: { data: SupplyData }) {
  const s = data.summary
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard label="ใบจัดซื้อทั้งหมด" val={String(s.total_orders)} sub="รายการ" />
        <SCard label="วงเงินรวม" val={fmtN(s.total_budget)} sub="บาท" color="text-blue-700" />
        <SCard label="อนุมัติแล้ว" val={fmtN(s.approved_budget)} sub="บาท" color="text-green-600" />
        <SCard label="รับของแล้ว" val={String(s.received_count)} sub="ครั้ง" color="text-indigo-600" />
      </div>

      <Section title="ใบจัดซื้อ/จัดจ้างทั้งหมด">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">เลขที่เอกสาร</th>
              <th className="px-3 py-2 text-left">รายการ</th>
              <th className="px-3 py-2 text-center">ประเภท</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
              <th className="px-3 py-2 text-right">วงเงิน (บาท)</th>
              <th className="px-3 py-2 text-center">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.orders.map(o => (
              <tr key={o.order_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500">{o.doc_no||'-'}</td>
                <td className="px-3 py-2 max-w-[180px]"><p className="truncate">{o.details||'-'}</p></td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{o.job_type===1?'ซื้อ':o.job_type===2?'จ้าง':'อื่นๆ'}</td>
                <td className="px-3 py-2 text-center"><Badge s={o.order_status} map={ORDER_STATUS} /></td>
                <td className="px-3 py-2 text-right font-medium">{fmtN(o.budgets)}</td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{fmtDate(o.order_date)}</td>
              </tr>
            ))}
            {!data.orders.length && <EmptyRow cols={6} />}
          </tbody>
          {data.orders.length>0 && (
            <tfoot className="bg-gray-50 text-sm font-semibold">
              <tr>
                <td colSpan={4} className="px-3 py-2">รวม</td>
                <td className="px-3 py-2 text-right text-blue-700">{fmtN(s.total_budget)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Section>
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-700 border-b">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function SCard({ label, val, sub, color='text-gray-800' }: { label:string; val:string; sub:string; color?:string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-base mt-0.5 ${color}`}>{val}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function EmptyRow({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="text-center py-5 text-gray-400 text-sm">ไม่มีข้อมูล</td></tr>
}
