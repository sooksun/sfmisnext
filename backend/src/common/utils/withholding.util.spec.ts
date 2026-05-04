import { calcWithholding } from './withholding.util';

describe('calcWithholding', () => {
  describe('calVat = 1 (มี VAT 7%)', () => {
    it('คำนวณฐาน, VAT, และยอดหักถูกต้อง', () => {
      // amount = 10,700 → base = 10,000, vat = 700, withhold = 100, net = 10,600
      const result = calcWithholding(10700, 1);
      expect(result.gross).toBe(10700);
      expect(result.base).toBeCloseTo(10000, 1);
      expect(result.vatAmount).toBeCloseTo(700, 1);
      expect(result.withholdRate).toBe(0.01);
      expect(result.withholdAmount).toBeCloseTo(100, 1);
      expect(result.netPayable).toBeCloseTo(10600, 1);
    });

    it('amount = 107 → base=100, vat=7, withhold=1, net=106', () => {
      const result = calcWithholding(107, 1);
      expect(result.base).toBeCloseTo(100, 2);
      expect(result.vatAmount).toBeCloseTo(7, 2);
      expect(result.withholdAmount).toBeCloseTo(1, 2);
      expect(result.netPayable).toBeCloseTo(106, 2);
    });

    it('amount = 5350 (ครึ่งหนึ่งของ 10700)', () => {
      const result = calcWithholding(5350, 1);
      expect(result.base).toBeCloseTo(5000, 1);
      expect(result.withholdAmount).toBeCloseTo(50, 1);
      expect(result.netPayable).toBeCloseTo(5300, 1);
    });
  });

  describe('calVat = 2 (ไม่มี VAT)', () => {
    it('ฐาน = gross, vat = 0, หัก 1% ของ gross', () => {
      const result = calcWithholding(10000, 2);
      expect(result.gross).toBe(10000);
      expect(result.base).toBe(10000);
      expect(result.vatAmount).toBe(0);
      expect(result.withholdAmount).toBe(100);
      expect(result.netPayable).toBe(9900);
    });

    it('amount = 50000', () => {
      const result = calcWithholding(50000, 2);
      expect(result.withholdAmount).toBe(500);
      expect(result.netPayable).toBe(49500);
    });
  });

  describe('calVat = 0 (ไม่มี VAT — ค่าอื่นที่ไม่ใช่ 1)', () => {
    it('ใช้สูตรเดียวกับ calVat=2', () => {
      const r0 = calcWithholding(20000, 0);
      const r2 = calcWithholding(20000, 2);
      expect(r0).toEqual(r2);
    });
  });

  describe('edge cases', () => {
    it('amount = 0', () => {
      const result = calcWithholding(0, 1);
      expect(result.gross).toBe(0);
      expect(result.withholdAmount).toBe(0);
      expect(result.netPayable).toBe(0);
    });

    it('ปัดเศษทศนิยม 2 ตำแหน่ง', () => {
      // 1000/107 * 100 = 934.5794... → round to 934.58
      const result = calcWithholding(1000, 1);
      expect(result.base).toBe(934.58);
      expect(result.vatAmount).toBe(65.42);
      expect(result.withholdAmount).toBe(9.35);
    });
  });
});
