import {
  toBE,
  toCE,
  budgetYearBEOf,
  currentBudgetYearBE,
  fiscalYearEndCE,
} from './year.util';
import { ok, fail } from './response.util';

describe('year.util', () => {
  it('toBE/toCE idempotent', () => {
    expect(toBE(2026)).toBe(2569);
    expect(toBE(2569)).toBe(2569); // อยู่แล้ว ไม่บวกซ้ำ
    expect(toCE(2569)).toBe(2026);
    expect(toCE(2026)).toBe(2026);
  });

  it('budgetYearBEOf: ต.ค.-ธ.ค. = ปีงบถัดไป', () => {
    expect(budgetYearBEOf(new Date(2025, 9, 1))).toBe(2569); // 1 ต.ค. 2025 → 2569
    expect(budgetYearBEOf(new Date(2026, 8, 30))).toBe(2569); // 30 ก.ย. 2026 → 2569
    expect(budgetYearBEOf(new Date(2026, 9, 1))).toBe(2570); // 1 ต.ค. 2026 → 2570
  });

  it('currentBudgetYearBE ใช้ budgetYearBEOf', () => {
    expect(currentBudgetYearBE(new Date(2025, 11, 15))).toBe(2569);
  });

  it('fiscalYearEndCE: 30 ก.ย. ของ ค.ศ. (BE-543)', () => {
    const e = fiscalYearEndCE('2569')!;
    expect(e.getFullYear()).toBe(2026);
    expect(e.getMonth()).toBe(8); // ก.ย.
    expect(e.getDate()).toBe(30);
    expect(fiscalYearEndCE('abc')).toBeNull();
  });
});

describe('response.util', () => {
  it('ok/fail สร้าง {flag, ms} + แนบ extra', () => {
    expect(ok('สำเร็จ')).toEqual({ flag: true, ms: 'สำเร็จ' });
    expect(fail('ผิดพลาด')).toEqual({ flag: false, ms: 'ผิดพลาด' });
    expect(ok('สร้างแล้ว', { id: 5 })).toEqual({ flag: true, ms: 'สร้างแล้ว', id: 5 });
  });
});
