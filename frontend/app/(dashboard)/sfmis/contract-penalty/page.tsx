'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calculator, Check, Ban } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { FormDialog } from '@/components/shared/form-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { fmtDateTH } from '@/lib/utils'
import { useAppContext } from '@/hooks/use-app-context'

// sup_contract.ct_status: 0=ร่าง, 1=ลงนาม, 2=ส่งมอบ, 3=ปิด, 9=ยกเลิก
interface Contract {
  ctId: number
  orderId: number | null
  ctNo: string | null
  ctType: number
  ctDate: string | null
  ctAmount: number
  ctTotal: number
  startDate: string | null
  endDate: string | null
  ctStatus: number
  remark: string | null
}

// ContractPenalty.status: 1=คำนวณ, 2=แจ้ง, 3=รับชำระ, 4=ยกเว้น, 9=ยกเลิก
interface Penalty {
  cp_id: number
  ct_id: number
  due_date: string
  actual_delivery_date: string
  days_late: number
  contract_amount: number
  daily_rate_percent: number
  penalty_amount: number
  status: number
  collected_date: string | null
  waived_reason: string | null
}

const PENALTY_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'คำนวณแล้ว', color: 'bg-amber-100 text-amber-800' },
  2: { label: 'แจ้งชำระ', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'รับชำระแล้ว', color: 'bg-green-100 text-green-800' },
  4: { label: 'ยกเว้น', color: 'bg-gray-100 text-gray-700' },
  9: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800' },
}

