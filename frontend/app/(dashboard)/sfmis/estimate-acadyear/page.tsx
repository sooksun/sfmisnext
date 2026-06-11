'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'

interface EstimateGroup {
  budget_type_id: number
  budget_type_name: string
  estimate_amount: number
  carryover_amount: number // เงินเหลือจ่ายปีเก่า (หน้า 1.2)
  total_income: number // วงเงินรวม = รายหัว + เหลือจ่ายปีเก่า
  real_amount: number
  remain_amount: number
  budget_year: number
}

interface EstimateStatus {
  confirmed: boolean
  ea_budget: number
  update_date: string | null
}

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function EstimateAcadyearPage() {
  const { scId, adminId, syId, budgetYear: budgetYearRaw } = useAppContext()
  const year = budgetYearRaw >= 2400 ? budgetYearRaw : budgetYearRaw + 543
  const apiYear = budgetYearRaw < 2400 ? budgetYearRaw : budgetYearRaw - 543
  const qc = useQueryClient()

  const enabled = scId > 0 && syId > 0 && apiYear > 0

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['estimate-acadyear', scId, apiYear, syId],
    queryFn: () =>
      apiGet<EstimateGroup[]>(
        `Budget/loadEstimateAcadyearGroup/${scId}/${apiYear}/${syId}`,
      ),
    enabled,
  })

  const { data: status } = useQuery({
    queryKey: ['estimate-acadyear-status', scId, apiYear, syId],
    queryFn: () =>
      apiGet<EstimateStatus>(
        `Budget/loadEstimateAcadyearStatus/${scId}/${syId}/${apiYear}`,
      ),
    enabled,
  })

  const rows = Array.isArray(data) ? data : []
  const totalIncome = rows.reduce(
    (s, r) => s + Number(r.total_income ?? r.estimate_amount + (r.carryover_amount ?? 0)),
    0,
  )
  const totalPerhead = rows.reduce((s, r) => s + Number(r.estimate_amount || 0), 0)
  const totalCarryover = rows.reduce((s, r) => s + Number(r.carryover_amount || 0), 0)
  const totalReal = rows.reduce((s, r) => s + Number(r.real_amount || 0), 0)
  const totalRemain = rows.reduce((s, r) => s + Number(r.remain_amount || 0), 0)

  // ยืนยันแล้วแต่ยอดปัจจุบันเปลี่ยนไป → ต้องยืนยันใหม่
  const drifted =
    !!status?.confirmed && Math.abs((status.ea_budget ?? 0) - totalIncome) > 0.5

  // ── คำนวณใหม่ ─────────────────────────────────────────────────────────────
  function recalc() {
    qc.invalidateQueries({ queryKey: ['estimate-acadyear', scId, apiYear, syId] })
    qc.invalidateQueries({
      queryKey: ['estimate-acadyear-status', scId, apiYear, syId],
    })
    toast.info('คำนวณงบประมาณใหม่จากข้อมูลล่าสุดแล้ว')
  }

  // ── ยืนยันงบประมาณ ────────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () =>
      apiPost('Budget/confirmEstimateAcadyear', {
        sc_id: scId,
        sy_id: syId,
        budget_year: String(apiYear),
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success(res.ms || 'ยืนยันงบประมาณเรียบร้อย')
        qc.invalidateQueries({
          queryKey: ['estimate-acadyear-status', scId, apiYear, syId],
        })
      } else {
        toast.error(res?.ms || 'ยืนยันไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ประมาณการงบประมาณปีการศึกษา"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={recalc}
              disabled={!enabled || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              คำนวณใหม่
            </Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={!enabled || totalIncome <= 0 || confirmMutation.isPending}
            >
              <ShieldCheck className="h-4 w-4" />
              {confirmMutation.isPending
                ? 'กำลังยืนยัน...'
                : status?.confirmed
                  ? 'ยืนยันงบประมาณอีกครั้ง'
                  : 'ยืนยันงบประมาณ'}
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* สถานะการยืนยัน */}
        {status?.confirmed && !drifted && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              <b>ยืนยันงบประมาณแล้ว</b> — ยอด {fmt(status.ea_budget)} บาท
              {status.update_date ? ` (เมื่อ ${fmtDateTH(status.update_date)})` : ''}{' '}
              ใช้เป็นยอดรวมในการพิจารณาจัดสรรแผนงาน/โครงการตลอดปี
            </span>
          </div>
        )}
        {drifted && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800">
            ⚠ ยอดงบประมาณปัจจุบัน ({fmt(totalIncome)} บาท) <b>เปลี่ยนไป</b>จากที่ยืนยันไว้
            ({fmt(status?.ea_budget ?? 0)} บาท) — หากต้องการให้ยอดล่าสุดมีผล กรุณากด
            &ldquo;ยืนยันงบประมาณอีกครั้ง&rdquo;
          </div>
        )}
        {!status?.confirmed && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            ยอดนี้คำนวณสดจากรายหัว + เงินเหลือจ่ายปีเก่า — กด <b>คำนวณใหม่</b>{' '}
            เพื่อดึงข้อมูลล่าสุด และ <b>ยืนยันงบประมาณ</b> เพื่อตรึงเป็นยอดรวม
            สำหรับจัดสรรแผนงาน/โครงการตลอดปี
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ประเภทงบประมาณ</th>
                  <th className="text-right px-4 py-3 font-medium">ประมาณการรายหัว</th>
                  <th className="text-right px-4 py-3 font-medium">เงินเหลือจ่ายปีเก่า</th>
                  <th className="text-right px-4 py-3 font-medium">วงเงินรวม</th>
                  <th className="text-right px-4 py-3 font-medium">ใช้จริง</th>
                  <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      ยังไม่มีข้อมูลประมาณการ — ตรวจสอบการคำนวณรายหัว/เงินเหลือจ่ายปีเก่า
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const total =
                      item.total_income ??
                      item.estimate_amount + (item.carryover_amount ?? 0)
                    return (
                      <tr key={item.budget_type_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">{item.budget_type_name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmt(item.estimate_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span
                            className={
                              (item.carryover_amount ?? 0) > 0
                                ? 'text-amber-700'
                                : 'text-gray-400'
                            }
                          >
                            {fmt(item.carryover_amount ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                          {fmt(total)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmt(item.real_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span
                            className={
                              item.remain_amount < 0
                                ? 'text-red-600 font-semibold'
                                : ''
                            }
                          >
                            {fmt(item.remain_amount)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-indigo-50 border-t-2 border-indigo-200 font-semibold text-indigo-900">
                  <tr>
                    <td className="px-4 py-3">ยอดรวมงบประมาณปีการศึกษานี้</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totalPerhead)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totalCarryover)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-base">
                      {fmt(totalIncome)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totalReal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totalRemain)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400">
          ปีงบประมาณ {year} · อัปเดตยอดล่าสุดเมื่อกด &ldquo;คำนวณใหม่&rdquo;
        </p>
      </div>
    </div>
  )
}
