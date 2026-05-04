/**
 * Tests for pagination logic — validateable without DOM
 */
import { describe, it, expect } from 'vitest'

// ─── Helper: simulate the same pageSize cap logic as PageSizePipe ──────────────
const MAX_PAGE_SIZE = 500
function validatePageSize(value: string | number): number {
  const n = parseInt(String(value), 10)
  if (isNaN(n) || n < 1) throw new Error('pageSize ต้องมากกว่า 0')
  return Math.min(n, MAX_PAGE_SIZE)
}

describe('PageSize validation (frontend mirror of PageSizePipe)', () => {
  it('คืนค่าปกติถ้า <= 500', () => {
    expect(validatePageSize(10)).toBe(10)
    expect(validatePageSize(500)).toBe(500)
  })

  it('cap ที่ 500 ถ้าใส่มากกว่า', () => {
    expect(validatePageSize(999999)).toBe(500)
    expect(validatePageSize(501)).toBe(500)
  })

  it('throw ถ้า pageSize = 0', () => {
    expect(() => validatePageSize(0)).toThrow()
  })

  it('throw ถ้า pageSize ติดลบ', () => {
    expect(() => validatePageSize(-1)).toThrow()
  })

  it('แปลง string เป็น number ได้', () => {
    expect(validatePageSize('20')).toBe(20)
  })

  it('throw ถ้าเป็น string ที่ไม่ใช่ตัวเลข', () => {
    expect(() => validatePageSize('abc')).toThrow()
  })
})

// ─── Helper: page offset calculation ─────────────────────────────────────────
function calcOffset(page: number, pageSize: number): number {
  return Math.max(0, page) * pageSize
}

describe('Page offset', () => {
  it('page 0 → offset 0', () => {
    expect(calcOffset(0, 10)).toBe(0)
  })

  it('page 1 → offset = pageSize', () => {
    expect(calcOffset(1, 10)).toBe(10)
  })

  it('negative page → treat as 0', () => {
    expect(calcOffset(-1, 10)).toBe(0)
  })
})
