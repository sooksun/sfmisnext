/**
 * สถานะของใบสำคัญจ่าย (request_withdraw.status)
 *
 * Flow:
 *   DRAFT (0)
 *     → PRECHECK_PENDING (50) — รอเจ้าหน้าที่ตรวจฎีกา
 *     → PRECHECK_FAILED (51) — ตรวจไม่ผ่าน (ส่งกลับแก้)
 *     → PRECHECK_PASSED (100) — รอหัวหน้าอนุมัติ
 *     → HEAD_REJECTED (101) — หัวหน้าไม่อนุมัติ
 *     → HEAD_APPROVED (102) — หัวหน้าอนุมัติ
 *     → DIRECTOR_APPROVED (200) — ผอ. อนุมัติ (พร้อมออกเช็ค)
 *     → CHECK_CANCELLED (201) — ยกเลิกเช็ค
 *     → CHECK_ISSUED (202) — ออกเช็คแล้ว
 */
export const INVOICE_STATUS = {
  DRAFT: 0,
  PRECHECK_PENDING: 50,
  PRECHECK_FAILED: 51,
  PRECHECK_PASSED: 100,
  HEAD_REJECTED: 101,
  HEAD_APPROVED: 102,
  DIRECTOR_APPROVED: 200,
  CHECK_CANCELLED: 201,
  CHECK_ISSUED: 202,
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

/**
 * ใบที่ผ่านขั้นตอน ผอ. อนุมัติแล้ว (พร้อมออกเช็ค / ยกเลิก / ออกแล้ว)
 * ใช้กรอง list ของ check.service และ withholding-certificate
 */
export const INVOICE_APPROVED_THRESHOLD = INVOICE_STATUS.DIRECTOR_APPROVED;

/**
 * สถานะที่ owner ยังแก้ไขฟอร์มได้ — draft + ตรวจไม่ผ่าน (ส่งกลับแก้)
 */
export const INVOICE_EDITABLE_STATUSES: ReadonlySet<number> = new Set([
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.PRECHECK_FAILED,
]);
