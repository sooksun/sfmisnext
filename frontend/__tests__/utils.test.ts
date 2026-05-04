import { describe, it, expect } from 'vitest'
import { fmtDateTH, showNumber, toBE, getThaiDate, getThaiDateTime } from '../lib/utils'

// ─── fmtDateTH ────────────────────────────────────────────────────────────────

describe('fmtDateTH', () => {
  it('แปลง YYYY-MM-DD เป็นภาษาไทย พ.ศ.', () => {
    expect(fmtDateTH('2026-04-15')).toBe('15 เม.ย. 2569')
  })

  it('แปลงเดือน ม.ค.', () => {
    expect(fmtDateTH('2026-01-01')).toBe('01 ม.ค. 2569')
  })

  it('แปลงเดือน ธ.ค.', () => {
    expect(fmtDateTH('2025-12-31')).toBe('31 ธ.ค. 2568')
  })

  it('แปลง ISO datetime รวมเวลา', () => {
    expect(fmtDateTH('2026-04-15T11:04:15.256Z')).toBe('15 เม.ย. 2569 11:04 น.')
  })

  it('แปลง SQL datetime (space แทน T)', () => {
    expect(fmtDateTH('2026-04-15 11:04:15')).toBe('15 เม.ย. 2569 11:04 น.')
  })

  it('คืนค่า "" เมื่อรับ null', () => {
    expect(fmtDateTH(null)).toBe('')
  })

  it('คืนค่า "" เมื่อรับ undefined', () => {
    expect(fmtDateTH(undefined)).toBe('')
  })

  it('คืนค่า "" เมื่อรับ empty string', () => {
    expect(fmtDateTH('')).toBe('')
  })

  it('getThaiDate alias ให้ผลเดียวกับ fmtDateTH', () => {
    expect(getThaiDate('2026-04-15')).toBe(fmtDateTH('2026-04-15'))
  })

  it('getThaiDateTime alias ให้ผลเดียวกับ fmtDateTH', () => {
    expect(getThaiDateTime('2026-04-15T11:04:15.000Z')).toBe(fmtDateTH('2026-04-15T11:04:15.000Z'))
  })
})

// ─── showNumber ───────────────────────────────────────────────────────────────

describe('showNumber', () => {
  it('แสดงทศนิยม 2 ตำแหน่ง', () => {
    expect(showNumber(1234.5)).toBe('1,234.50')
  })

  it('ใส่ comma ทุก 3 หลัก', () => {
    expect(showNumber(1234567.89)).toBe('1,234,567.89')
  })

  it('คืน 0.00 เมื่อรับ null', () => {
    expect(showNumber(null)).toBe('0.00')
  })

  it('คืน 0.00 เมื่อรับ undefined', () => {
    expect(showNumber(undefined)).toBe('0.00')
  })

  it('คืน 0.00 เมื่อรับ 0', () => {
    expect(showNumber(0)).toBe('0.00')
  })

  it('จัดการจำนวนลบ', () => {
    expect(showNumber(-500)).toBe('-500.00')
  })
})

// ─── toBE ──────────────────────────────────────────────────────────────────────

describe('toBE', () => {
  it('แปลง CE → BE (+543)', () => {
    expect(toBE(2026)).toBe('2569')
  })

  it('idempotent — ถ้า >= 2400 ไม่บวก 543 ซ้ำ', () => {
    expect(toBE(2569)).toBe('2569')
  })

  it('รับ string CE แปลงถูกต้อง', () => {
    expect(toBE('2026')).toBe('2569')
  })

  it('คืนค่า "" เมื่อรับ null', () => {
    expect(toBE(null)).toBe('')
  })

  it('คืนค่า "" เมื่อรับ undefined', () => {
    expect(toBE(undefined)).toBe('')
  })

  it('คืนค่า "" เมื่อรับ empty string', () => {
    expect(toBE('')).toBe('')
  })
})
