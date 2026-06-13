/**
 * seed-demo-area.ts — ข้อมูลเดโม: โรงเรียนจำลองเพิ่ม 1 แห่ง + สำนักงานเขตพื้นที่ 1 แห่ง
 *   - โรงเรียนใหม่ (areacode 37) พร้อม school_year ปีงบ 2569 + ครู/เจ้าหน้าที่
 *   - สำนักงานเขตพื้นที่ (areacode 37) พร้อมเจ้าหน้าที่ระดับเขต (type=9)
 *
 * Run: cd backend && npx ts-node src/seed-demo-area.ts
 * Idempotent: รันซ้ำได้ (ข้ามถ้ามีข้อมูล demo อยู่แล้ว — เช็คด้วย username/areacode)
 *
 * ทุก user รหัสผ่าน: Demo@123
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const AREACODE = '37'; // สำนักงานเขตพื้นที่เดโม
const SCHOOL_NAME = 'โรงเรียนบ้านเดโมวิทยา';
const DEMO_PASSWORD = 'Demo@123';

// ปีงบ 2569 (BE) = ค.ศ. 2026; school_year เก็บ BE, transactional เก็บ CE
const BUDGET_YEAR_BE = 2569;
const FY_START = '2025-10-01';
const FY_END = '2026-09-30';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
});

interface UserSeed {
  name: string;
  username: string;
  type: number; // 2=ผอ 3=แผน 4=พัสดุ 5=การเงิน 6=หัวหน้าแผน 7=หัวหน้าพัสดุ 8=หัวหน้าการเงิน 9=เขตพื้นที่
  position: number;
}

// ครู/เจ้าหน้าที่ในโรงเรียนใหม่
const SCHOOL_USERS: UserSeed[] = [
  { name: 'นายเดโม วิทยาคม', username: 'demo_director', type: 2, position: 2 },
  { name: 'นางสาวแผนงาน ใจดี', username: 'demo_plan_head', type: 6, position: 4 },
  { name: 'นายวิชาการ ตั้งใจ', username: 'demo_plan', type: 3, position: 4 },
  { name: 'นางการเงิน รอบคอบ', username: 'demo_finance', type: 5, position: 5 },
  { name: 'นายพัสดุ ขยัน', username: 'demo_supply', type: 4, position: 5 },
  { name: 'นางสาวครูเดโม หนึ่ง', username: 'demo_teacher1', type: 3, position: 6 },
  { name: 'นายครูเดโม สอง', username: 'demo_teacher2', type: 3, position: 6 },
];

// เจ้าหน้าที่ระดับเขตพื้นที่ (type=9, ผูก areacode)
const AREA_USERS: UserSeed[] = [
  { name: 'นายเขตพื้นที่ อำนวยการ', username: 'area_director', type: 9, position: 1 },
  { name: 'นางตรวจสอบ เขตการเงิน', username: 'area_finance', type: 9, position: 5 },
  { name: 'นายนิเทศ ติดตามผล', username: 'area_supervisor', type: 9, position: 3 },
];

async function userExists(username: string): Promise<boolean> {
  const rows = (await AppDataSource.query(
    'SELECT admin_id FROM admin WHERE username = ? LIMIT 1',
    [username],
  )) as Array<{ admin_id: number }>;
  return rows.length > 0;
}

async function insertUser(u: UserSeed, scId: number, hash: string) {
  if (await userExists(u.username)) {
    console.log(`  - skip (มีอยู่แล้ว): ${u.username}`);
    return;
  }
  await AppDataSource.query(
    `INSERT INTO admin
       (name, username, email, password, password_default, type, position, sc_id, areacode, del, cre_date, up_by, up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), 1, NOW())`,
    [
      u.name,
      u.username,
      `${u.username}@demo.sfmis`,
      hash,
      DEMO_PASSWORD,
      u.type,
      u.position,
      scId,
      u.type === 9 ? AREACODE : null,
    ],
  );
  console.log(`  + ${u.username} (type=${u.type})`);
}

async function main() {
  await AppDataSource.initialize();
  console.log('Seeding demo area + school...');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1) โรงเรียนใหม่ (idempotent)
  let scId: number;
  const existing = (await AppDataSource.query(
    'SELECT sc_id FROM school WHERE sc_name = ? AND del = 0 LIMIT 1',
    [SCHOOL_NAME],
  )) as Array<{ sc_id: number }>;
  if (existing.length) {
    scId = existing[0].sc_id;
    console.log(`โรงเรียนมีอยู่แล้ว: ${SCHOOL_NAME} (sc_id=${scId})`);
  } else {
    const res = (await AppDataSource.query(
      `INSERT INTO school
         (smis, sc_code, sc_name, areacode, type, tumbol, p_code, tel, low_class, top_clsass, del, up_by, up_date)
       VALUES (?, ?, ?, ?, 1, ?, 57, ?, ?, ?, 0, 1, NOW())`,
      [37000001, 37000001, SCHOOL_NAME, AREACODE, 'ตำบลเดโม', '053-000037', 'อ.1', 'ป.6'],
    )) as { insertId: number };
    scId = res.insertId;
    console.log(`+ โรงเรียนใหม่: ${SCHOOL_NAME} (sc_id=${scId}, areacode=${AREACODE})`);
  }

  // 2) school_year ของโรงเรียนใหม่ (ปีงบ 2569)
  const syExist = (await AppDataSource.query(
    'SELECT sy_id FROM school_year WHERE sc_id = ? AND budget_year = ? AND del = 0 LIMIT 1',
    [scId, BUDGET_YEAR_BE],
  )) as Array<{ sy_id: number }>;
  if (!syExist.length) {
    await AppDataSource.query(
      `INSERT INTO school_year
         (sy_year, semester, sy_date_s, sy_date_e, sc_id, budget_year, budget_date_s, budget_date_e, del, cre_date)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [BUDGET_YEAR_BE, '2026-05-16', FY_END, scId, BUDGET_YEAR_BE, FY_START, FY_END],
    );
    console.log(`+ school_year ปีงบ ${BUDGET_YEAR_BE} ของ sc_id=${scId}`);
  } else {
    console.log(`school_year ปีงบ ${BUDGET_YEAR_BE} มีอยู่แล้ว`);
  }

  // 3) ครู/เจ้าหน้าที่ในโรงเรียนใหม่
  console.log('ผู้ใช้ในโรงเรียนใหม่:');
  for (const u of SCHOOL_USERS) await insertUser(u, scId, hash);

  // 4) เจ้าหน้าที่ระดับเขตพื้นที่ (type=9, areacode 37) — sc_id ชี้โรงเรียนใหม่เป็น default
  console.log('เจ้าหน้าที่ระดับเขตพื้นที่ (areacode ' + AREACODE + '):');
  for (const u of AREA_USERS) await insertUser(u, scId, hash);

  console.log('\n✓ เสร็จสิ้น — ทุก user รหัสผ่าน: ' + DEMO_PASSWORD);
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
