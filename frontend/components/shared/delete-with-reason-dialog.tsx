'use client'
import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle } from 'lucide-react'

interface DeleteWithReasonDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
  title?: string
  itemLabel?: string
  loading?: boolean
  requireReason?: boolean
}

export function DeleteWithReasonDialog({
  open,
  onClose,
  onConfirm,
  title = 'ยืนยันการลบข้อมูล',
  itemLabel,
  loading = false,
  requireReason = true,
}: DeleteWithReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setReason(''); setError('') }
  }, [open])

  const handleConfirm = async () => {
    const trimmed = reason.trim()
    if (requireReason && !trimmed) {
      setError('กรุณากรอกเหตุผลการลบ')
      return
    }
    await onConfirm(trimmed)
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            การลบจะไม่สามารถย้อนกลับได้ โปรดระบุเหตุผลเพื่อบันทึกลง log
            {itemLabel && (
              <span className="block mt-2 text-gray-800 font-medium">
                รายการ: <span className="font-mono">{itemLabel}</span>
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label htmlFor="delete-reason" className="text-sm">
            เหตุผลการลบ {requireReason && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            placeholder="เช่น กรอกข้อมูลผิด, รายการซ้ำ, ฯลฯ"
            rows={3}
            className="mt-1"
            disabled={loading}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'กำลังลบ...' : 'ยืนยันการลบ'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
