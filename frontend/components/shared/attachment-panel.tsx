'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Paperclip, Download, Trash2, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { apiGet, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth-token'
import { useAppContext } from '@/hooks/use-app-context'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/'

// ── client-side limits (mirror backend) ──
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif']
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif'

interface AttachmentItem {
  att_id: number
  file_name: string
  mime: string
  size_bytes: number
  category: string | null
  note: string | null
  url: string // เช่น /api/attachment/file/<stored_name>
  create_date: string
  up_by: number | null
}

interface AttachmentPanelProps {
  refType: string
  refId: number
  scId: number
  category?: string
  title?: string
  readOnly?: boolean
}

/** format ขนาดไฟล์เป็น KB / MB */
function fmtSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

/**
 * ดึงไฟล์ที่ป้องกันด้วย JWT เป็น blob แล้วเปิด/ดาวน์โหลด
 * (ใช้ <a href> ตรง ๆ ไม่ได้เพราะไม่แนบ Authorization header)
 */
async function openProtectedFile(rawUrl: string, fileName: string) {
  const token = getAccessToken()
  // url จาก backend = /api/attachment/file/...  → ต่อกับ origin ของ API
  // API_BASE มักเป็น http://host:3000/api/ — ตัด /api/ ออกแล้วต่อ path เต็ม
  const origin = API_BASE.replace(/\/api\/?$/, '')
  const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${origin}${rawUrl}`
  const res = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`โหลดไฟล์ไม่สำเร็จ (${res.status})`)
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  // รูป/PDF เปิดในแท็บใหม่; ชนิดอื่นดาวน์โหลด
  const isViewable = blob.type.startsWith('image/') || blob.type === 'application/pdf'
  if (isViewable) {
    window.open(objUrl, '_blank', 'noopener,noreferrer')
  } else {
    const a = document.createElement('a')
    a.href = objUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  // ปล่อย object url หลัง browser ใช้เสร็จ
  setTimeout(() => URL.revokeObjectURL(objUrl), 60_000)
}

export function AttachmentPanel({
  refType,
  refId,
  scId,
  category,
  title = 'เอกสารแนบ/หลักฐาน',
  readOnly = false,
}: AttachmentPanelProps) {
  const { adminId } = useAppContext()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<AttachmentItem | null>(null)
  const [opening, setOpening] = useState<number | null>(null)

  const enabled = !!refId && !!scId
  const queryKey = ['attachments', refType, refId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<{ data: AttachmentItem[]; count: number }>(
        `attachment/list/${scId}/${refType}/${refId}`,
      ),
    enabled,
  })
  const items = data?.data ?? []

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ref_type', refType)
      fd.append('ref_id', String(refId))
      fd.append('sc_id', String(scId))
      if (category) fd.append('category', category)
      if (adminId) fd.append('up_by', String(adminId))
      const token = getAccessToken()
      // multipart: fetch โดยตรง — อย่าตั้ง Content-Type เอง (browser ใส่ boundary ให้)
      const res = await fetch(`${API_BASE}attachment/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        let msg = `อัปโหลดไม่สำเร็จ (${res.status})`
        try {
          const j = await res.json()
          if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : String(j.message)
          else if (j?.ms) msg = String(j.ms)
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      return res.json() as Promise<{ flag: boolean; ms: string; att_id?: number }>
    },
    onSuccess: (res) => {
      if (res?.flag) {
        toast.success('แนบไฟล์สำเร็จ')
        qc.invalidateQueries({ queryKey })
      } else {
        toast.error(res?.ms || 'แนบไฟล์ไม่สำเร็จ')
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'แนบไฟล์ไม่สำเร็จ'),
  })

  const remove = useMutation({
    mutationFn: (att: AttachmentItem) =>
      apiPost<{ flag: boolean; ms: string }>('attachment/remove', {
        att_id: att.att_id,
        up_by: adminId,
      }),
    onSuccess: (res) => {
      if (res?.flag) {
        toast.success('ลบไฟล์แล้ว')
        qc.invalidateQueries({ queryKey })
      } else {
        toast.error(res?.ms || 'ลบไฟล์ไม่สำเร็จ')
      }
      setDeleteTarget(null)
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'ลบไฟล์ไม่สำเร็จ')
      setDeleteTarget(null)
    },
  })

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset เพื่อให้เลือกไฟล์เดิมซ้ำได้
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error('รองรับเฉพาะไฟล์ PDF, JPG, PNG, WEBP, GIF เท่านั้น')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('ไฟล์มีขนาดเกิน 10 MB')
      return
    }
    upload.mutate(file)
  }

  async function onView(att: AttachmentItem) {
    setOpening(att.att_id)
    try {
      await openProtectedFile(att.url, att.file_name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'เปิดไฟล์ไม่สำเร็จ')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Paperclip className="h-4 w-4 text-gray-500" />
          {title}
          {items.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 text-xs text-gray-500">
              {items.length}
            </span>
          )}
        </div>
        {!readOnly && enabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              แนบไฟล์
            </Button>
          </>
        )}
      </div>

      <div className="px-3 py-2">
        {!enabled ? (
          <p className="py-2 text-center text-xs text-gray-400">
            บันทึกรายการก่อนจึงจะแนบไฟล์ได้
          </p>
        ) : isLoading ? (
          <p className="py-2 text-center text-xs text-gray-400">กำลังโหลด...</p>
        ) : items.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-400">ยังไม่มีไฟล์แนบ</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((att) => (
              <li key={att.att_id} className="flex items-center gap-2 py-1.5">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-gray-700" title={att.file_name}>
                    {att.file_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {fmtSize(att.size_bytes)}
                    {att.category ? ` · ${att.category}` : ''}
                    {att.note ? ` · ${att.note}` : ''}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(att)}
                  disabled={opening === att.att_id}
                  title="ดู/ดาวน์โหลด"
                >
                  {opening === att.att_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                </Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(att)}
                    title="ลบไฟล์"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="ยืนยันการลบไฟล์"
        description={`ต้องการลบไฟล์ "${deleteTarget?.file_name}" หรือไม่?`}
        confirmLabel="ลบ"
        variant="destructive"
      />
    </div>
  )
}
