import { ForbiddenException } from '@nestjs/common';
import { assertSameSchool, isSameSchoolOrSuper, JwtUser } from './tenant-guard';

function makeUser(type: number, scId: number): JwtUser {
  return { admin_id: 1, username: 'test', sc_id: scId, type };
}

describe('assertSameSchool', () => {
  it('Super Admin (type=1) — ข้าม school อื่นได้ ไม่ throw', () => {
    const superAdmin = makeUser(1, 1);
    expect(() => assertSameSchool(superAdmin, 999)).not.toThrow();
  });

  it('Super Admin — ข้ามแม้ sc_id ต่างกันมาก', () => {
    const superAdmin = makeUser(1, 1);
    expect(() => assertSameSchool(superAdmin, 0)).not.toThrow();
  });

  it('Role อื่น (type=2) — sc_id ตรงกัน → ไม่ throw', () => {
    const director = makeUser(2, 5);
    expect(() => assertSameSchool(director, 5)).not.toThrow();
  });

  it('Role อื่น (type=2) — sc_id ไม่ตรง → ForbiddenException', () => {
    const director = makeUser(2, 5);
    expect(() => assertSameSchool(director, 6)).toThrow(ForbiddenException);
  });

  it('Role การเงิน (type=5) — sc_id ไม่ตรง → ForbiddenException', () => {
    const finance = makeUser(5, 3);
    expect(() => assertSameSchool(finance, 4)).toThrow(ForbiddenException);
  });

  it('ข้อความ ForbiddenException มีความหมายชัดเจน', () => {
    const user = makeUser(3, 1);
    try {
      assertSameSchool(user, 2);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toContain('โรงเรียน');
    }
  });

  it('type=1 กับ requestedScId=0 → ไม่ throw (edge case)', () => {
    expect(() => assertSameSchool(makeUser(1, 1), 0)).not.toThrow();
  });

  it('type ≠ 1 กับ sc_id เดียวกัน → ไม่ throw (ทุก role)', () => {
    [2, 3, 4, 5, 6, 7, 8].forEach((type) => {
      expect(() => assertSameSchool(makeUser(type, 10), 10)).not.toThrow();
    });
  });
});

describe('isSameSchoolOrSuper', () => {
  it('Super Admin (type=1) → คืน true เสมอ', () => {
    expect(isSameSchoolOrSuper(makeUser(1, 1), 999)).toBe(true);
    expect(isSameSchoolOrSuper(makeUser(1, 5), 1)).toBe(true);
  });

  it('sc_id ตรงกัน (ไม่ใช่ super) → คืน true', () => {
    expect(isSameSchoolOrSuper(makeUser(2, 7), 7)).toBe(true);
  });

  it('sc_id ไม่ตรง (ไม่ใช่ super) → คืน false', () => {
    expect(isSameSchoolOrSuper(makeUser(2, 7), 8)).toBe(false);
    expect(isSameSchoolOrSuper(makeUser(5, 3), 4)).toBe(false);
  });

  it('คืน boolean เสมอ (ไม่ throw)', () => {
    const result = isSameSchoolOrSuper(makeUser(3, 1), 99);
    expect(typeof result).toBe('boolean');
  });
});
