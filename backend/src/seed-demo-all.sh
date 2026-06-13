#!/usr/bin/env bash
# seed-demo-all.sh — รีเซ็ต transaction + จำลองข้อมูลครบ 2 โรงเรียน + 1 เขตพื้นที่
# Run (Git Bash): cd backend && bash src/seed-demo-all.sh
#
# ผลลัพธ์:
#   - เขตพื้นที่ areacode 36 มี 2 โรงเรียน + เจ้าหน้าที่เขต type=9
#   - โรงเรียน sc_id=1 (เต็มสเกล) และ sc_id=2 (สเกล 0.65) ข้อมูลครบ แผน→พัสดุ→การเงิน
#   - ทุก user เดโม รหัสผ่าน Demo@123
set -e
cd "$(dirname "$0")/.."

echo "===== 1) โรงเรียน 2 + เจ้าหน้าที่เขต (idempotent) ====="
npx ts-node src/seed-demo-area.ts

echo "===== 2) รีเซ็ตทั้งหมด + seed โรงเรียน 1 (scale 1.0) ====="
SEED_SC_ID=1 SEED_TRUNCATE=1 SEED_SCALE=1 npx ts-node src/reset-sample.ts

echo "===== 3) seed โรงเรียน 2 (scale 0.65, ไม่ล้าง) ====="
SEED_SC_ID=2 SEED_TRUNCATE=0 SEED_SCALE=0.65 SEED_ADMIN_ID=1 \
  SEED_SCHOOL_NAME='โรงเรียนบ้านเดโมวิทยา' SEED_AREACODE=36 \
  npx ts-node src/reset-sample.ts

echo "===== 4) จัดเจ้าหน้าที่เขต (type=9) ให้ areacode 36 ครอบทั้ง 2 โรงเรียน ====="
npx ts-node -e "
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv'; dotenv.config();
(async () => {
  const ds = new DataSource({ type:'mysql', host:process.env.DB_HOST||'localhost', port:Number(process.env.DB_PORT)||3306, username:process.env.DB_USER||'root', password:process.env.DB_PASS||'', database:process.env.DB_NAME||'sfmisystem' });
  await ds.initialize();
  await ds.query(\"UPDATE admin SET areacode='36' WHERE type=9 AND del=0\");
  await ds.destroy();
  console.log('✔ area staff → areacode 36');
})();
"

echo ""
echo "✓ เสร็จสิ้น: 2 โรงเรียน (sc_id 1,2) ใต้เขต areacode 36 + เจ้าหน้าที่เขต"
