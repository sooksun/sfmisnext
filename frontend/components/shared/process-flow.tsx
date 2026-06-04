'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROCESS_FLOWS } from '@/lib/process-flows'

interface ProcessFlowProps {
  /** คีย์สายงาน: 'pay' | 'procure' */
  flow: string
  /** ส่งต่อ query string ไปหน้าถัดไป (เช่น 'rw_id=12') — optional */
  carryQuery?: string
}

/**
 * แถบแสดง "ขั้นตอนการทำงาน" + ปุ่มไปขั้นถัดไป/ก่อนหน้า (page handoff)
 * วางไว้ใต้ PageHeader ของหน้าที่อยู่ในสายงานต่อเนื่อง
 * ตรวจขั้นปัจจุบันอัตโนมัติจาก pathname
 */
export function ProcessFlow({ flow, carryQuery }: ProcessFlowProps) {
  const pathname = usePathname()
  const def = PROCESS_FLOWS[flow]
  if (!def) return null

  // หาขั้นปัจจุบันจาก pathname (เลือกขั้นที่ href ตรง/เป็น prefix ที่ยาวที่สุด)
  let currentIdx = -1
  let bestLen = -1
  def.steps.forEach((s, i) => {
    if ((pathname === s.href || pathname.startsWith(s.href + '/')) && s.href.length > bestLen) {
      currentIdx = i
      bestLen = s.href.length
    }
  })
  if (currentIdx === -1) return null

  const prev = currentIdx > 0 ? def.steps[currentIdx - 1] : null
  const next = currentIdx < def.steps.length - 1 ? def.steps[currentIdx + 1] : null
  const q = carryQuery ? `?${carryQuery}` : ''

  return (
    <div className="mx-4 mt-3 mb-1 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
      {/* หัวข้อสายงาน */}
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-indigo-700">
        <Route className="h-3.5 w-3.5" />
        <span>{def.title}</span>
        <span className="text-indigo-400 font-normal">
          · ขั้นที่ {currentIdx + 1}/{def.steps.length}
        </span>
      </div>

      {def.automations && def.automations.length > 0 && (
        <div className="mb-2 rounded-md border border-indigo-100 bg-white/70 px-2.5 py-1.5 text-xs text-indigo-700">
          <span className="font-semibold">ระบบช่วยทำ:</span>{' '}
          <span>{def.automations.join(' · ')}</span>
        </div>
      )}

      {/* แถบขั้นตอน (stepper) */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {def.steps.map((s, i) => {
          const done = i < currentIdx
          const active = i === currentIdx
          const isLast = i === def.steps.length - 1
          return (
            <div key={s.href} className="flex items-center shrink-0">
              <Link
                href={`${s.href}${q}`}
                title={s.hint}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  active && 'bg-indigo-600 text-white shadow-sm',
                  done && 'bg-green-100 text-green-700 hover:bg-green-200',
                  !active && !done && 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                    active && 'bg-white/25',
                    done && 'bg-green-200',
                    !active && !done && 'bg-gray-100 text-gray-500'
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </Link>
              {!isLast && <span className="mx-0.5 text-gray-300">›</span>}
            </div>
          )
        })}
      </div>

      {/* ปุ่มก่อนหน้า / ถัดไป */}
      <div className="flex items-center justify-between mt-2 gap-2">
        {prev ? (
          <Link
            href={`${prev.href}${q}`}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            ก่อนหน้า: {prev.label}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`${next.href}${q}`}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            ขั้นต่อไป: {next.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <Check className="h-3.5 w-3.5" />
            ขั้นตอนสุดท้าย
          </span>
        )}
      </div>
    </div>
  )
}
