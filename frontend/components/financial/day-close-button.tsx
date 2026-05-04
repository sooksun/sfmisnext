'use client'

import * as React from 'react'
import { ClipboardCheck } from 'lucide-react'
import { DayCloseCheckDialog } from './day-close-check-dialog'

interface DayCloseButtonProps {
  scId: number
  syId: number
  checkDate?: string // YYYY-MM-DD (optional — defaults to today inside dialog)
}

export function DayCloseButton({ scId, syId, checkDate }: DayCloseButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        <ClipboardCheck className="h-4 w-4" />
        ตรวจสอบปิดวัน
      </button>

      <DayCloseCheckDialog
        open={open}
        onClose={() => setOpen(false)}
        scId={scId}
        syId={syId}
        checkDate={checkDate}
      />
    </>
  )
}
