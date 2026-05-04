import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { Admin } from '../src/modules/admin/entities/admin.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
  entities: [Admin],
  synchronize: false,
});

const ROLES = [
  { type: 1, label: 'Super Admin' },
  { type: 2, label: 'ผอ./Admin โรงเรียน' },
  { type: 3, label: 'ฝ่ายแผนงาน' },
  { type: 4, label: 'งานพัสดุ' },
  { type: 5, label: 'การเงิน' },
  { type: 6, label: 'หัวหน้าแผนงาน' },
  { type: 7, label: 'หัวหน้าพัสดุ' },
  { type: 8, label: 'หัวหน้าการเงิน' },
];

const TEST_PASSWORD = 'Test@1234';
const TEST_SC_ID = 1;

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Admin);

  const md5 = crypto.createHash('md5').update(TEST_PASSWORD).digest('hex');
  let created = 0;
  let existed = 0;

  for (const r of ROLES) {
    const username = `test_role_${r.type}`;
    const existing = await repo.findOne({ where: { username } });

    if (existing) {
      console.log(
        `ℹ ${username} มีอยู่แล้ว (type=${existing.type}, scId=${existing.scId})`,
      );
      existed++;
      continue;
    }

    const admin = repo.create({
      name: `Test ${r.label}`,
      username,
      email: `${username}@test.local`,
      password: md5,
      passwordDefault: TEST_PASSWORD,
      del: 0,
      codeLogin: `E2E_${r.type}`,
      scId: TEST_SC_ID,
      creDate: new Date(),
      upDate: new Date(),
      upBy: 1,
      type: r.type,
      position: r.type,
    });

    await repo.save(admin);
    console.log(`✓ สร้าง ${username} (type=${r.type}, ${r.label})`);
    created++;
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`📊 สรุป: สร้างใหม่ ${created} | มีอยู่แล้ว ${existed}`);
  console.log('═══════════════════════════════════════');
  console.log(`Username pattern: test_role_1 ... test_role_8`);
  console.log(`Password (ทุก user): ${TEST_PASSWORD}`);
  console.log(`scId: ${TEST_SC_ID}`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
