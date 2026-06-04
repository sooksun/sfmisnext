import {
  suggestMethod,
  checkMethodCompliance,
  PROCUREMENT_METHOD,
} from './procurement-rules.util';

describe('procurement-rules.util', () => {
  describe('suggestMethod', () => {
    it('วงเงิน ≤ 500,000 → เฉพาะเจาะจง', () => {
      expect(suggestMethod(500000, 500000)).toBe(PROCUREMENT_METHOD.SPECIFIC);
      expect(suggestMethod(1000, 500000)).toBe(PROCUREMENT_METHOD.SPECIFIC);
    });
    it('วงเงิน > 500,000 → คัดเลือก', () => {
      expect(suggestMethod(500001, 500000)).toBe(PROCUREMENT_METHOD.SELECTIVE);
      expect(suggestMethod(2000000, 500000)).toBe(PROCUREMENT_METHOD.SELECTIVE);
    });
  });

  describe('checkMethodCompliance', () => {
    const base = {
      methodType: PROCUREMENT_METHOD.SPECIFIC,
      specificMax: 500000,
      isUrgent: false,
      hasUrgentClause: false,
    };

    it('เฉพาะเจาะจง วงเงินไม่เกินเกณฑ์ → ผ่าน', () => {
      expect(checkMethodCompliance({ ...base, amount: 400000 }).ok).toBe(true);
    });

    it('เฉพาะเจาะจง วงเงินเกิน 500,000 → ไม่ผ่าน (block)', () => {
      const r = checkMethodCompliance({ ...base, amount: 600000 });
      expect(r.ok).toBe(false);
      expect(r.reason).toContain('เฉพาะเจาะจง');
    });

    it('เฉพาะเจาะจง วงเงินเกิน แต่เป็นกรณีเร่งด่วน + ระบุมาตรา → ผ่าน', () => {
      const r = checkMethodCompliance({
        ...base,
        amount: 600000,
        isUrgent: true,
        hasUrgentClause: true,
      });
      expect(r.ok).toBe(true);
    });

    it('เร่งด่วนแต่ไม่ระบุมาตราอ้างอิง → ไม่ผ่าน', () => {
      const r = checkMethodCompliance({
        ...base,
        amount: 600000,
        isUrgent: true,
        hasUrgentClause: false,
      });
      expect(r.ok).toBe(false);
    });

    it('วิธีคัดเลือกวงเงินสูง → ผ่าน (ไม่ติดกฎเฉพาะเจาะจง)', () => {
      const r = checkMethodCompliance({
        ...base,
        methodType: PROCUREMENT_METHOD.SELECTIVE,
        amount: 5000000,
      });
      expect(r.ok).toBe(true);
    });
  });
});
