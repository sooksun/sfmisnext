/**
 * ตัวช่วยแปลงปี พ.ศ./ค.ศ. และคำนวณปีงบประมาณ — ใช้ร่วมทั้ง backend
 * (แทนการเขียน inline `n >= 2400 ? n - 543 : n` กระจายหลายไฟล์)
 *
 * ปีงบประมาณไทย: เริ่ม 1 ต.ค. – 30 ก.ย. — เดือน ต.ค.-ธ.ค. นับเป็นปีงบถัดไป
 */

/** แปลงเป็น พ.ศ. (idempotent: ถ้า ≥ 2400 ถือว่าเป็น พ.ศ. อยู่แล้ว) */
export function toBE(year: number): number {
  return year >= 2400 ? year : year + 543;
}

/** แปลงเป็น ค.ศ. (idempotent: ถ้า < 2400 ถือว่าเป็น ค.ศ. อยู่แล้ว) */
export function toCE(year: number): number {
  return year >= 2400 ? year - 543 : year;
}

/** ปีงบประมาณ พ.ศ. ของวันที่ (ต.ค.-ธ.ค. = ปีงบถัดไป) */
export function budgetYearBEOf(d: Date): number {
  const be = d.getFullYear() + 543;
  return d.getMonth() >= 9 ? be + 1 : be;
}

/** ปีงบประมาณ พ.ศ. ปัจจุบัน */
export function currentBudgetYearBE(now: Date = new Date()): number {
  return budgetYearBEOf(now);
}

/** สิ้นปีงบประมาณ (30 ก.ย.) ของปีงบ พ.ศ. ที่ระบุ — คืน Date (ค.ศ.) หรือ null ถ้ารูปแบบผิด */
export function fiscalYearEndCE(budgetYearBE: string | number): Date | null {
  const be = typeof budgetYearBE === 'number' ? budgetYearBE : parseInt(budgetYearBE, 10);
  if (!be || be < 2400) return null;
  return new Date(be - 543, 8, 30, 23, 59, 59);
}
