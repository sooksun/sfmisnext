'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function SfmisError({
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
      <div className="rounded-full bg-red-100 p-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">
        เกิดข้อผิดพลาดในการโหลดหน้านี้
      </h2>
      <p className="text-gray-500 max-w-md text-sm">
        {error.message || 'กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          ลองใหม่
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'} variant="default">
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  )
}
