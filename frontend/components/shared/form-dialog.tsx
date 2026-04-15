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
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
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
      <DialogContent className={cn('w-full', sizeMap[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{children}</div>
        {onSubmit && (
          <DialogFooter>
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
