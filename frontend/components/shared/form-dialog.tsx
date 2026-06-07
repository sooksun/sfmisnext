'use client'
import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
}

export function FormDialog({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'บันทึก',
  loading,
  size = 'md',
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] w-[95vw] flex-col gap-0 p-0',
          sizeMap[size],
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-3">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-3">{children}</div>
        {onSubmit && (
          <DialogFooter className="shrink-0 border-t px-6 py-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              ปิด
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? 'กำลังบันทึก...' : submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
