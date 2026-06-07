'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerheadBudgetType {
  bg_type_school_id: number
  bg_type_id: number
  budget_type: string
  perhead: number // 1 = กำหนดรายหัวได้, 0 = ไม่ได้
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerheadRateConfigPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [items, setItems] = useState<PerheadBudgetType[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['perhead-budget-types', scId],
    queryFn: () =>
      apiGet<PerheadBudgetType[]>(`Student/loadPerheadBudgetTypes/${scId}`),
    enabled: scId > 0,
  })

  useEffect(() => {
    if (Array.isArray(data)) setItems(data)
  }, [data])

  function toggle(id: number, checked: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        it.bg_type_school_id === id ? { ...it, perhead: checked ? 1 : 0 } : it,
      ),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPost('Student/setPerheadBudgetTypes', {
        sc_id: scId,
        up_by: adminId,
        items: items.map((it) => ({
          bg_type_school_id: it.bg_type_school_id,
          perhead: it.perhead,
        })),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['perhead-budget-types'] })
      } else {
        toast.error(res?.ms || 'บันทึกไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="ตั้งค่าประเภทเงินที่กำหนดเงินต่อหัวได้"
        actions={
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={items.length === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            บันทึก
          </Button>
        }
      />
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-3">
          เลือกประเภทเงินที่สามารถ <b>กำหนดอัตราเงินต่อหัวนักเรียน</b> ได้
          — ประเภทที่ไม่ติ๊กจะไม่แสดงในหน้า &ldquo;ตั้งค่าเกณฑ์เงินต่อหัวนักเรียน&rdquo;
        </p>

        {isLoading ? (
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
    </div>
  )
}
