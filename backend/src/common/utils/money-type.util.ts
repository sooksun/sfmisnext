/**
 * ตัวช่วยจัดการประเภทเงิน (master_budget_income_type.budget_borrow_type)
 *
 *  '1' = ยืมได้      → เงินนอกงบประมาณที่ยืมไปจัดกิจกรรมได้ (ลงช่อง "ลูกหนี้" ในทะเบียนคุม)
 *  '2' = ยืมไม่ได้   → ค่าเริ่มต้น
 *  '3' = รายได้แผ่นดิน → นำส่งคลัง ห้ามยืม/ใช้ข้ามวัตถุประสงค์
 *
 * ประเภทที่ยืมได้ตามคู่มือ (ปรับเพิ่ม/ลดได้ที่หน้า ตั้งค่า > ประเภทเงิน):
 *   - เงินอุดหนุนทั่วไป (ค่าใช้จ่ายรายหัว)
 *   - เงินอุดหนุนทั่วไป (เรียนฟรี 15 ปี)
 *   - เงินอุดหนุนโครงการอาหารกลางวัน จาก อปท.
 */
export const BORROW_TYPE = {
  BORROWABLE: '1',
  NOT_BORROWABLE: '2',
  STATE_REVENUE: '3',
} as const;

/**
 * ประเภทเงินนี้ "ยืมได้" หรือไม่ (budget_borrow_type === '1')
 * รองรับทั้ง string ('1') และ number (1) เพราะข้อมูลบาง path เป็นตัวเลข
 */
export function isBorrowable(
  borrowType: string | number | null | undefined,
): boolean {
  return String(borrowType ?? '').trim() === BORROW_TYPE.BORROWABLE;
}
