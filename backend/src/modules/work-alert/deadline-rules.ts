/**
 * ตัวช่วยคำนวณวัน/งวด สำหรับ DeadlineEngine (ปฏิทินการเงิน แบบ ระบบควบคุมหน่วยงานย่อย 2544)
 */

export interface ComputedAlert {
  rule_code: string;
  period: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  link: string;
  due_date: string; // YYYY-MM-DD
  assignee_role: string; // comma เช่น "5,8"
}

/** BE → CE (เช่น 2569 → 2026) */
export function ceYear(budgetYearBE: string): number | null {
  const be = parseInt(budgetYearBE, 10);
  if (!be || be < 2400) return null;
  return be - 543;
}

/** สิ้นปีงบประมาณ = 30 ก.ย. ของ ค.ศ. (BE-543) */
export function fiscalYearEnd(budgetYearBE: string): Date | null {
  const ce = ceYear(budgetYearBE);
  return ce ? atEnd(new Date(ce, 8, 30)) : null;
}

/** ช่วงเดือนของปีงบ: Oct(BE-1ปฏิทิน)–Sep — คืน [start,end] เป็น ค.ศ. */
export function fiscalRange(budgetYearBE: string): { start: Date; end: Date } | null {
  const ce = ceYear(budgetYearBE);
  if (!ce) return null;
  return { start: new Date(ce - 1, 9, 1), end: atEnd(new Date(ce, 8, 30)) };
}

export function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** YYYY-MM (ค.ศ.) ของเดือน */
export function ymKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
}

export function atEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** เดือนก่อนหน้าของวันที่ today (คืน Date วันแรกของเดือนก่อน) */
export function prevMonthStart(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() - 1, 1);
}

/** วันที่ N ของเดือนปัจจุบัน */
export function dayOfThisMonth(today: Date, day: number): Date {
  return new Date(today.getFullYear(), today.getMonth(), day);
}

/** ชื่อเดือนไทยย่อจาก 0-11 */
const TH_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
export function thMonth(d: Date): string {
  return `${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
