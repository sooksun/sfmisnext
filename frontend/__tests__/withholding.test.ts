import { describe, it, expect } from 'vitest'
import { calcWithholding } from '../lib/utils/withholding'

describe('calcWithholding', () => {
  describe('calVat = 0 (ไม่มี VAT)', () => {
    it('คำนวณหัก 1% จากยอดรวม', () => {
      const result = calcWithholding(1000, 0)
      expect(result.gross).toBe(1000)
      expect(result.vatAmount).toBe(0)
      expect(result.withholdAmount).toBe(10)     // 1000 * 1%
      expect(result.netPayable).toBe(990)
    })

    it('ยอด 5000 บาท ไม่มี VAT', () => {
      const result = calcWithholding(5000, 0)
      expect(result.withholdAmount).toBe(50)
      expect(result.netPayable).toBe(4950)
    })
  })

  describe('calVat = 1 (มี VAT 7%)', () => {
    it('คำนวณ base = amount×100/107 แล้วหัก 1%', () => {
      // amount=1070 → base=1000, vat=70, withhold=10, net=1060
      const result = calcWithholding(1070, 1)
      expect(result.base).toBe(1000)
      expect(result.vatAmount).toBe(70)
      expect(result.withholdAmount).toBe(10)
      expect(result.netPayable).toBe(1060)
    })

    it('ยอด 535 บาท (รวม VAT)', () => {
      // base=500, vat=35, withhold=5, net=530
      const result = calcWithholding(535, 1)
      expect(result.base).toBe(500)
      expect(result.vatAmount).toBe(35)
      expect(result.withholdAmount).toBe(5)
      expect(result.netPayable).toBe(530)
    })
  })

  it('withholdRate เสมอ 0.01', () => {
    expect(calcWithholding(100, 0).withholdRate).toBe(0.01)
    expect(calcWithholding(100, 1).withholdRate).toBe(0.01)
  })
})
