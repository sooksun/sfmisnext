'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, Save } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { openPrintWindow } from '@/lib/print-utils'
import { officialAppointmentOrder } from '@/lib/official-forms'

interface CommitteeRow {
  ckc_id: number
  role: string
  seq: number
  name: string
  position: string | null
  order_no: string | null
  order_date: string | null
}

interface MemberRow {
  name: string
  position: string
}

const EMPTY: MemberRow = { name: '', position: '' }

export default function CashCommitteePage() {
  const { scId, adminId, scName } = useAppContext()
  const qc = useQueryClient()

  // กรรมการเก็บรักษาเงิน 3 คน + ผู้สำรอง 3 คน (ตย.41), ผู้ตรวจสอบประจำวัน 1 คน (ตย.42)
  const [keepers, setKeepers] = useState<MemberRow[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }])
  const [substitutes, setSubstitutes] = useState<MemberRow[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }])
  const [auditor, setAuditor] = useState<MemberRow>({ ...EMPTY })
  const [keeperOrderNo, setKeeperOrderNo] = useState('')
  const [keeperOrderDate, setKeeperOrderDate] = useState('')
  const [auditorOrderNo, setAuditorOrderNo] = useState('')
  const [auditorOrderDate, setAuditorOrderDate] = useState('')

  const { data: committee } = useQuery<CommitteeRow[]>({
    queryKey: ['cash-committee', scId],
    queryFn: () => apiGet<CommitteeRow[]>(`CashCommittee/load/${scId}`),
    enabled: scId > 0,
  })

  // เติมค่าจาก DB เมื่อโหลดเสร็จ
  useEffect(() => {
    if (!committee) return
    const ks = committee.filter((c) => c.role === 'keeper' && c.seq <= 3).sort((a, b) => a.seq - b.seq)
    const subs = committee.filter((c) => c.role === 'keeper' && c.seq > 3).sort((a, b) => a.seq - b.seq)
    const au = committee.find((c) => c.role === 'auditor')
    const fill = (arr: CommitteeRow[]) =>
      [0, 1, 2].map((i) => ({ name: arr[i]?.name ?? '', position: arr[i]?.position ?? '' }))
    setKeepers(fill(ks))
    setSubstitutes(fill(subs))
    setAuditor({ name: au?.name ?? '', position: au?.position ?? '' })
    setKeeperOrderNo(ks[0]?.order_no ?? '')
    setKeeperOrderDate(ks[0]?.order_date ?? '')
    setAuditorOrderNo(au?.order_no ?? '')
    setAuditorOrderDate(au?.order_date ?? '')
  }, [committee])

  const saveMut = useMutation({
    mutationFn: () => {
      const members: Record<string, unknown>[] = []
      keepers.forEach((m, i) => {
        if (m.name.trim())
          members.push({ role: 'keeper', seq: i + 1, name: m.name, position: m.position, order_no: keeperOrderNo, order_date: keeperOrderDate || undefined })
      })
      substitutes.forEach((m, i) => {
        if (m.name.trim())
          members.push({ role: 'keeper', seq: i + 4, name: m.name, position: m.position, order_no: keeperOrderNo, order_date: keeperOrderDate || undefined })
      })
      if (auditor.name.trim())
        members.push({ role: 'auditor', seq: 1, name: auditor.name, position: auditor.position, order_no: auditorOrderNo, order_date: auditorOrderDate || undefined })
      return apiPost<{ flag: boolean; ms: string }>('CashCommittee/save', { sc_id: scId, up_by: adminId, members })
    },
    onSuccess: (r) => {
      if (r.flag) {
        toast.success(r.ms)
        qc.invalidateQueries({ queryKey: ['cash-committee', scId] })
      } else toast.error(r.ms)
    },
    onError: () => toast.error('บันทึกไม่สำเร็จ'),
  })

  function printKeeperOrder() {
    const members = keepers.filter((m) => m.name.trim()).map((m) => ({ name: m.name, position: m.position }))
    if (members.length === 0) { toast.error('กรุณากรอกรายชื่อกรรมการก่อน'); return }
    const body = officialAppointmentOrder({
      scName,
      orderNo: keeperOrderNo,
      orderDate: keeperOrderDate,
      subject: 'แต่งตั้งกรรมการเก็บรักษาเงินของโรงเรียน',
      legalBasis:
        'อาศัยอำนาจตามความในข้อ 53 และข้อ 54 แห่งระเบียบการเก็บรักษาเงินและการนำเงินส่งคลังในหน้าที่ของอำเภอและกิ่งอำเภอ พ.ศ. 2520',
      introLine: 'ขอแต่งตั้งคณะกรรมการเก็บรักษาเงินของโรงเรียน ประกอบด้วย',
      members,
      substitutes: substitutes.filter((m) => m.name.trim()).map((m) => ({ name: m.name, position: m.position })),
      effectiveDate: keeperOrderDate,
      directorName: undefined,
    })
    openPrintWindow({ title: 'คำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน', body })
  }

  function printAuditorOrder() {
    if (!auditor.name.trim()) { toast.error('กรุณากรอกชื่อผู้ตรวจสอบก่อน'); return }
    const body = officialAppointmentOrder({
      scName,
      orderNo: auditorOrderNo,
      orderDate: auditorOrderDate,
      subject: 'แต่งตั้งผู้ตรวจสอบการรับ-จ่ายเงินประจำวัน',
      legalBasis:
        'อาศัยอำนาจตามความในข้อ 20 และข้อ 37 แห่งระเบียบการเก็บรักษาเงินและการนำเงินส่งคลังในหน้าที่ของอำเภอและกิ่งอำเภอ พ.ศ. 2520',
      introLine: 'จึงแต่งตั้งผู้ตรวจสอบการรับ-จ่ายเงินประจำวันของโรงเรียน ดังนี้',
      members: [{ name: auditor.name, position: auditor.position }],
      effectiveDate: auditorOrderDate,
      directorName: undefined,
    })
    openPrintWindow({ title: 'คำสั่งแต่งตั้งผู้ตรวจสอบการรับ-จ่ายเงินประจำวัน', body })
  }

  const memberInputs = (
    label: string,
    arr: MemberRow[],
    setArr: (v: MemberRow[]) => void,
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {arr.map((m, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Input
            value={m.name}
            onChange={(e) => setArr(arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder={`คนที่ ${i + 1} — ชื่อ-สกุล`}
          />
          <Input
            value={m.position}
            onChange={(e) => setArr(arr.map((x, j) => (j === i ? { ...x, position: e.target.value } : x)))}
            placeholder="ตำแหน่ง"
          />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="กรรมการเก็บรักษาเงิน / ผู้ตรวจสอบประจำวัน"
        subtitle="ตั้งค่ารายชื่อสำหรับรายงานเงินคงเหลือประจำวัน และพิมพ์คำสั่งแต่งตั้ง (ตย.41/42)"
        actions={
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-4 w-4 mr-1" />บันทึก
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── ตย.41 กรรมการเก็บรักษาเงิน ── */}
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">กรรมการเก็บรักษาเงิน (3 คน)</h3>
            <Button variant="outline" size="sm" onClick={printKeeperOrder} className="gap-1">
              <Printer className="h-4 w-4" /> คำสั่ง (ตย.41)
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">เลขที่คำสั่ง</Label>
              <Input value={keeperOrderNo} onChange={(e) => setKeeperOrderNo(e.target.value)} placeholder="เช่น 35/2568" />
            </div>
            <div>
              <Label className="text-xs">วันที่คำสั่ง</Label>
              <ThaiDatePicker value={keeperOrderDate} onChange={setKeeperOrderDate} />
            </div>
          </div>
          {memberInputs('กรรมการ', keepers, setKeepers)}
          {memberInputs('กรรมการสำรอง', substitutes, setSubstitutes)}
        </div>

        {/* ── ตย.42 ผู้ตรวจสอบประจำวัน ── */}
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">ผู้ตรวจสอบการรับ-จ่ายเงินประจำวัน</h3>
            <Button variant="outline" size="sm" onClick={printAuditorOrder} className="gap-1">
              <Printer className="h-4 w-4" /> คำสั่ง (ตย.42)
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">เลขที่คำสั่ง</Label>
              <Input value={auditorOrderNo} onChange={(e) => setAuditorOrderNo(e.target.value)} placeholder="เช่น 36/2568" />
            </div>
            <div>
              <Label className="text-xs">วันที่คำสั่ง</Label>
              <ThaiDatePicker value={auditorOrderDate} onChange={setAuditorOrderDate} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={auditor.name} onChange={(e) => setAuditor({ ...auditor, name: e.target.value })} placeholder="ชื่อ-สกุล" />
            <Input value={auditor.position} onChange={(e) => setAuditor({ ...auditor, position: e.target.value })} placeholder="ตำแหน่ง" />
          </div>
          <p className="text-xs text-gray-400">
            รายชื่อกรรมการเก็บรักษาเงินจะถูกนำไปแสดงในช่องลงนามของ &quot;รายงานเงินคงเหลือประจำวัน&quot; อัตโนมัติ
          </p>
        </div>
      </div>
    </div>
  )
}
