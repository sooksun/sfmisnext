import { SetMetadata } from '@nestjs/common';

/** ใช้ @Public() บน endpoint ที่ไม่ต้องการ JWT token */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
