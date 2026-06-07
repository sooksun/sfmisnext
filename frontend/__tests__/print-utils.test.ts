import { describe, it, expect } from 'vitest'
import { numberToThaiBaht, fmtBaht, thaiFullDate } from '../lib/print-utils'

describe('numberToThaiBaht — แปลงตัวเลขเป็นข้อความบาทไทย (ใช้บนเช็ค)', () => {
  it('ศูนย์', () => {
    expect(numberToThaiBaht(0)).toBe('ศูนย์บาทถ้วน')
  })

  it('จำนวนหลักเดียว', () => {
    expect(numberToThaiBaht(1)).toBe('หนึ่งบาทถ้วน')
    expect(numberToThaiBaht(5)).toBe('ห้าบาทถ้วน')
  })

  it('สิบ / สิบเอ็ด (พิเศษ)', () => {
    expect(numberToThaiBaht(10)).toBe('สิบบาทถ้วน')
    expect(numberToThaiBaht(11)).toBe('สิบเอ็ดบาทถ้วน')
  })

  it('ยี่สิบ / ยี่สิบเอ็ด (พิเศษ "ยี่")', () => {
    expect(numberToThaiBaht(20)).toBe('ยี่สิบบาทถ้วน')
    expect(numberToThaiBaht(21)).toBe('ยี่สิบเอ็ดบาทถ้วน')
  })

  it('หลักพัน', () => {
    expect(numberToThaiBaht(1500)).toBe('หนึ่งพันห้าร้อยบาทถ้วน')
  })

  it('มีสตางค์', () => {
    expect(numberToThaiBaht(100.5)).toBe('หนึ่งร้อยบาทห้าสิบสตางค์')
    expect(numberToThaiBaht(1.25)).toBe('หนึ่งบาทยี่สิบห้าสตางค์')
  })

  it('จำนวนติดลบ', () => {
    expect(numberToThaiBaht(-5)).toBe('ลบห้าบาทถ้วน')
  })

  it('ค่าที่ไม่ใช่ตัวเลข (Infinity/NaN) → "-"', () => {
    expect(numberToThaiBaht(Infinity)).toBe('-')
    expect(numberToThaiBaht(NaN)).toBe('-')
  })

  it('ปัดเศษสตางค์ (2 ตำแหน่ง)', () => {
    // 0.005 ปัดเป็น 1 สตางค์ (int=0 → conv คืน '' ไม่ขึ้น "ศูนย์")
    expect(numberToThaiBaht(0.005)).toBe('บาทหนึ่งสตางค์')
  })
})

describe('fmtBaht — จัดรูปแบบเงิน 2 ตำแหน่ง', () => {
  it('null/undefined → เท่ากับ 0', () => {
    expect(fmtBaht(null)).toBe(fmtBaht(0))
    expect(fmtBaht(undefined)).toBe(fmtBaht(0))
  })

  it('คืนค่าที่มีทศนิยม 2 ตำแหน่งเสมอ', () => {
    expect(fmtBaht(1500.5)).toMatch(/50$/)
    expect(fmtBaht(0)).toMatch(/00$/)
  })

  it('ไม่ throw กับค่าปกติ', () => {
    expect(typeof fmtBaht(1234567.89)).toBe('string')
  })
})

describe('thaiFullDate — วันที่ไทยเต็ม (พ.ศ.)', () => {
  it('null/ว่าง → "-"', () => {
    expect(thaiFullDate(null)).toBe('-')
    expect(thaiFullDate('')).toBe('-')
    expect(thaiFullDate(undefined)).toBe('-')
  })

  it('วันที่ไม่ถูกต้อง → "-"', () => {
    expect(thaiFullDate('not-a-date')).toBe('-')
  })

  it('แปลง YYYY-MM-DD เป็น พ.ศ. ถูกต้อง (ชื่อเดือนเต็ม)', () => {
    // 2026-04-15 → 15 เมษายน 2569
    expect(thaiFullDate('2026-04-15')).toBe('15 เมษายน 2569')
  })

  it('รองรับรูปแบบ SQL (เว้นวรรค)', () => {
    expect(thaiFullDate('2026-04-15 04:29:15')).toBe('15 เมษายน 2569')
  })
})
