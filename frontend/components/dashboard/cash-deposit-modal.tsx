'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Landmark, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH, showNumber } from '@/lib/utils'

interface ReminderItem {
  ckr_id: number
  record_date: string
  amount: number
  money_detail: string | null
  over_threshold: boolean
  deadline: string
  status: string
}
interface ReminderResp {
  data: ReminderItem[]
  count: number
  overdue: number
  total_overdue: number
  total_pending: number
}

/**
 * Popup เตือนนำเงินสดฝากธนาคารตามระเบียบกระทรวงการคลังฯ พ.ศ. 2562
 *  - แสดงเมื่อมีเงินสดเก็บรักษา "เลยกำหนด" นำฝาก (overdue) — ครั้งเดียวต่อ session
 */
export function CashDepositModal() {
  const { scId, syId } = useAppContext()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['cash-deposit-reminder', scId, syId],
    queryFn: () =>
      apiGet<ReminderResp>(`CashKeeping/depositReminder/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
    refetchInterval: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!data || data.overdue === 0) return
    const key = 'sfmis:cashDepositModalShown'
    if (sessionStorage.getItem(key)) return
    setOpen(true)
    sessionStorage.setItem(key, '1')
  }, [data])

  if (!data || data.overdue === 0) return null
  const overdueItems = data.data.filter((x) => x.status === 'overdue')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> ต้องนำเงินสดฝากธนาคารโดยด่วน
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            ตามระเบียบกระทรวงการคลังว่าด้วยการรับ-จ่าย-เก็บรักษาเงินและการนำเงินส่งคลัง
            พ.ศ. 2562 — เงินสดที่รับไว้ต้องนำฝาก<b>โดยเร็ว</b> (รับเกิน 10,000 บาท →
            วันนั้นหรืออย่างช้าวันทำการถัดไป ; ไม่เกิน 10,000 บาท → ภายใน 3 วันทำการ)
          </p>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            เลยกำหนดนำฝาก {data.overdue} รายการ · รวม{' '}
            {showNumber(data.total_overdue)} บาท
          </div>
          <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
            {overdueItems.map((x) => (
              <li
                key={x.ckr_id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-gray-800">
                    {x.money_detail ?? 'เงินสดเก็บรักษา'}
                  </div>
                  <div className="text-xs text-gray-500">
                    รับ {fmtDateTH(x.record_date)} · กำหนดฝาก{' '}
                    {fmtDateTH(x.deadline)}
                  </div>
                </div>
                <span className="shrink-0 font-medium text-red-700">
                  {showNumber(x.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            ปิด
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
              router.push('/sfmis/financial-report/unified-register')
            }}
            className="gap-1"
          >
            <Landmark className="h-4 w-4" /> ไปบันทึกนำฝาก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
