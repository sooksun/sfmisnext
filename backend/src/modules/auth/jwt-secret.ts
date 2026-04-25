import * as os from 'os';
import { ConfigService } from '@nestjs/config';

/**
 * Single source of truth สำหรับ JWT secret
 * ใช้ทั้งใน auth.module.ts (sign) และ jwt.strategy.ts (verify)
 * เพื่อกัน drift ระหว่าง 2 ที่ — ถ้า secret ต่างกัน token valid แต่ verify fail
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) return secret;

  if (config.get('NODE_ENV') === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production',
    );
  }

  console.warn(
    '⚠️  JWT_SECRET ไม่ได้ตั้งค่า — ใช้ dev fallback (ห้ามใช้ใน production!)',
  );
  return 'dev-only-fallback-' + os.hostname();
}
