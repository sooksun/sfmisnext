'use client'
/**
 * ThaiDatePicker
 * - แสดงปีเป็นพุทธศักราช (CE + 543)
 * - รับ/คืนค่าเป็น "YYYY-MM-DD" (CE) เพื่อส่ง API
 * - ไม่ต้องติดตั้ง package เพิ่ม
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── ค่าคงที่ภาษาไทย ────────────────────────────────────────────────────────

const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const MONTHS_SHORT_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]
const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

// ── helpers ───────────────────────────────────────────────────────────────────

/** CE year → BE year */
const toBE = (ce: number) => ce + 543

/** "YYYY-MM-DD" (CE) → display string in Thai format */
function formatDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT_TH[m - 1]} ${toBE(y)}`
}

/** Date → "YYYY-MM-DD" (CE) */
function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Number of days in a given month (CE year) */
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** Day-of-week index for 1st day of month (0=Sun) */
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThaiDatePickerProps {
  value?: string           // "YYYY-MM-DD" CE, อาจเป็น "" หรือ undefined
  onChange?: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ThaiDatePicker({
  value = '',
  onChange,
  placeholder = 'เลือกวันที่',
  disabled = false,
  className,
  id,
}: ThaiDatePickerProps) {
  // วันที่ที่ calendar กำลังแสดงอยู่
  const today = new Date()
  const initYear  = value ? Number(value.split('-')[0]) : today.getFullYear()
  const initMonth = value ? Number(value.split('-')[1]) - 1 : today.getMonth()

  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)
  const [pickingYear, setPickingYear] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // ── sync view เมื่อ value เปลี่ยนจากภายนอก ───────────────────────────────
  useEffect(() => {
    if (value) {
      setViewYear(Number(value.split('-')[0]))
      setViewMonth(Number(value.split('-')[1]) - 1)
    }
  }, [value])

  // ── click-outside → close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPickingYear(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── navigation ────────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) }
    else setViewMonth(v => v - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) }
    else setViewMonth(v => v + 1)
  }

  // ── select a day ──────────────────────────────────────────────────────────

  const selectDay = useCallback((day: number) => {
    const iso = toIso(new Date(viewYear, viewMonth, day))
    onChange?.(iso)
    setOpen(false)
    setPickingYear(false)
  }, [viewYear, viewMonth, onChange])

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  // ── build calendar grid ───────────────────────────────────────────────────

  const totalDays  = daysInMonth(viewYear, viewMonth)
  const startDay   = firstDayOfMonth(viewYear, viewMonth)

  // selected day ถ้าอยู่ในเดือน/ปีที่แสดง
  let selectedDay: number | null = null
  if (value) {
    const [sy, sm, sd] = value.split('-').map(Number)
    if (sy === viewYear && sm - 1 === viewMonth) selectedDay = sd
  }

  // today day ถ้าอยู่ในเดือน/ปีที่แสดง
  let todayDay: number | null = null
  if (today.getFullYear() === viewYear && today.getMonth() === viewMonth) {
    todayDay = today.getDate()
  }

  // cells: null = empty slot, number = day
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  // ── year picker range ─────────────────────────────────────────────────────

  const yearRange: number[] = Array.from({ length: 20 }, (_, i) => viewYear - 10 + i)

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setPickingYear(false) }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-indigo-500 ring-2 ring-indigo-300',
        )}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <X
              className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700"
              onClick={clearValue}
            />
          )}
          <CalendarDays className="h-4 w-4 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg',
          'left-0',
        )}>
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Month / Year toggle */}
            <button
              type="button"
              onClick={() => setPickingYear(p => !p)}
              className="rounded px-2 py-0.5 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              {MONTHS_TH[viewMonth]} {toBE(viewYear)}
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {pickingYear ? (
            /* ── Year picker grid ── */
            <div className="grid grid-cols-4 gap-1 p-2 max-h-52 overflow-y-auto">
              {yearRange.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => { setViewYear(yr); setPickingYear(false) }}
                  className={cn(
                    'rounded px-1 py-1.5 text-xs hover:bg-indigo-50',
                    yr === viewYear && 'bg-indigo-600 text-white hover:bg-indigo-700',
                  )}
                >
                  {toBE(yr)}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* ── Day-of-week header ── */}
              <div className="grid grid-cols-7 border-b px-2 pt-2 pb-1">
                {DAYS_TH.map(d => (
                  <div key={d} className="text-center text-[11px] font-medium text-gray-500">
                    {d}
                  </div>
                ))}
              </div>

              {/* ── Calendar grid ── */}
              <div className="grid grid-cols-7 gap-y-0.5 p-2">
                {cells.map((day, idx) =>
                  day === null ? (
                    <div key={`e-${idx}`} />
                  ) : (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm',
                        'hover:bg-indigo-100',
                        day === selectedDay && 'bg-indigo-600 text-white hover:bg-indigo-700',
                        day === todayDay && day !== selectedDay && 'border border-indigo-400 text-indigo-600 font-semibold',
                      )}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>

              {/* ── Footer: วันนี้ ── */}
              <div className="border-t px-3 py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => selectDay(today.getDate())}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  วันนี้ ({formatDisplay(toIso(today))})
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
