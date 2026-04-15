import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number with comma and 2 decimal places
export function showNumber(number: number | null | undefined): string {
  if (number === null || number === undefined || isNaN(Number(number))) {
    return '0.00'
  }
  return parseFloat(number.toString()).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
}

// Thai month names abbreviated
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// Convert a year value (CE or already-BE) to Buddhist Era.
// If the year is already >= 2400 we treat it as BE and return as-is (idempotent).
// Non-numeric input returns empty string.
export function toBE(year: number | string | null | undefined): string {
  if (year === null || year === undefined || year === '') return ''
  const n = Number(year)
  if (!Number.isFinite(n)) return String(year)
  if (n >= 2400) return String(n)
  return String(n + 543)
}

/**
 * fmtDateTH — แปลงวันที่เป็น พ.ศ. ภาษาไทย (ปีเต็ม เช่น 2569)
 * รองรับ:
 *   "YYYY-MM-DD"              → "15 เม.ย. 2569"
 *   "YYYY-MM-DDTHH:mm:ss.sssZ" (ISO) → "15 เม.ย. 2569 11:04 น."
 *   "YYYY-MM-DD HH:mm:ss"    → "15 เม.ย. 2569 11:04 น."
 *   null / "" → ""
 */
export function fmtDateTH(date: string | null | undefined): string {
  if (!date) return ''
  // Normalise: แทน T ด้วย space, ตัด timezone suffix (Z, +07:00 ฯลฯ)
  const normalised = date.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/[+-]\d{2}:\d{2}$/, '').trim()
  const spaceIdx = normalised.indexOf(' ')
  const datePart = spaceIdx !== -1 ? normalised.slice(0, spaceIdx) : normalised
  const timePart = spaceIdx !== -1 ? normalised.slice(spaceIdx + 1) : ''
  const parts = datePart.split('-')
  if (parts.length < 3) return date
  const day   = parts[2].padStart(2, '0')
  const month = parseInt(parts[1], 10) - 1
  const yearBE = parseInt(parts[0], 10) + 543
  const dateStr = `${day} ${THAI_MONTHS[month]} ${yearBE}`
  if (!timePart) return dateStr
  const [hh, mm] = timePart.split(':')
  return `${dateStr} ${hh}:${mm} น.`
}

// Alias ที่ใช้งานอยู่เดิม — ชี้ไปที่ fmtDateTH
export function getThaiDate(date: string): string { return fmtDateTH(date) }
export function getThaiDateTime(date: string): string { return fmtDateTH(date) }

// Parse date to YYYY-MM-DD format
export function parseDate(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1 > 9 ? (d.getMonth() + 1).toString() : '0' + (d.getMonth() + 1)
  return d.getFullYear() + '-' + month + '-' + d.getDate()
}

// Get localStorage year data (client-side only)
export function getYearData(): { sy_year: number; sy_id: number; budget_year: number; budget_id: number } | null {
  if (typeof window === 'undefined') return null
  const year = localStorage.getItem('years')
  if (!year) return null
  try {
    const parsed = JSON.parse(year)
    return {
      sy_year: parsed.sy_date?.sy_year ?? 0,
      sy_id: parsed.sy_date?.sy_id ?? 0,
      budget_year: (parsed.budget_date?.budget_year ?? 0) + 543,
      budget_id: parsed.budget_date?.sy_id ?? 0,
    }
  } catch {
    return null
  }
}
