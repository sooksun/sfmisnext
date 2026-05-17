/**
 * Role / Admin type (admin.type column)
 *
 * อ้างอิง: backend/src/modules/admin/entities/admin.entity.ts
 */
export const ADMIN_TYPE = {
  SUPER_ADMIN: 1,
  DIRECTOR: 2, // ผอ.
  ACCOUNTANT: 3, // เจ้าหน้าที่การเงิน
  PROCUREMENT: 4, // เจ้าหน้าที่พัสดุ
  PRECHECK: 5, // เจ้าหน้าที่ตรวจฎีกา
  PLANNER: 6, // เจ้าหน้าที่นโยบาย/แผน
  COMMITTEE: 7, // คณะกรรมการ
  AUDITOR: 8, // ผู้ตรวจสอบ
} as const;

export type AdminType = (typeof ADMIN_TYPE)[keyof typeof ADMIN_TYPE];
