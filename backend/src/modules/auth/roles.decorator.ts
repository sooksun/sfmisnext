import { SetMetadata } from '@nestjs/common';

/**
 * Admin type ตามฐานข้อมูล (tb_admin.type):
 *  1 = Super Admin
 *  2 = Admin โรงเรียน / ผู้อำนวยการ
 *  3 = ฝ่ายแผนงาน
 *  4 = งานพัสดุ
 *  5 = การเงิน (เจ้าหน้าที่การเงิน)
 *  6 = หัวแผนงาน
 *  7 = หัวหน้าพัสดุ
 *  8 = หัวหน้าการเงิน
 *
 * กลุ่ม role สำหรับ signDaily:
 *  FINANCE_TYPES    (signer_role=1): 5, 8
 *  COMMITTEE_TYPES  (signer_role=2): 3, 4, 5, 6, 7
 *  DIRECTOR_TYPES   (signer_role=3): 1, 2
 */
export const ROLES_KEY = 'roles';

export const FINANCE_TYPES = [5, 8] as const;
export const COMMITTEE_TYPES = [3, 4, 5, 6, 7] as const;
export const DIRECTOR_TYPES = [1, 2] as const;

/** ใช้ @Roles(1) หรือ @Roles(1, 2) บน endpoint ที่ต้องจำกัดสิทธิ์ตาม admin.type */
export const Roles = (...roles: number[]) => SetMetadata(ROLES_KEY, roles);
