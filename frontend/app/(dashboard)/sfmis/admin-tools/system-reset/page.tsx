'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RotateCcw, School, FlaskConical, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiPost } from '@/lib/api'

type Action = 'resetSystem' | 'demoSchool' | 'resetDemoData'

interface ActionDef {
  key: Action
  endpoint: string
  title: string
  desc: string
  detail: string
  icon: React.ElementType
  tone: string
}

const ACTIONS: ActionDef[] = [
  {
    key: 'resetSystem',
    endpoint: 'SchoolReset/resetSystem',
    title: 'รีเซ็ตระบบ (เริ่มใช้งานจริง)',
    desc: 'ล้างเฉพาะข้อมูลธุรกรรม/งานทั้งหมดของโรงเรียน',
    detail:
      'ลบ: รับ–จ่ายเงิน · ใบเสร็จ · เช็ค · โครงการ · จัดซื้อ · พัสดุ · นักเรียน · ทะเบียนคุมต่าง ๆ ฯลฯ\nเก็บไว้: บัญชีผู้ใช้ · ข้อมูลโรงเรียน · ปีการศึกษา · ค่าตั้งค่า (ประเภทเงิน/บัญชีธนาคาร/ชั้นเรียน/เกณฑ์)',
    icon: RotateCcw,
    tone: 'amber',
  },
  {
    key: 'demoSchool',
    endpoint: 'SchoolReset/demoSchool',
    title: 'สร้างโรงเรียน Demo (พร้อมเริ่มงาน)',
    desc: 'ล้างทั้งหมด แล้วสร้างค่าตั้งค่าพื้นฐานใหม่',
    detail:
      'ลบข้อมูลธุรกรรม + ค่าตั้งค่าเดิมทั้งหมด แล้วสร้างใหม่: ปีการศึกษา · ประเภทเงิน · บัญชีธนาคาร · ชั้นเรียนที่เปิดสอน · อัตราเงินรายหัวเบื้องต้น\nไม่มีข้อมูลธุรกรรมตัวอย่าง',
    icon: School,
    tone: 'blue',
  },
  {
    key: 'resetDemoData',
    endpoint: 'SchoolReset/resetDemoData',
    title: 'รีเซ็ต + ข้อมูลตัวอย่าง',
    desc: 'สร้างโรงเรียน Demo + ข้อมูลตัวอย่าง ~30 รายการ',
    detail:
      'เหมือน Demo School + สร้างข้อมูลตัวอย่างเริ่มต้น: จำนวนนักเรียนรายชั้น และรายการรับ–จ่ายเงิน 30 รายการ (ลงวันที่ภายใน 1 เดือนล่าสุด) เพื่อทดลอง/อบรม',
    icon: FlaskConical,
    tone: 'purple',
  },
]

const toneCls: Record<string, { border: string; badge: string; btn: string }> = {
  amber: {
    border: 'border-amber-200',
    badge: 'bg-amber-50 text-amber-700',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
  blue: {
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  purple: {
    border: 'border-purple-200',
    badge: 'bg-purple-50 text-purple-700',
    btn: 'bg-purple-600 hover:bg-purple-700',
  },
}

export default function SystemResetPage() {
  const [target, setTarget] = useState<ActionDef | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const mutation = useMutation({
    mutationFn: (a: ActionDef) =>
      apiPost(a.endpoint, { confirm: 'RESET' }),
    onSuccess: (res: any) => {
      if (res?.flag) toast.success(res.ms || 'ดำเนินการเรียบร้อย')
      else toast.error(res?.ms || 'ไม่สำเร็จ')
      close()
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด (เฉพาะผู้ดูแลพิเศษเท่านั้น)')
      close()
    },
  })

  function close() {
    setTarget(null)
    setConfirmText('')
  }

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="รีเซ็ต / ข้อมูลตัวอย่างโรงเรียน" />

      <div className="p-4 space-y-4">
        {/* คำเตือน */}
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <b>คำเตือน:</b> ฟังก์ชันเหล่านี้ลบข้อมูลถาวร <b>เฉพาะโรงเรียนที่คุณ login อยู่</b>{' '}
            และ <b>ไม่สามารถย้อนกลับได้</b> — สงวนสิทธิ์เฉพาะผู้ดูแลพิเศษ (Super Admin) ต้องพิมพ์ยืนยันก่อนทุกครั้ง
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {ACTIONS.map((a) => {
            const t = toneCls[a.tone]
            const Icon = a.icon
            return (
              <div
                key={a.key}
                className={`rounded-xl border ${t.border} bg-white p-5 flex flex-col`}
              >
                <div className={`inline-flex items-center gap-2 text-sm font-semibold px-2 py-1 rounded-md w-fit ${t.badge}`}>
                  <Icon className="h-4 w-4" />
                  {a.title}
                </div>
                <p className="mt-3 text-sm text-gray-700">{a.desc}</p>
                <p className="mt-2 text-xs text-gray-500 whitespace-pre-line flex-auto">
                  {a.detail}
                </p>
                <Button
                  className={`mt-4 text-white ${t.btn}`}
                  onClick={() => setTarget(a)}
                >
                  ดำเนินการ
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialog ยืนยันพิมพ์ RESET */}
      <Dialog open={!!target} onOpenChange={(v) => { if (!v) close() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              ยืนยัน: {target?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            <p className="text-gray-700">{target?.desc}</p>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-xs">
              การกระทำนี้ลบข้อมูลถาวรของโรงเรียนคุณ และย้อนกลับไม่ได้
            </div>
            <div>
              <label className="text-xs text-gray-600">
                พิมพ์ <b className="text-red-600">RESET</b> เพื่อยืนยัน
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                className="mt-1"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              ยกเลิก
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={confirmText !== 'RESET' || mutation.isPending}
              onClick={() => target && mutation.mutate(target)}
            >
              {mutation.isPending ? 'กำลังดำเนินการ...' : 'ยืนยันลบข้อมูล'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
