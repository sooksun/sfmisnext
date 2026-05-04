'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h2 className="text-2xl font-semibold text-red-600">
        เกิดข้อผิดพลาด
      </h2>
      <p className="text-gray-500 max-w-md">
        {error.message || 'ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'}
      </p>
      <Button onClick={reset} variant="outline">
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  )
}
