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

interface SchoolClassroom {
  class_id: number
  class_lev: string
  is_open: number // 1 = เปิดสอน, 0 = ไม่เปิด
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClassOpenConfigPage() {
  const { scId, adminId } = useAppContext()
  const qc = useQueryClient()
  const [items, setItems] = useState<SchoolClassroom[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['school-classrooms', scId],
    queryFn: () =>
      apiGet<SchoolClassroom[]>(`Student/loadSchoolClassrooms/${scId}`),
    enabled: scId > 0,
    // ดึงข้อมูลสดทุกครั้งที่เปิดหน้า (กัน cache เก่าค้างจนแสดงค่าผิด)
    // แต่ปิด refetch ตอนสลับ window/reconnect เพื่อไม่ให้ทับ checkbox ที่กำลังแก้
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    if (Array.isArray(data)) setItems(data)
  }, [data])

  function toggle(id: number, checked: boolean) {
    setItems((prev) =>
      prev.map((it) =>
        it.class_id === id ? { ...it, is_open: checked ? 1 : 0 } : it,
      ),
    )
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPost('Student/setSchoolClassrooms', {
        sc_id: scId,
        up_by: adminId,
        items: items.map((it) => ({
          class_id: it.class_id,
          is_open: it.is_open,
        })),
      }),
    onSuccess: (res: any) => {
      if (res?.flag) {
        toast.success('บันทึกชั้นที่เปิดสอนเรียบร้อยแล้ว')
        qc.invalidateQueries({ queryKey: ['school-classrooms'] })
      } else {
        toast.error(res?.ms || 'บันทึกไม่สำเร็จ')
      }
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  })

  const openCount = items.filter((it) => it.is_open === 1).length

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader
        title="กำหนดชั้นที่เปิดสอน"
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
          เลือกระดับชั้นที่โรงเรียน <b>เปิดสอน</b> — เฉพาะชั้นที่ติ๊กจะแสดงในหน้า
          &ldquo;ตั้งค่าเกณฑ์เงินต่อหัวนักเรียน&rdquo; และ &ldquo;คำนวณงบจากรายหัว&rdquo;
          {items.length > 0 && (
            <span className="ml-1 text-indigo-600">(เปิด {openCount}/{items.length} ชั้น)</span>
          )}
        </p>

        {isLoading ? (
          <p className="text-gray-500 text-sm">กำลังโหลด...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-sm">ไม่มีข้อมูลระดับชั้น</p>
        ) : (
          <div className="border rounded-lg overflow-hidden max-w-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">ระดับชั้น</th>
                  <th className="text-center px-4 py-2 w-32">เปิดสอน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.class_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{it.class_lev}</td>
                    <td className="px-4 py-2 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 cursor-pointer"
                          checked={it.is_open === 1}
                          onChange={(e) => toggle(it.class_id, e.target.checked)}
                        />
                        <span className={it.is_open === 1 ? 'text-green-600' : 'text-gray-400'}>
                          {it.is_open === 1 ? 'เปิด' : 'ปิด'}
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
