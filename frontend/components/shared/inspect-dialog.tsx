'use client'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '@/components/shared/form-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

interface DetailItem {
  supp_id: number
  sp_name: string
  pc_total: number // จำนวนสั่งซื้อ
  rp_total: number // จำนวนที่รับจริง (= pc_total ถ้ายังไม่มี receive record)
}

export interface InspectOrder {
  order_id: number
  /** มี = โหลดจำนวนที่รับจริง (หน้า 2.3); ไม่มี = ใช้จำนวนสั่งซื้อเต็ม + สร้าง receive record ให้ (หน้า 2.2) */
  receive_id?: number
  insp_id?: number | null
  title?: string
}

interface Props {
  open: boolean
  order: InspectOrder | null
  onClose: () => void
  onSaved?: () => void
}

const RESULT_OPTS = [
  { v: 1, t: 'ผ่าน' },
  { v: 2, t: 'ไม่ผ่าน' },
  { v: 3, t: 'ผ่านบางส่วน' },
]

/**
 * Dialog "ตรวจรับพัสดุ" — ใช้ร่วมกันหน้า 2.2 และ 2.3 ให้พฤติกรรมเหมือนกัน
 * บันทึกผลตรวจรับ (Supplie_inspection/save) → ผ่าน = ลงบัญชีวัสดุ + ออกเลขรายงานอัตโนมัติ
 * ถ้ายังไม่มี receive record (เข้าจากหน้า 2.2) จะสร้างให้อัตโนมัติด้วยจำนวนเต็มก่อน
 */
