import {
  normalizeBudgetYear,
  checkProjectOvercommit,
  checkContractOverOrder,
  checkPayBeforeInspection,
  checkYearMismatch,
  checkInactiveBgType,
} from './guard-rules.util';

describe('guard-rules.util', () => {
  describe('normalizeBudgetYear', () => {
    it('พ.ศ. → ค.ศ.', () => {
      expect(normalizeBudgetYear(2569)).toBe(2026);
      expect(normalizeBudgetYear('2568')).toBe(2025);
    });
    it('ค.ศ. คงเดิม (idempotent)', () => {
      expect(normalizeBudgetYear(2026)).toBe(2026);
    });
    it('ค่าว่าง/ไม่ใช่ตัวเลข → null', () => {
      expect(normalizeBudgetYear(null)).toBeNull();
      expect(normalizeBudgetYear('')).toBeNull();
      expect(normalizeBudgetYear('abc')).toBeNull();
    });
  });

  describe('G1 checkProjectOvercommit', () => {
    it('งบโครงการ = 0 → ไม่บังคับ (ผ่าน)', () => {
      expect(
        checkProjectOvercommit({
          projBudget: 0,
          committedTotal: 0,
          newAmount: 999,
        }).ok,
      ).toBe(true);
    });
    it('ก่อหนี้พอดีวงเงินคงเหลือ → ผ่าน', () => {
      expect(
        checkProjectOvercommit({
          projBudget: 100000,
          committedTotal: 40000,
          newAmount: 60000,
        }).ok,
      ).toBe(true);
    });
    it('ก่อหนี้เกินวงเงินคงเหลือ → ไม่ผ่าน', () => {
      const r = checkProjectOvercommit({
        projBudget: 100000,
        committedTotal: 40000,
        newAmount: 60000.01,
      });
      expect(r.ok).toBe(false);
      expect(r.severity).toBe('error');
    });
    it('EPS: เกินไม่ถึงสตางค์ → ยังผ่าน', () => {
      expect(
        checkProjectOvercommit({
          projBudget: 100000,
          committedTotal: 40000,
          newAmount: 60000.004,
        }).ok,
      ).toBe(true);
    });
  });

  describe('G2 checkContractOverOrder', () => {
    it('สัญญา ≤ คำสั่งซื้อ → ผ่าน', () => {
      expect(
        checkContractOverOrder({ orderBudget: 50000, contractTotal: 50000 }).ok,
      ).toBe(true);
    });
    it('สัญญาเกินคำสั่งซื้อ → ไม่ผ่าน', () => {
      const r = checkContractOverOrder({
        orderBudget: 50000,
        contractTotal: 55000,
      });
      expect(r.ok).toBe(false);
      expect(r.severity).toBe('error');
    });
    it('คำสั่งซื้อ = 0 → ข้าม (ผ่าน)', () => {
      expect(
        checkContractOverOrder({ orderBudget: 0, contractTotal: 55000 }).ok,
      ).toBe(true);
    });
  });

  describe('G3 checkPayBeforeInspection', () => {
    it('ไม่ต้องตรวจรับ (ค่าเดินทาง/เงินยืม) → ผ่าน', () => {
      expect(
        checkPayBeforeInspection({
          requiresInspection: false,
          inspectionPassed: false,
          stockPosted: false,
        }).ok,
      ).toBe(true);
    });
    it('ตรวจรับผ่าน + ลงบัญชีแล้ว → ผ่าน', () => {
      expect(
        checkPayBeforeInspection({
          requiresInspection: true,
          inspectionPassed: true,
          stockPosted: true,
        }).ok,
      ).toBe(true);
    });
    it('ยังไม่ตรวจรับ → ไม่ผ่าน', () => {
      expect(
        checkPayBeforeInspection({
          requiresInspection: true,
          inspectionPassed: false,
          stockPosted: false,
        }).ok,
      ).toBe(false);
    });
    it('ตรวจรับแล้วแต่ยังไม่ลงบัญชี → ไม่ผ่าน', () => {
      expect(
        checkPayBeforeInspection({
          requiresInspection: true,
          inspectionPassed: true,
          stockPosted: false,
        }).ok,
      ).toBe(false);
    });
  });

  describe('G4 checkYearMismatch', () => {
    it('ปีเดียวกัน (พ.ศ./ค.ศ. ปนกันแต่ตรงกัน) → ผ่าน', () => {
      expect(
        checkYearMismatch({
          years: [
            { label: 'โครงการ', year: 2569 },
            { label: 'คำสั่งซื้อ', year: 2026 },
          ],
        }).ok,
      ).toBe(true);
    });
    it('ปีต่างกัน → เตือน', () => {
      const r = checkYearMismatch({
        years: [
          { label: 'โครงการ', year: 2568 },
          { label: 'ใบเบิก', year: 2569 },
        ],
      });
      expect(r.ok).toBe(false);
      expect(r.severity).toBe('warning');
    });
    it('มีค่า null ปนแต่ที่เหลือตรงกัน → ผ่าน', () => {
      expect(
        checkYearMismatch({
          years: [
            { label: 'a', year: 2569 },
            { label: 'b', year: null },
          ],
        }).ok,
      ).toBe(true);
    });
  });

  describe('G5 checkInactiveBgType', () => {
    it('ประเภทเงิน active → ผ่าน', () => {
      expect(checkInactiveBgType({ bgTypeId: 1, isActive: true }).ok).toBe(
        true,
      );
    });
    it('ประเภทเงินไม่ active → เตือน', () => {
      const r = checkInactiveBgType({ bgTypeId: 9, isActive: false });
      expect(r.ok).toBe(false);
      expect(r.severity).toBe('warning');
    });
  });
});
