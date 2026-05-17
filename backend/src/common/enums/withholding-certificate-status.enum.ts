/**
 * สถานะหนังสือรับรองหักภาษี ณ ที่จ่าย (withholding_certificate.status)
 */
export const WC_STATUS = {
  /** กำลังดำเนินการ (ยังแก้ไขได้) */
  IN_PROGRESS: 100,
  /** ออกหนังสือแล้ว (ล็อกการแก้ไข) */
  ISSUED: 101,
} as const;

export type WcStatus = (typeof WC_STATUS)[keyof typeof WC_STATUS];
