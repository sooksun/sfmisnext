import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { FiscalYearBalance } from '../src/modules/fiscal-year-balance/entities/fiscal-year-balance.entity';
import { BudgetIncomeType } from '../src/modules/policy/entities/budget-income-type.entity';
import { Admin } from '../src/modules/admin/entities/admin.entity';

dotenv.config();

/**
 * Test data: ปิดบัญชีปีงบประมาณ 2568 (ยอดคงเหลือ ณ 30 ก.ย. 2568)
 *  - สร้าง fiscal_year_balance 5 ประเภทเงิน (is_final=1 = ปิดบัญชีแล้ว)
 *  - หน้า "1.2 เงินเหลือจ่ายปีเก่า" (ปีงบ 2569) จะดึงยอดเหล่านี้มาแสดงให้ติ๊กเลือกนำเข้า
 *
 * รัน: cd backend && npx ts-node scripts/seed-fiscal-close-2568.ts
 */

const BUDGET_YEAR = '2568';
const CLOSING_DATE = '2025-09-30'; // 30 ก.ย. 2568 (CE)
const LOGIN_USERNAME = 'admin_local'; // ใช้หา sc_id ของโรงเรียนที่ล็อกอินทดสอบ

// ยอดคงเหลือต่อประเภทเงิน (เรียงตามลำดับประเภทเงินที่พบในระบบ) — cash / bank / smp
const BALANCE_PRESETS: Array<{ cash: number; bank: number; smp: number }> = [
  { cash: 5000, bank: 120000, smp: 0 }, // ประเภทที่ 1 → 125,000
  { cash: 0, bank: 45500, smp: 0 }, // ประเภทที่ 2 → 45,500
  { cash: 3200, bank: 0, smp: 0 }, // ประเภทที่ 3 → 3,200
  { cash: 0, bank: 0, smp: 18000 }, // ประเภทที่ 4 → 18,000 (เงินฝาก สพป.)
  { cash: 1000, bank: 9000, smp: 0 }, // ประเภทที่ 5 → 10,000
];

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
  entities: [FiscalYearBalance, BudgetIncomeType, Admin],
  synchronize: false,
});

async function main() {
  await AppDataSource.initialize();
  const fybRepo = AppDataSource.getRepository(FiscalYearBalance);
  const typeRepo = AppDataSource.getRepository(BudgetIncomeType);
  const adminRepo = AppDataSource.getRepository(Admin);

  // 1) หา sc_id + ผู้ปิดบัญชี จากบัญชีล็อกอินทดสอบ
  const admin =
    (await adminRepo.findOne({ where: { username: LOGIN_USERNAME } })) ??
    (await adminRepo.findOne({ where: { del: 0 } }));
  if (!admin) {
    throw new Error('ไม่พบบัญชีผู้ใช้สำหรับอ้างอิง sc_id (admin)');
  }
  const scId = admin.scId ?? 1;
  const closedBy = admin.adminId;
  const closedByName = admin.name ?? admin.username ?? null;
  console.log(`→ ใช้ sc_id=${scId} (จาก ${admin.username}), ปิดบัญชีโดย "${closedByName}"`);

  // 2) เลือกประเภทเงิน 5 ประเภทแรกที่ใช้งานอยู่
  const types = await typeRepo.find({
    where: { del: 0 },
    order: { bgTypeId: 'ASC' },
    take: BALANCE_PRESETS.length,
  });
  if (types.length === 0) {
    throw new Error('ไม่พบประเภทเงิน (master_budget_income_type) — รัน npm run seed ก่อน');
  }

  // 3) ลบยอดปิดปี 2568 เดิมของโรงเรียนนี้ (idempotent)
  await fybRepo.delete({ scId, budgetYear: BUDGET_YEAR });

  // 4) สร้างยอดปิดบัญชีปี 2568
  let total = 0;
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const p = BALANCE_PRESETS[i] ?? { cash: 0, bank: 0, smp: 0 };
    const totalBalance = p.cash + p.bank + p.smp;
    total += totalBalance;
    await fybRepo.save(
      fybRepo.create({
        scId,
        budgetYear: BUDGET_YEAR,
        moneyTypeId: t.bgTypeId,
        moneyTypeName: t.budgetType,
        cashBalance: p.cash,
        bankBalance: p.bank,
        smpBalance: p.smp,
        totalBalance,
        closingDate: CLOSING_DATE,
        closedBy,
        closedByName,
        isFinal: 1, // ปิดบัญชีแล้ว
        note: '[test-data] ปิดบัญชีปีงบ 2568',
        upBy: closedBy,
        del: 0,
      }),
    );
    console.log(
      `  ✓ ${t.budgetType} — เงินสด ${p.cash.toLocaleString()} / ธนาคาร ${p.bank.toLocaleString()} / สพป. ${p.smp.toLocaleString()} = ${totalBalance.toLocaleString()}`,
    );
  }

  console.log(
    `\n✅ ปิดบัญชีปีงบ ${BUDGET_YEAR} เรียบร้อย — ${types.length} ประเภทเงิน รวม ${total.toLocaleString()} บาท (is_final=1)`,
  );
  console.log('   เปิดหน้า "1.2 เงินเหลือจ่ายปีเก่า" (ปีงบ 2569) เพื่อตรวจสอบ');

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error('❌ seed ล้มเหลว:', e);
  process.exit(1);
});
