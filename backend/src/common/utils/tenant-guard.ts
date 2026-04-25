import { ForbiddenException } from '@nestjs/common';

/**
 * ผู้ใช้ที่ผ่าน JwtStrategy.validate() — มี shape นี้ (req.user)
 */
export interface JwtUser {
  admin_id: number;
  username: string;
  sc_id: number;
  type: number; // 1=Super Admin, 2=ผอ., ฯลฯ
}

/**
 * Super Admin (admin.type = 1) ข้าม school ได้
 * Role อื่นทั้งหมดต้อง sc_id ตรงกับ JWT
 */
const SUPER_ADMIN_TYPE = 1;

/**
 * ป้องกัน multi-tenant leak — ตรวจว่า scId ที่ขอเข้าถึงตรงกับ JWT user.sc_id
 *
 * ใช้ทุก endpoint ที่รับ sc_id จาก path/body/query เพื่อกัน:
 *   user โรงเรียน A ส่ง sc_id ของโรงเรียน B → เห็นข้อมูลของ B
 *
 * Super Admin (type=1) ข้ามได้ — เพราะมีสิทธิ์ดูข้ามโรงเรียน
 *
 * @throws ForbiddenException ถ้า sc_id ไม่ตรง (และไม่ใช่ super admin)
 */
export function assertSameSchool(user: JwtUser, requestedScId: number): void {
  if (user.type === SUPER_ADMIN_TYPE) return;
  if (user.sc_id !== requestedScId) {
    throw new ForbiddenException('ไม่สามารถดูหรือแก้ไขข้อมูลของโรงเรียนอื่นได้');
  }
}

/**
 * เหมือน assertSameSchool แต่คืน boolean แทน throw
 * ใช้กรณีที่ logic ต้องการแยก response ตาม role
 */
export function isSameSchoolOrSuper(
  user: JwtUser,
  requestedScId: number,
): boolean {
  return user.type === SUPER_ADMIN_TYPE || user.sc_id === requestedScId;
}
