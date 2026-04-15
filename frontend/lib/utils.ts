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

// Convert date string "YYYY-MM-DD" to Thai format (short year offset: e.g., "43" not "2543")
export function getThaiDate(date: string): string {
  if (!date) return ''
  const parts = date.split('-')
  if (parts.length < 3) return ''
  const day = parts[2]
  const month = parseInt(parts[1], 10) - 1
  const yearBE = parseInt(parts[0], 10) + 543 - 2500
  return `${day} ${THAI_MONTHS[month]} ${yearBE}`
}

// Convert datetime string "YYYY-MM-DD HH:MM:SS" to Thai format
export function getThaiDateTime(date: string): string {
  if (!date) return ''
  const [datePart, timePart] = date.split(' ')
  if (!datePart || !timePart) return getThaiDate(datePart || date)
  const parts = datePart.split('-')
  const timeParts = timePart.split(':')
  const day = parts[2]
  const month = parseInt(parts[1], 10) - 1
  const yearBE = parseInt(parts[0], 10) + 543
  return `${day} ${THAI_MONTHS[month]} ${yearBE} ${timeParts[0]}:${timeParts[1]} น.`
}

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
