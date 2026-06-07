'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

interface PerheadRate {
  class_id: number
  bg_type_id: number
  class_lev: string
  budget_type: string
  amount: number
  crb_id?: number
}

interface GroupedRates {
  [budgetType: string]: PerheadRate[]
}

export default function PerheadRateSettingPage() {
  const { scId, adminId, syId: _syId, budgetSyId } = useAppContext()
  const syId = budgetSyId || _syId
  const userId = adminId
  const qc = useQueryClient()
  const [rates, setRates] = useState<PerheadRate[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['perhead-rate-setting', scId, syId],
    queryFn: () => apiGet<{ data: PerheadRate[] }>(`Student/loadPerheadRateSetting/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })

  useEffect(() => {
    if (data?.data) setRates(data.data)
  }, [data])

  const grouped: GroupedRates = rates.reduce((acc, item) => {
    const key = item.budget_type || 'ไม่ระบุ'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as GroupedRates)

  function updateAmount(class_id: number, bg_type_id: number, value: string) {
    setRates((prev) =>
      prev.map((r) =>
        r.class_id === class_id && r.bg_type_id === bg_type_id
          ? { ...r, amount: Number(value) || 0 }
          : r
      )
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPost('Student/setPerheadRate', {
        sc_id: scId,
        sy_id: syId,
        rates: rates.map((r) => ({
          class_id: r.class_id,
          bg_type_id: r.bg_type_id,
          amount: r.amount,
        })),
        up_by: userId,
      }),
    onSuccess: (res: any) => {
      if (res.flag) {
        toast.success('บันทึกเกณฑ์เงินต่อหัวเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['perhead-rate-setting'] })
      } else {
        toast.error(res.ms || 'มีปัญหาในการบันทึก')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ตั้งค่าเกณฑ์เงินต่อหัวนักเรียน"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/sfmis/perhead-rate-config">
              <Button variant="outline">
                <Settings2 className="h-4 w-4" />
                ตั้งค่าประเภทเงิน
              </Button>
            </Link>
            <Button onClick={() => saveMutation.mutate()} disabled={rates.length === 0 || saveMutation.isPending}>
              <Save className="h-4 w-4" />
              บันทึกทั้งหมด
            </Button>
          </div>
        }
      />
      <ProcessFlow flow="plan" />
      <div className="p-4">
        {isLoading ? (
          <p className="text-gray-500 text-sm">กำลังโหลด...</p>
        ) : rates.length === 0 ? (
          <p className="text-gray-500 text-sm">ไม่มีข้อมูลเกณฑ์เงินต่อหัว</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([budgetType, items]) => (
              <div key={budgetType} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-semibold text-sm border-b">
                  {budgetType}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left">ระดับชั้น</th>
                      <th className="px-4 py-2 text-right w-48">จำนวนเงินต่อหัว (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.class_id}-${item.bg_type_id}`} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2">{item.class_lev}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => updateAmount(item.class_id, item.bg_type_id, e.target.value)}
                            className="text-right h-8"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50">
                      <td className="px-4 py-2 font-semibold text-indigo-700">รวม</td>
                      <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                        {fmt(items.reduce((s, r) => s + r.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
