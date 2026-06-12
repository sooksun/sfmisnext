'use client'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnomalyWarning } from '@/hooks/use-anomaly-precheck'

/**
 * กล่องแสดงคำเตือนค่าผิดปกติ (L2) — แสดงเหนือปุ่มบันทึกของฟอร์ม
 * ไม่บล็อก แค่เตือนให้ตรวจทาน
 */
export function AnomalyWarnings({
  warnings,
  onDismiss,
}: {
  warnings: AnomalyWarning[]
  onDismiss?: () => void
}) {
  if (!warnings || warnings.length === 0) return null
  const hasWarn = warnings.some((w) => w.severity === 'warning')

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        hasWarn ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <AlertTriangle className={cn('h-4 w-4', hasWarn ? 'text-amber-500' : 'text-blue-500')} />
          โปรดตรวจทานก่อนบันทึก
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm">
            {w.severity === 'warning' ? (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
            ) : (
              <Info className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
            )}
            <span className={hasWarn ? 'text-amber-800' : 'text-blue-800'}>{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
