/**
 * seed-demo-all.ts — รีเซ็ต transaction + จำลองข้อมูลครบ 2 โรงเรียน + 1 เขตพื้นที่
 *
 * Run (PowerShell): cd backend ; npx ts-node src/seed-demo-all.ts
 *
 * ผลลัพธ์:
 *   - เขตพื้นที่ areacode 36 มี 2 โรงเรียน + เจ้าหน้าที่เขต type=9
 *   - โรงเรียน sc_id=1 (เต็มสเกล) และ sc_id=2 (สเกล 0.65) ข้อมูลครบ แผน→พัสดุ→การเงิน
 *   - ทุก user เดโม รหัสผ่าน Demo@123
 */
import 'reflect-metadata';
import { spawnSync } from 'child_process';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const ROOT = path.resolve(__dirname, '..');

function runSeed(script: string, env: Record<string, string> = {}): void {
  const mergedEnv = { ...process.env, ...env } as NodeJS.ProcessEnv;

  // บน Windows ต้องเรียก npx.cmd (batch wrapper) โดยตรงเพื่อหลีกเลี่ยง DEP0190
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npxBin, ['ts-node', `src/${script}`], {
    cwd: ROOT,
    env: mergedEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(`\n✗ ${script} failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

async function fixAreacodeAll(): Promise<void> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sfmisystem',
  });
  await ds.initialize();
  await ds.query("UPDATE admin SET areacode='36' WHERE type=9 AND del=0");
  await ds.destroy();
  console.log('✔ area staff → areacode 36');
}

async function main(): Promise<void> {
  console.log('===== 1) โรงเรียน 2 + เจ้าหน้าที่เขต (idempotent) =====');
  runSeed('seed-demo-area.ts');

  console.log('\n===== 2) รีเซ็ตทั้งหมด + seed โรงเรียน 1 (scale 1.0) =====');
  runSeed('reset-sample.ts', {
    SEED_SC_ID: '1',
    SEED_TRUNCATE: '1',
    SEED_SCALE: '1',
  });

  console.log('\n===== 3) seed โรงเรียน 2 (scale 0.65, ไม่ล้าง) =====');
  runSeed('reset-sample.ts', {
    SEED_SC_ID: '2',
    SEED_TRUNCATE: '0',
    SEED_SCALE: '0.65',
    SEED_ADMIN_ID: '1',
    SEED_SCHOOL_NAME: 'โรงเรียนบ้านเดโมวิทยา',
    SEED_AREACODE: '36',
  });

  console.log('\n===== 4) จัดเจ้าหน้าที่เขต (type=9) ให้ areacode 36 ครอบทั้ง 2 โรงเรียน =====');
  await fixAreacodeAll();

  console.log('\n✓ เสร็จสิ้น: 2 โรงเรียน (sc_id 1,2) ใต้เขต areacode 36 + เจ้าหน้าที่เขต');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
