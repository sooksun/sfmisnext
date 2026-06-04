'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { apiGet, apiPost } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { toast } from 'sonner'

interface ConfigItem {
  key: string
  label: string
  group: 'procurement' | 'finance'
  unit: string
  law_ref: string
  default_value: number
  value: number
  is_overridden: boolean
  override_scope: 'school' | 'global' | null
}

const GROUP_LABEL: Record<string, string> = {
  procurement: 'พัสดุ (จัดซื้อจัดจ้าง)',
  finance: 'การเงิน / ภาษี',
}

export default function RegulatoryConfigPage() {
  const { scId } = useAppContext()
  const qc = useQueryClient()
  const [edits, setEdits] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['regulatory-config', scId],
    queryFn: () => apiGet<ConfigItem[]>(`RegulatoryConfig/getConfig/${scId}`),
    enabled: scId > 0,
  })

  const saveMut = useMutation({
    mutationFn: (p: { key: string; value: number }) =>
      apiPost<{ flag: boolean; ms: string }>('RegulatoryConfig/upsert', {
        sc_id: scId,
        key: p.key,
        value: p.value,
      }),
    onSuccess: (res, p) => {
      toast[res.flag ? 'success' : 'error'](res.ms)
      if (res.flag) {
        setEdits((e) => {
          const next = { ...e }
          delete next[p.key]
          return next
        })
        qc.invalidateQueries({ queryKey: ['regulatory-config', scId] })
      }
    },
  })

  const resetMut = useMutation({
    mutationFn: (key: string) =>
      apiPost<{ flag: boolean; ms: string }>('RegulatoryConfig/reset', {
        sc_id: scId,
        key,
      }),
    onSuccess: (res) => {
      toast[res.flag ? 'success' : 'error'](res.ms)
      if (res.flag) qc.invalidateQueries({ queryKey: ['regulatory-config', scId] })
    },
  })

  const items = Array.isArray(data) ? data : []
  const groups: ('procurement' | 'finance')[] = ['procurement', 'finance']

  return (
    <div className="space-y-6">
      <PageHeader
        title="เกณฑ์ตามระเบียบ (วงเงิน/อัตรา)"
        subtitle="ตั้งค่าเกณฑ์วงเงินและอัตราตามกฎหมาย-ระเบียบราชการ — ค่าเริ่มต้นเป็นไปตามระเบียบ ปรับได้รายโรงเรียน"
      />

      {groups.map((g) => {
        const rows = items.filter((i) => i.group === g)
        if (rows.length === 0) return null
        return (
          <div key={g} className="rounded-lg border bg-white">
            <div className="border-b bg-gray-50 px-4 py-2 font-medium text-gray-800">
              {GROUP_LABEL[g]}
            </div>
            <div className="divide-y">
              {rows.map((r) => {
                const editing = edits[r.key] !== undefined
                const editVal = editing ? edits[r.key] : String(r.value)
                return (
                  <div key={r.key} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{r.label}</div>
                      <div className="text-xs text-gray-500">{r.law_ref}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editVal}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [r.key]: e.target.value }))
                        }
                        className="w-36 rounded-md border px-2 py-1.5 text-right text-sm"
                      />
                      <span className="w-16 text-sm text-gray-600">{r.unit}</span>
                      {r.is_overridden ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          ปรับแล้ว ({r.override_scope === 'school' ? 'โรงเรียน' : 'ส่วนกลาง'})
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          ค่าตามระเบียบ
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={!editing || saveMut.isPending}
                        onClick={() =>
                          saveMut.mutate({ key: r.key, value: Number(edits[r.key]) })
                        }
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                      >
                        บันทึก
                      </button>
                      {r.is_overridden && (
                        <button
                          type="button"
                          disabled={resetMut.isPending}
                          onClick={() => resetMut.mutate(r.key)}
                          className="rounded-md border px-3 py-1.5 text-sm text-gray-700"
                        >
                          คืนค่าเดิม
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {isLoading && <div className="text-sm text-gray-500">กำลังโหลด...</div>}
      {!isLoading && items.length === 0 && (
        <div className="text-sm text-gray-500">ไม่พบข้อมูลเกณฑ์</div>
      )}
    </div>
  )
}
