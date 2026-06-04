/**
 * procurement-rules.util.ts
 *
 * กฎการเลือกวิธีจัดซื้อจัดจ้างตามวงเงิน (พ.ร.บ.จัดซื้อจัดจ้างฯ 2560 ม.55–56)
 * ฟังก์ชัน pure — ทดสอบได้ และนำไปใช้ได้ทั้ง backend/แสดงผล frontend
 */

export const PROCUREMENT_METHOD = {
  EBIDDING: 1, // วิธีประกาศเชิญชวนทั่วไป (e-bidding)
  SELECTIVE: 2, // วิธีคัดเลือก
  SPECIFIC: 3, // วิธีเฉพาะเจาะจง
  MARKET: 4, // วิธีตลาดอิเล็กทรอนิกส์
} as const;

export const METHOD_NAMES: Record<number, string> = {
  1: 'ประกาศเชิญชวนทั่วไป (e-bidding)',
  2: 'คัดเลือก',
  3: 'เฉพาะเจาะจง',
  4: 'ตลาดอิเล็กทรอนิกส์',
};

/**
 * แนะนำวิธีจัดซื้อตามวงเงิน
 *  - วงเงิน ≤ specificMax (default 500,000) → เฉพาะเจาะจง
 *  - เกินกว่านั้น → คัดเลือก/e-bidding
 */
export function suggestMethod(amount: number, specificMax: number): number {
  return amount <= specificMax
    ? PROCUREMENT_METHOD.SPECIFIC
    : PROCUREMENT_METHOD.SELECTIVE;
}

export interface MethodCheckInput {
  methodType: number;
  amount: number;
  specificMax: number;
  isUrgent: boolean;
  hasUrgentClause: boolean;
}

export interface MethodCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * ตรวจว่าวิธีจัดซื้อที่เลือก สอดคล้องกับวงเงินตามระเบียบหรือไม่
 * กฎหลัก: วิธีเฉพาะเจาะจงใช้ได้เมื่อวงเงิน ≤ specificMax
 *         เว้นแต่เป็นกรณีเร่งด่วน (ม.56(2)) ที่ระบุมาตราอ้างอิงไว้
 */
export function checkMethodCompliance(i: MethodCheckInput): MethodCheckResult {
  if (
    i.methodType === PROCUREMENT_METHOD.SPECIFIC &&
    i.amount > i.specificMax
  ) {
    if (i.isUrgent && i.hasUrgentClause) return { ok: true };
    return {
      ok: false,
      reason:
        `วงเงิน ${i.amount.toLocaleString('th-TH')} บาท เกิน ${i.specificMax.toLocaleString('th-TH')} บาท ` +
        `ไม่สามารถใช้วิธีเฉพาะเจาะจงได้ ต้องใช้วิธีคัดเลือกหรือ e-bidding ` +
        `(เว้นแต่กรณีเร่งด่วนตาม ม.56(2) พร้อมระบุมาตราอ้างอิง)`,
    };
  }
  return { ok: true };
}
