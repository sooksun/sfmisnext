'use client'

import { useState } from 'react'
import { Plus, Trash2, Printer } from 'lucide-react'
import { openPrintWindow } from '@/lib/print-utils'
import { officialFoodPurchaseForm } from '@/lib/official-forms'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThaiDatePicker } from '@/components/ui/thai-date-picker'
import { numberToThaiBaht } from '@/lib/print-utils'
import { useAppContext } from '@/hooks/use-app-context'

interface Item {
  name: string
  qty: string
  unitPrice: string
  amount: number
}

export default function FoodPurchaseDocPage() {
  const { scName } = useAppContext()
  const [docNo, setDocNo] = useState('')
  const [purpose, setPurpose] = useState('')
  const [fundSource, setFundSource] = useState('เงินอุดหนุนค่าอาหารกลางวัน')
  const [date, setDate] = useState('')
  const [items, setItems] = useState<Item[]>([{ name: '', qty: '', unitPrice: '', amount: 0 }])
  const [preparerName, setPreparerName] = useState('')
  const [inspectors, setInspectors] = useState<string[]>(['', '', ''])
  const [purchaseOfficer, setPurchaseOfficer] = useState('')
  const [headOfficer, setHeadOfficer] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [payerName, setPayerName] = useState('')
  const [receiverName, setReceiverName] = useState('')

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  function setItem(i: number, patch: Partial<Item>) {
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  }

  function handlePrint() {
    const body = officialFoodPurchaseForm({
      scName,
      docNo,
      purpose,
      fundSource,
      date,
      items: items.filter((i) => i.name.trim()),
      amountText: total > 0 ? numberToThaiBaht(total) : undefined,
      preparerName,
      inspectors: inspectors.filter(Boolean),
      purchaseOfficer,
      headOfficer,
      directorName,
      payerName,
      receiverName,
    })
    openPrintWindow({ title: `ใบจัดซื้อวัสดุเครื่องบริโภค${docNo ? '_' + docNo : ''}`, body })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="ใบจัดซื้อวัสดุเครื่องบริโภค (ตย.36)"
        subtitle="กรอกข้อมูลแล้วพิมพ์ฟอร์ม 4 ส่วน (รายงานขอซื้อ / อนุมัติ / ใบรับรองแทนใบเสร็จ / ตรวจรับ-อนุมัติจ่าย)"
        actions={
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />พิมพ์แบบฟอร์ม
          </Button>
        }
      />

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>เลขที่เอกสาร (บค.)</Label><Input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="บค. 8/2568" /></div>
          <div className="space-y-1.5"><Label>วันที่</Label><ThaiDatePicker value={date} onChange={setDate} /></div>
          <div className="space-y-1.5 col-span-2"><Label>เพื่อ (วัตถุประสงค์)</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="ประกอบอาหารให้นักเรียนรับประทาน วันที่ 1 พ.ย. 2568" /></div>
          <div className="space-y-1.5 col-span-2"><Label>แหล่งเงิน</Label><Input value={fundSource} onChange={(e) => setFundSource(e.target.value)} /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">รายการอาหาร/เครื่องปรุง</Label>
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: '', qty: '', unitPrice: '', amount: 0 }])}>
              <Plus className="h-3 w-3 mr-1" />เพิ่มแถว
            </Button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-5" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="รายการ" />
              <Input className="col-span-2" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} placeholder="จำนวน" />
              <Input className="col-span-2" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: e.target.value })} placeholder="ราคา/หน่วย" />
              <Input className="col-span-2" type="number" step="0.01" value={it.amount || ''} onChange={(e) => setItem(i, { amount: Number(e.target.value) })} placeholder="จำนวนเงิน" />
              <button className="col-span-1 text-red-500 hover:text-red-600 flex justify-center" onClick={() => setItems(items.filter((_, j) => j !== i))} title="ลบ">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="text-right text-sm font-semibold">รวม: <span className="text-blue-700">{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท</div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1.5"><Label>ผู้จัดทำรายการ</Label><Input value={preparerName} onChange={(e) => setPreparerName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>ผู้จ่ายเงิน</Label><Input value={payerName} onChange={(e) => setPayerName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>เจ้าหน้าที่พัสดุ</Label><Input value={purchaseOfficer} onChange={(e) => setPurchaseOfficer(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>หัวหน้าเจ้าหน้าที่พัสดุ</Label><Input value={headOfficer} onChange={(e) => setHeadOfficer(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>ผู้อำนวยการโรงเรียน</Label><Input value={directorName} onChange={(e) => setDirectorName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>ผู้รับเงิน</Label><Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} /></div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="text-sm font-semibold">กรรมการตรวจรับพัสดุ (3 คน)</Label>
          <div className="grid grid-cols-3 gap-2">
            {inspectors.map((v, i) => (
              <Input key={i} value={v} onChange={(e) => setInspectors(inspectors.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`กรรมการคนที่ ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