export function InspectDialog({ open, order, onClose, onSaved }: Props) {
  const { scId, adminId, budgetYear } = useAppContext()
  const [items, setItems] = useState<DetailItem[]>([])
  const [loading, setLoading] = useState(false)
  const [inspDate, setInspDate] = useState('')
  const [result, setResult] = useState(1)
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [c3, setC3] = useState('')
  const [reportNo, setReportNo] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open || !order) return
    let cancelled = false
    setResult(1)
    setC1('')
    setC2('')
    setC3('')
    setReportNo('')
    setNote('')
    setInspDate(new Date().toISOString().slice(0, 10))
    setReportDate(new Date().toISOString().slice(0, 10)) // วันที่รายงาน default = วันนี้
    setItems([])
    setLoading(true)
    const load = order.receive_id
      ? apiGet<{ parcel_detail: DetailItem[] }>(
          `Supplie/loadParcelDetailWithdraw/${order.order_id}/${order.receive_id}/${scId}`,
        ).then((r) => r.parcel_detail ?? [])
      : apiGet<{ supp_id: number; sp_name: string; pc_total: number }[]>(
          `Supplie/loadParcelDetail/${order.order_id}`,
        ).then((arr) =>
          (arr ?? []).map((it) => ({
            supp_id: it.supp_id,
            sp_name: it.sp_name,
            pc_total: it.pc_total,
            rp_total: it.pc_total, // จำนวนเต็ม
          })),
        )
    load
      .then((list) => !cancelled && setItems(list))
      .catch(() => !cancelled && toast.error('ไม่สามารถโหลดรายการพัสดุได้'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, order, scId])

  const save = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('ไม่มีคำสั่งซื้อ')
      // หน้า 2.2: ยังไม่มี receive record → สร้างให้ด้วยจำนวนเต็มก่อน เพื่อให้หน้า 2.3 เห็นรายการ
      if (!order.receive_id) {
        const created: any = await apiPost('Supplie/editReceiveParcel', {
          order_id: order.order_id,
          admin_id: adminId,
          sc_id: scId,
          sy_year: budgetYear, // route param ชื่อ sy_year แต่ table เก็บปีงบจริง (พ.ศ.)
          title: `รับพัสดุตามคำสั่งซื้อ #${order.order_id}${order.title ? ` — ${order.title}` : ''}`.slice(0, 250),
          receive_date: inspDate || new Date().toISOString().slice(0, 10),
          cart: items.map((it) => ({ supp_id: it.supp_id, receive: it.pc_total })),
        })
        if (!created?.flag) throw new Error(created?.ms || 'สร้างรายการรับไม่สำเร็จ')
      }
      const res: any = await apiPost('Supplie_inspection/save', {
        order_id: order.order_id,
        sc_id: scId,
        up_by: adminId,
        insp_date: inspDate || null,
        insp_result: result,
        insp_note: note || null,
        committee1: c1.trim() || null,
        committee2: c2.trim() || null,
        committee3: c3.trim() || null,
        report_no: reportNo || null, // เว้นว่าง = ออกอัตโนมัติ
        report_date: reportDate || null,
        ...(order.insp_id ? { insp_id: order.insp_id } : {}),
      })
      if (!res?.flag) throw new Error(res?.ms || 'บันทึกไม่สำเร็จ')
      return res
    },
    onSuccess: (res: any) => {
      toast.success(res?.ms || 'บันทึกการตรวจรับสำเร็จ')
      onSaved?.()
      onClose()
    },
    onError: (e: any) => toast.error(e?.message || 'เกิดข้อผิดพลาด'),
  })

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`ตรวจรับพัสดุ${order?.title ? ` — ${order.title}` : ` — คำสั่งซื้อ #${order?.order_id ?? ''}`}`}
      onSubmit={() => save.mutate()}
      loading={save.isPending || loading}
      submitLabel="บันทึกตรวจรับ"
      size="2xl"
    >
      <div className="space-y-4">
        <div>
          <Label>รายการพัสดุที่รับ</Label>
          {loading ? (
            <p className="text-gray-500 text-sm">กำลังโหลดรายการ...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">รายการ</th>
                    <th className="border px-2 py-1 text-right">จำนวนสั่งซื้อ</th>
                    <th className="border px-2 py-1 text-right">จำนวนที่รับ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((el) => (
                    <tr key={el.supp_id}>
                      <td className="border px-2 py-1">{el.sp_name || `#${el.supp_id}`}</td>
                      <td className="border px-2 py-1 text-right">{el.pc_total}</td>
                      <td
                        className={`border px-2 py-1 text-right ${el.rp_total < el.pc_total ? 'text-yellow-700' : ''}`}
                      >
                        {el.rp_total}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="border px-2 py-2 text-center text-gray-400">
                        ไม่มีรายการ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>วันที่ตรวจรับ</Label>
            <ThaiDatePicker value={inspDate} onChange={(v) => setInspDate(v)} />
          </div>
          <div>
            <Label>ผลการตรวจรับ *</Label>
            <select
              className="w-full border rounded-md h-9 px-2"
              value={result}
              onChange={(e) => setResult(Number(e.target.value))}
            >
              {RESULT_OPTS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>กรรมการ 1</Label>
            <Input value={c1} onChange={(e) => setC1(e.target.value)} placeholder="ชื่อ-สกุล" />
          </div>
          <div>
            <Label>กรรมการ 2</Label>
            <Input value={c2} onChange={(e) => setC2(e.target.value)} placeholder="ชื่อ-สกุล" />
          </div>
          <div>
            <Label>กรรมการ 3</Label>
            <Input value={c3} onChange={(e) => setC3(e.target.value)} placeholder="ชื่อ-สกุล" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>เลขที่รายงาน</Label>
            <Input
              value={reportNo}
              onChange={(e) => setReportNo(e.target.value)}
              placeholder="เว้นว่าง = ออกอัตโนมัติ บ.N/2569"
            />
          </div>
          <div>
            <Label>วันที่รายงาน</Label>
            <ThaiDatePicker value={reportDate} onChange={(v) => setReportDate(v)} />
          </div>
        </div>
        <div>
          <Label>หมายเหตุ</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <p className="text-xs text-yellow-700">
          * หากผลตรวจ = &quot;ผ่าน&quot; ระบบจะลงบัญชีวัสดุ (trans_in) และออกเลขที่รายงานตรวจรับให้อัตโนมัติ
          แล้วปิดงานคำสั่งซื้อ
        </p>
      </div>
    </FormDialog>
  )
}
