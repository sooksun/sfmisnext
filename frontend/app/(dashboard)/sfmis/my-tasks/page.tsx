'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { apiGet, apiPatch } from '@/lib/api'
import { useAppContext } from '@/hooks/use-app-context'
import { fmtDateTH } from '@/lib/utils'
import { TASK_STATUS, type MyTaskRow } from '@/lib/types'

export default function MyTasksPage() {
  const { scId } = useAppContext()
  const router = useRouter()
  const qc = useQueryClient()
  const key = ['my-tasks', scId]

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiGet<{ data: MyTaskRow[] }>(`projects/my-tasks/${scId}`),
    enabled: scId > 0,
  })
  const rows = data?.data ?? []

  const statusMut = useMutation({
    mutationFn: ({ projectId, taskId, status }: { projectId: number; taskId: number; status: number }) =>
      apiPatch<{ flag: boolean; ms: string }>(`projects/${projectId}/tasks/${taskId}`, { status }),
    onSuccess: (res) => {
      if (res?.flag) { toast.success('อัปเดตแล้ว'); qc.invalidateQueries({ queryKey: key }) }
      else { toast.error(res?.ms || 'ไม่สำเร็จ'); qc.invalidateQueries({ queryKey: key }) }
    },
    onError: (e: unknown) => { toast.error(e instanceof Error ? e.message : 'ไม่สำเร็จ'); qc.invalidateQueries({ queryKey: key }) },
  })

  function dueLabel(r: MyTaskRow) {
    if (!r.due_date) return <span className="text-gray-400">-</span>
    if (r.overdue) return <span className="font-medium text-red-600">{fmtDateTH(r.due_date)} (เกิน {Math.abs(r.days_left ?? 0)} วัน)</span>
    if (r.days_left !== null && r.days_left <= 7) return <span className="text-amber-600">{fmtDateTH(r.due_date)} (อีก {r.days_left} วัน)</span>
    return <span className="text-gray-600">{fmtDateTH(r.due_date)}</span>
  }

  return (
    <div className="flex flex-col flex-auto min-w-0">
      <PageHeader title="งานของฉัน" subtitle="งานที่ได้รับมอบหมายข้ามโครงการ เรียงตามความเร่งด่วน" />
      <div className="p-4">
        {isLoading ? (
          <p className="py-8 text-center text-gray-500">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-gray-400">ไม่มีงานที่ค้างอยู่</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-sm text-blue-900">
                <tr>
                  <th className="px-4 py-2 text-left">งาน</th>
                  <th className="px-4 py-2 text-left">โครงการ</th>
                  <th className="px-4 py-2 text-left">ครบกำหนด</th>
                  <th className="px-4 py-2 text-left">สถานะ</th>
                  <th className="px-4 py-2 text-left">เปิด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {rows.map((r) => (
                  <tr key={r.task_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{r.title}</p>
                      {r.evidence_required === 1 && (
                        <span className="rounded bg-purple-100 px-1 text-xs text-purple-600">ต้องมีหลักฐาน</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.project_name}</td>
                    <td className="px-4 py-2">{dueLabel(r)}</td>
                    <td className="px-4 py-2">
                      <select
                        className="h-8 rounded border border-gray-300 text-sm"
                        value={r.status}
                        onChange={(e) => statusMut.mutate({ projectId: r.project_id, taskId: r.task_id, status: Number(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>{TASK_STATUS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => router.push(`/sfmis/plan-menu/projects/${r.project_id}`)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> โครงการ
                      </button>
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