const CT_STATUS: Record<number, string> = {
  0: 'ร่าง', 1: 'ลงนาม', 2: 'ส่งมอบ', 3: 'ปิดสัญญา', 9: 'ยกเลิก',
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

export default function ContractPenaltyPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()

  const [selected, setSelected] = useState<Contract | null>(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const [actualDate, setActualDate] = useState('')
  const [ratePercent, setRatePercent] = useState('0.1')

  const [collectTarget, setCollectTarget] = useState<Penalty | null>(null)
  const [collectDate, setCollectDate] = useState('')

  const [waiveTarget, setWaiveTarget] = useState<Penalty | null>(null)
  const [waiveReason, setWaiveReason] = useState('')

  const { data: contractData, isLoading: ctLoading } = useQuery({
    queryKey: ['contracts', scId],
    queryFn: () => apiGet<{ data: Contract[] }>(`Supplie_contract/load/${scId}`),
    enabled: scId > 0,
  })
  const contracts = Array.isArray(contractData?.data) ? contractData!.data : []

  const { data: penaltyData, isLoading: penLoading } = useQuery({
    queryKey: ['penalties', selected?.ctId],
    queryFn: () => apiGet<Penalty[]>(`ContractSecurity/penalties/${selected!.ctId}`),
    enabled: !!selected,
  })
  const penalties = Array.isArray(penaltyData) ? penaltyData : []

  const calcMutation = useMutation({
    mutationFn: (v: { actual_delivery_date: string; daily_rate_percent: number }) =>
      apiPost('ContractSecurity/calcPenalty', {
        ct_id: selected!.ctId,
        sc_id: scId,
        due_date: selected!.endDate,
        actual_delivery_date: v.actual_delivery_date,
        contract_amount: Number(selected!.ctTotal || selected!.ctAmount),
        daily_rate_percent: v.daily_rate_percent,
        up_by: adminId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'คำนวณเรียบร้อย')
        qc.invalidateQueries({ queryKey: ['penalties'] })
        setCalcOpen(false)
        setActualDate('')
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const collectMutation = useMutation({
    mutationFn: (v: { cp_id: number; collected_date: string }) =>
      apiPost('ContractSecurity/penalty/collect', { ...v, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'บันทึกการรับชำระแล้ว')
        qc.invalidateQueries({ queryKey: ['penalties'] })
        setCollectTarget(null)
        setCollectDate('')
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const waiveMutation = useMutation({
    mutationFn: (v: { cp_id: number; reason: string }) =>
      apiPost('ContractSecurity/penalty/waive', { ...v, up_by: adminId }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success(res.ms || 'ยกเว้นค่าปรับแล้ว')
        qc.invalidateQueries({ queryKey: ['penalties'] })
        setWaiveTarget(null)
        setWaiveReason('')
      } else {
        toast.error(res.ms || 'มีปัญหา')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const contractColumns = useMemo(() => [
    {
      header: 'เลขที่สัญญา',
      render: (c: Contract) => <span className="font-mono">{c.ctNo ?? `#${c.ctId}`}</span>,
    },
    { header: 'วันที่สัญญา', render: (c: Contract) => fmtDateTH(c.ctDate) },
    { header: 'สิ้นสุด (กำหนดส่ง)', render: (c: Contract) => fmtDateTH(c.endDate) },
    {
      header: 'มูลค่า (บาท)',
      render: (c: Contract) => <span className="font-mono">{fmt(Number(c.ctTotal || c.ctAmount))}</span>,
    },
    {
      header: 'สถานะ',
      render: (c: Contract) => <span className="text-xs">{CT_STATUS[c.ctStatus] ?? c.ctStatus}</span>,
    },
    {
      header: 'จัดการ',
      render: (c: Contract) => (
        <Button
          size="sm"
          variant={selected?.ctId === c.ctId ? 'default' : 'outline'}
          onClick={() => setSelected(c)}
        >
          ดูค่าปรับ
        </Button>
      ),
      headerClassName: 'w-24',
    },
  ], [selected])

  const penaltyColumns = useMemo(() => [
    { header: 'กำหนดส่ง', render: (p: Penalty) => fmtDateTH(p.due_date) },
    { header: 'ส่งจริง', render: (p: Penalty) => fmtDateTH(p.actual_delivery_date) },
    { header: 'ล่าช้า (วัน)', render: (p: Penalty) => <span className="text-right block">{p.days_late}</span> },
    {
      header: 'อัตรา %/วัน',
      render: (p: Penalty) => <span className="text-right block">{Number(p.daily_rate_percent).toFixed(4)}</span>,
    },
    {
      header: 'ค่าปรับ (บาท)',
      render: (p: Penalty) => <span className="text-right block font-mono text-red-700">{fmt(p.penalty_amount)}</span>,
    },
    {
      header: 'สถานะ',
      render: (p: Penalty) => {
        const s = PENALTY_STATUS[p.status] ?? { label: String(p.status), color: 'bg-gray-100' }
        return <span className={`px-2 py-0.5 rounded text-xs ${s.color}`}>{s.label}</span>
      },
    },
    {
      header: 'รายละเอียด',
      render: (p: Penalty) => (
        <div className="text-xs text-gray-600">
          {p.collected_date && <div>รับชำระ: {fmtDateTH(p.collected_date)}</div>}
          {p.waived_reason && <div>ยกเว้น: {p.waived_reason}</div>}
        </div>
      ),
    },
    {
      header: 'จัดการ',
      render: (p: Penalty) =>
        p.status === 1 || p.status === 2 ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 h-7"
              onClick={() => {
                setCollectTarget(p)
                setCollectDate(new Date().toISOString().substring(0, 10))
              }}
              title="บันทึกรับชำระ"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-gray-600 h-7"
              onClick={() => { setWaiveTarget(p); setWaiveReason('') }}
              title="ยกเว้นค่าปรับ"
            >
              <Ban className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
      headerClassName: 'w-24',
    },
  ], [])

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="ค่าปรับส่งมอบล่าช้า" />

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">สัญญา/ใบสั่งซื้อ</h3>
          <DataTable
            columns={contractColumns}
            data={contracts}
            total={contracts.length}
            page={0}
            pageSize={50}
            onPageChange={() => {}}
            loading={ctLoading}
          />
        </div>

        {selected && (
          <div className="rounded-md border p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium">
                  ค่าปรับสัญญา: <strong>{selected.ctNo ?? `#${selected.ctId}`}</strong>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  กำหนดส่ง: {fmtDateTH(selected.endDate)} · มูลค่า {fmt(Number(selected.ctTotal || selected.ctAmount))} บาท
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setActualDate(new Date().toISOString().substring(0, 10))
                  setRatePercent('0.1')
                  setCalcOpen(true)
                }}
                disabled={!selected.endDate}
              >
                <Calculator className="h-4 w-4 mr-1" />
                คำนวณค่าปรับ
              </Button>
            </div>
            <DataTable
              columns={penaltyColumns}
              data={penalties}
              total={penalties.length}
              page={0}
              pageSize={50}
              onPageChange={() => {}}
              loading={penLoading}
            />
          </div>
        )}
      </div>

      {/* Dialog คำนวณค่าปรับ */}
      <FormDialog
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        title="คำนวณค่าปรับส่งมอบล่าช้า"
        onSubmit={() => {
          if (!actualDate) { toast.error('กรุณาเลือกวันที่ส่งมอบจริง'); return }
          const rate = Number(ratePercent)
          if (!(rate >= 0.01 && rate <= 5)) { toast.error('อัตราค่าปรับ 0.01–5 %'); return }
          calcMutation.mutate({ actual_delivery_date: actualDate, daily_rate_percent: rate })
        }}
        loading={calcMutation.isPending}
        submitLabel="คำนวณและบันทึก"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            กำหนดส่ง: <strong>{fmtDateTH(selected?.endDate)}</strong> · มูลค่าสัญญา{' '}
            <strong>{fmt(Number(selected?.ctTotal || selected?.ctAmount || 0))} บาท</strong>
          </div>
          <div>
            <Label>วันที่ส่งมอบจริง *</Label>
            <ThaiDatePicker value={actualDate} onChange={setActualDate} />
          </div>
          <div>
            <Label>อัตราค่าปรับ (% ของมูลค่าสัญญา/วัน)</Label>
            <Input
              type="number" step="0.01" min="0.01" max="5"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              ปกติ 0.10–0.20 % (ขั้นต่ำ 100 บาท/วัน ตามระเบียบ)
            </p>
          </div>
        </div>
      </FormDialog>

      {/* Dialog บันทึกรับชำระ */}
      <FormDialog
        open={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        title="บันทึกการรับชำระค่าปรับ"
        onSubmit={() => {
          if (!collectDate) { toast.error('กรุณาเลือกวันที่รับชำระ'); return }
          collectMutation.mutate({ cp_id: collectTarget!.cp_id, collected_date: collectDate })
        }}
        loading={collectMutation.isPending}
        submitLabel="บันทึก"
      >
        <div className="space-y-3">
          <p className="text-sm">
            ยอดค่าปรับ: <strong className="text-red-700">{fmt(collectTarget?.penalty_amount ?? 0)} บาท</strong>
          </p>
          <div>
            <Label>วันที่รับชำระ *</Label>
            <ThaiDatePicker value={collectDate} onChange={setCollectDate} />
          </div>
        </div>
      </FormDialog>

      {/* Dialog ยกเว้นค่าปรับ */}
      <FormDialog
        open={!!waiveTarget}
        onClose={() => setWaiveTarget(null)}
        title="ยกเว้นค่าปรับ"
        onSubmit={() => {
          if (!waiveReason.trim()) { toast.error('กรุณาระบุเหตุผล'); return }
          waiveMutation.mutate({ cp_id: waiveTarget!.cp_id, reason: waiveReason.trim() })
        }}
        loading={waiveMutation.isPending}
        submitLabel="ยกเว้น"
      >
        <div className="space-y-3">
          <p className="text-sm">
            ยกเว้นค่าปรับ <strong>{fmt(waiveTarget?.penalty_amount ?? 0)} บาท</strong>
          </p>
          <div>
            <Label>เหตุผล *</Label>
            <textarea
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="เช่น เหตุสุดวิสัย / อนุมัติขยายเวลา"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
