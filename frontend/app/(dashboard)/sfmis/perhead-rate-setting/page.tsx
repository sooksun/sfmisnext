'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProcessFlow } from '@/components/shared/process-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerheadBudgetType {
  bg_type_school_id: number
  bg_type_id: number
  budget_type: string
  perhead: number // 1 = กำหนดรายหัวได้, 0 = ไม่ได้
}

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

type Tab = 'types' | 'rates'

// ── Page ──────────────────────────────────────────────────────────────────────
// รวม 2 หน้าเดิมเป็นหน้าเดียว (ฟังก์ชันคงเดิม):
//   แท็บ "ประเภทเงินรายหัว"  = เลือกประเภทเงินที่กำหนดรายหัวได้ (เดิม perhead-rate-config)
//   แท็บ "อัตราเงินต่อหัว"   = ใส่จำนวนเงินต่อหัวแยกตามชั้น    (เดิม perhead-rate-setting)

export default function PerheadRatePage() {
  const { scId, adminId, syId: _syId, budgetSyId } = useAppContext()
  const syId = budgetSyId || _syId
  const userId = adminId
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('types')

  // ── แท็บ 1: ประเภทเงินรายหัว ─────────────────────────────────────────────
  const [items, setItems] = useState<PerheadBudgetType[]>([])
  const { data: typeData, isLoading: typesLoading } = useQuery({
    queryKey: ['perhead-budget-types', scId],
    queryFn: () =>
      apiGet<PerheadBudgetType[]>(`Student/loadPerheadBudgetTypes/${scId}`),
    enabled: scId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  useEffect(() => {
    if (Array.isArray(typeData)) setItems(typeData)
  }, [typeData])

  function toggle(id: number, checked: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        it.bg_type_school_id === id ? { ...it, perhead: checked ? 1 : 0 } : it,
      ),
    )
  }

  const saveTypes = useMutation({
    mutationFn: () =>
      apiPost('Student/setPerheadBudgetTypes', {
        sc_id: scId,
        up_by: userId,
        items: items.map((it) => ({
          bg_type_school_id: it.bg_type_school_id,
          perhead: it.perhead,
        })),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกประเภทเงินรายหัวเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['perhead-budget-types'] })
        // ประเภทที่เปลี่ยน กระทบรายการในแท็บอัตรา → ให้รีเฟรช
        qc.invalidateQueries({ queryKey: ['perhead-rate-setting'] })
      } else {
        toast.error(res?.ms || 'บันทึกไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  // ── แท็บ 2: อัตราเงินต่อหัว ──────────────────────────────────────────────
  const [rates, setRates] = useState<PerheadRate[]>([])
  const { data: rateData, isLoading: ratesLoading } = useQuery({
    queryKey: ['perhead-rate-setting', scId, syId],
    queryFn: () => apiGet<{ data: PerheadRate[] }>(`Student/loadPerheadRateSetting/${scId}/${syId}`),
    enabled: scId > 0 && syId > 0,
  })
  useEffect(() => {
    if (rateData?.data) setRates(rateData.data)
  }, [rateData])

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
          : r,
      ),
    )
  }

  const saveRates = useMutation({
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

  // ── ปุ่มบันทึกตามแท็บที่เปิดอยู่ ──
  const saveAction =
    tab === 'types'
      ? { fn: () => saveTypes.mutate(), disabled: items.length === 0 || saveTypes.isPending, label: 'บันทึกประเภทเงิน' }
      : { fn: () => saveRates.mutate(), disabled: rates.length === 0 || saveRates.isPending, label: 'บันทึกเกณฑ์เงินต่อหัว' }

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ตั้งค่าเงินรายหัว (ประเภท + อัตรา)"
        actions={
          <Button onClick={saveAction.fn} disabled={saveAction.disabled}>
            <Save className="h-4 w-4" />
            {saveAction.label}
          </Button>
        }
      />
      <ProcessFlow flow="plan" />

      <div className="p-4">
        {/* แท็บ */}
        <div className="flex gap-1 border-b mb-4">
          {([
            ['types', 'ประเภทเงินรายหัว'],
            ['rates', 'อัตราเงินต่อหัว'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── แท็บ 1: ประเภทเงินรายหัว ── */}
        {tab === 'types' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              เลือกประเภทเงินที่สามารถ <b>กำหนดอัตราเงินต่อหัวนักเรียน</b> ได้
              — ประเภทที่ไม่ติ๊กจะไม่แสดงในแท็บ &ldquo;อัตราเงินต่อหัว&rdquo;
            </p>
            {typesLoading ? (
              <p className="text-gray-500 text-sm">กำลังโหลด...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-sm">
                โรงเรียนยังไม่ได้เลือกประเภทเงิน (ตั้งค่าที่เมนูประเภทรายรับงบประมาณก่อน)
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-w-2xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-2">ประเภทเงิน</th>
                      <th className="text-center px-4 py-2 w-40">กำหนดรายหัวได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.bg_type_school_id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{it.budget_type || `#${it.bg_type_id}`}</td>
                        <td className="px-4 py-2 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-indigo-600 cursor-pointer"
                              checked={it.perhead === 1}
                              onChange={(e) => toggle(it.bg_type_school_id, e.target.checked)}
                            />
                            <span className={it.perhead === 1 ? 'text-green-600' : 'text-gray-400'}>
                              {it.perhead === 1 ? 'กำหนดได้' : 'ไม่กำหนด'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── แท็บ 2: อัตราเงินต่อหัว ── */}
        {tab === 'rates' && (
          <div>
            {ratesLoading ? (
              <p className="text-gray-500 text-sm">กำลังโหลด...</p>
            ) : rates.length === 0 ? (
              <p className="text-gray-500 text-sm">
                ไม่มีข้อมูลเกณฑ์เงินต่อหัว — เลือกประเภทเงินในแท็บ &ldquo;ประเภทเงินรายหัว&rdquo; ก่อน
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([budgetType, list]) => (
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
                        {list.map((item) => (
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
                            {fmt(list.reduce((s, r) => s + r.amount, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
