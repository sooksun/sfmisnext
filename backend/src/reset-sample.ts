/**
 * reset-sample.ts — Reset transactional data + seed coherent sample
 * โรงเรียนบ้านพญาไพร จำลอง · ปีงบประมาณ 2569 · 1 ต.ค. 2568 – 10 พ.ค. 2569
 *
 * Run: cd backend && npx ts-node src/reset-sample.ts
 *
 * Master data (master_classroom, master_budget_income_type, master_budget_category,
 * bank_db, tb_type_supplies, tb_unit, master_*_policy, main_register) is preserved.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const SC_ID = 1;
const ADMIN_ID = 1;
const SCHOOL_NAME = 'โรงเรียนบ้านพญาไพร จำลอง';

// ปีงบประมาณ 2569 ครอบคลุม 1 ต.ค. 2568 – 30 ก.ย. 2569
// ⚠ frontend อ่าน school_year.budget_year (BE) แล้วลบ 543 ก่อนส่ง API
//   ดังนั้น transactional tables ต้องเก็บ CE format (2026) ไม่ใช่ BE (2569)
const BUDGET_YEAR_BE = 2569; // ใช้กับ school_year เท่านั้น
const BUDGET_YEAR = 2026; // ใช้กับ transactional tables ทุกตาราง (CE)
const FY_START = new Date('2025-10-01'); // 1 ต.ค. 2568 CE
const FY_END = new Date('2026-09-30'); // 30 ก.ย. 2569 CE
const DATA_END = new Date('2026-05-10'); // จุดสิ้นสุดข้อมูลตามผู้ใช้กำหนด

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
  // ใช้ raw query เป็นหลัก (เร็วและคุมลำดับ FK ได้)
});

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isoDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function padLeft(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

let counter = 1;
function nextSeq(): number {
  return counter++;
}

// -----------------------------------------------------------------------------
// 1. ล้างข้อมูล transactional (เก็บ master)
// -----------------------------------------------------------------------------
// ⚠ truncate ด้วย SET FOREIGN_KEY_CHECKS=0 → ลำดับไม่สำคัญ
// รายการนี้ครอบคลุม "ทุกตาราง transactional" (อัปเดตให้ครบหลังเพิ่มฟีเจอร์ compliance)
// เก็บไว้ไม่ลบ: admin, school, migrations, master_*, bank_db, main_register,
//   tb_type_supplies, tb_unit, cash_reserve_limit, regulatory_threshold (config)
const TRANSACTIONAL_TABLES = [
  // ── การเงิน / บัญชี ──
  'financial_transactions',
  'financial_audit_log',
  'opening_balance',
  'fiscal_year_balance',
  'cash_keeping_record',
  'bank_ledger_entry',
  'bank_reconciliation_item',
  'bank_reconciliation',
  'smp_deposit_entry',
  'gov_revenue_entry',
  'monthly_submission',
  'document_counter',
  'receipt_book',
  'tb_intra_bank_transfer',
  // ── เงินยืม ──
  'loan_return_evidence',
  'loan_agreement',
  'fund_borrowing',
  // ── รับเงิน / ใบเสร็จ ──
  'withholding_certificate',
  'receipt',
  'pln_receive_detail',
  'pln_receive',
  // ── เบิกจ่าย / เช็ค ──
  'check_receive_committee',
  'request_withdraw',
  'budget_request',
  'tb_invoice_pre_audit',
  'tb_expenses',
  // ── จัดซื้อจัดจ้าง / พัสดุ ──
  'sup_contract_security',
  'sup_contract_penalty',
  'sup_contract',
  'sup_inspection',
  'sup_annual_check',
  'sup_disposal',
  'supplie_request_detail',
  'supplie_request',
  'receive_parcel_detail',
  'receive_parcel_order',
  'tb_transaction_supplies',
  'tb_fixed_asset_depreciation',
  'tb_fixed_asset',
  'parcel_detail',
  'parcel_order',
  'pln_proj_approve',
  'pln_procurement_plan_item',
  'pln_procurement_plan',
  'pln_egp_announcement',
  'tb_supplies',
  // ── แผน / โครงการ / งบ ──
  'pln_project_followup',
  'pln_project',
  'pln_budget_transfer',
  'pln_real_budget',
  'pln_budget_category_detail',
  'pln_budget_category',
  'tb_estimate_acadyear',
  // ── นักเรียน ──
  'submitting_student_records',
  'tb_student',
  // ── คู่ค้า / บัญชีธนาคาร / mapping ──
  'tb_partner',
  'budget_income_type_school',
  'bankaccount',
  // ── log ──
  'tb_delete_log',
  // เก็บ school_year ไว้ก่อน แล้ว reseed
  'school_year',
];

async function truncateTransactional() {
  console.log('▶ ล้างข้อมูล transactional ...');
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TRANSACTIONAL_TABLES) {
    try {
      await AppDataSource.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`  ✔ ${t}`);
    } catch (e) {
      console.warn(`  ⚠ ${t}: ${(e as Error).message}`);
    }
  }
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}

// -----------------------------------------------------------------------------
// 2. School + SchoolYear
// -----------------------------------------------------------------------------
async function seedSchool() {
  await AppDataSource.query(
    `UPDATE school SET sc_name = ?, areacode = ?, tumbol = ?, p_code = ?, tel = ?, low_class = ?, top_clsass = ?, del = 0 WHERE sc_id = ?`,
    [SCHOOL_NAME, '36', 'เทอดไทย', 57, '053-730222', 'อ.1', 'ม.3', SC_ID],
  );
  console.log(`▶ School: ${SCHOOL_NAME}`);
}

let SY_ID_FIRST_SEM = 0; // ภาคเรียนที่ 2/2568 (Oct 2568 - Mar 2569)
let SY_ID_SECOND_SEM = 0; // ภาคเรียนที่ 1/2569 (May 2569 - Sep 2569)

async function seedSchoolYear() {
  // ภาคเรียนที่ 2/2568 — ส.ค. 2568 ถึง 31 มี.ค. 2569
  const r1 = await AppDataSource.query(
    `INSERT INTO school_year (sy_year, semester, sy_date_s, sy_date_e, budget_year, budget_date_s, budget_date_e, sc_id, up_by, del, cre_date, up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [
      2568,
      2,
      '2025-11-01',
      '2026-03-31',
      BUDGET_YEAR_BE, // school_year เก็บ BE
      isoDate(FY_START),
      isoDate(FY_END),
      SC_ID,
      ADMIN_ID,
    ],
  );
  SY_ID_FIRST_SEM = r1.insertId;

  // ภาคเรียนที่ 1/2569 — 16 พ.ค. 2569 ถึง 30 ก.ย. 2569 (ครอบเฉพาะส่วนใน budget year)
  const r2 = await AppDataSource.query(
    `INSERT INTO school_year (sy_year, semester, sy_date_s, sy_date_e, budget_year, budget_date_s, budget_date_e, sc_id, up_by, del, cre_date, up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [
      2569,
      1,
      '2026-05-16',
      '2026-09-30',
      BUDGET_YEAR_BE, // school_year เก็บ BE
      isoDate(FY_START),
      isoDate(FY_END),
      SC_ID,
      ADMIN_ID,
    ],
  );
  SY_ID_SECOND_SEM = r2.insertId;

  console.log(
    `▶ SchoolYear: sy_id=${SY_ID_FIRST_SEM} (2/2568) + ${SY_ID_SECOND_SEM} (1/2569), budget_year=${BUDGET_YEAR_BE} (BE), API year=${BUDGET_YEAR} (CE)`,
  );
}

/** map วันที่ → sy_id */
function syIdForDate(d: Date): number {
  // ก่อน 16 พ.ค. 2569 → ภาค 2/2568 (รวมช่วง 1 ต.ค. 2568 - 31 มี.ค. 2569 และระหว่างปิดเทอม)
  return d < new Date('2026-05-16') ? SY_ID_FIRST_SEM : SY_ID_SECOND_SEM;
}

// -----------------------------------------------------------------------------
// 3. Partner (คู่ค้า/ผู้รับเงิน)
// -----------------------------------------------------------------------------
const PARTNERS: Array<{
  name: string;
  type: number; // 1 บุคคล, 2 นิติบุคคล
  payType: number; // 1 ภายใน, 2 ภายนอก
  calVat: number; // 0/1/2
  tax?: string;
}> = [
  {
    name: 'ร้านพญาไพรเครื่องเขียน',
    type: 2,
    payType: 2,
    calVat: 0,
    tax: '3571200123456',
  },
  {
    name: 'ร้านวัสดุก่อสร้างเทอดไทย',
    type: 2,
    payType: 2,
    calVat: 1,
    tax: '3571200234567',
  },
  {
    name: 'ร้านคอมพ์&ไอที แม่ฟ้าหลวง',
    type: 2,
    payType: 2,
    calVat: 1,
    tax: '3571200345678',
  },
  {
    name: 'ห้างหุ้นส่วนจำกัด เชียงรายภัณฑ์',
    type: 2,
    payType: 2,
    calVat: 1,
    tax: '0573555000010',
  },
  {
    name: 'นางสาว สมหญิง ใจดี (แม่ค้าผัก)',
    type: 1,
    payType: 2,
    calVat: 0,
    tax: '1571200456789',
  },
  {
    name: 'นาย ประยุทธ์ ก้าวหน้า (รับเหมา)',
    type: 1,
    payType: 2,
    calVat: 0,
    tax: '3571200567890',
  },
  { name: 'นาย วิชัย คุ้มทอง — ครู (ภายใน)', type: 1, payType: 1, calVat: 2 },
  {
    name: 'นาง สมศรี รุ่งเรือง — ครูพี่เลี้ยง (ภายใน)',
    type: 1,
    payType: 1,
    calVat: 2,
  },
];

const partnerIds: number[] = [];

async function seedPartners() {
  for (const p of PARTNERS) {
    const r = await AppDataSource.query(
      `INSERT INTO tb_partner (p_type, p_name, pay_type, payee, p_address, p_phone, p_id_tax, cal_vat, sc_id, del, cre_by, up_by, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
      [
        p.type,
        p.name,
        p.payType,
        p.name,
        '123 หมู่ 5 ต.เทอดไทย อ.แม่ฟ้าหลวง จ.เชียงราย 57240',
        '053-' + Math.floor(100000 + Math.random() * 900000),
        p.tax ?? null,
        p.calVat,
        SC_ID,
        ADMIN_ID,
        ADMIN_ID,
      ],
    );
    partnerIds.push(r.insertId);
  }
  console.log(`▶ Partner: ${partnerIds.length} ราย`);
}

// -----------------------------------------------------------------------------
// 4. BankAccount + BudgetIncomeTypeSchool
// -----------------------------------------------------------------------------
const baIds: { uudhun: number; raidai: number; bongchak: number } = {
  uudhun: 0,
  raidai: 0,
  bongchak: 0,
};

async function seedBankAccount() {
  const accounts = [
    {
      b_id: 4,
      name: 'เงินอุดหนุนทั่วไป (ธ.กรุงไทย)',
      no: '5070123456',
      key: 'uudhun' as const,
    },
    {
      b_id: 4,
      name: 'เงินรายได้สถานศึกษา (ธ.กรุงไทย)',
      no: '5070234567',
      key: 'raidai' as const,
    },
    {
      b_id: 3,
      name: 'เงินบริจาค (ธ.ไทยพาณิชย์)',
      no: '4061345678',
      key: 'bongchak' as const,
    },
  ];

  for (const a of accounts) {
    const r = await AppDataSource.query(
      `INSERT INTO bankaccount (b_id, ba_name, ba_no, sc_id, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [a.b_id, a.name, a.no, SC_ID, ADMIN_ID],
    );
    baIds[a.key] = r.insertId;
  }
  console.log(`▶ BankAccount: 3 บัญชี`);

  // BudgetIncomeTypeSchool — link bg_type → ba_id
  const links: Array<[number, number]> = [
    [1, baIds.uudhun], // เงินอุดหนุนทั่วไป → บัญชีอุดหนุน
    [2, baIds.uudhun], // เงินอุดหนุนเฉพาะกิจ → บัญชีอุดหนุน
    [3, baIds.raidai], // เงินรายได้ → บัญชีรายได้
    [4, baIds.raidai], // ขาย → บัญชีรายได้
    [5, baIds.raidai], // ให้บริการ → บัญชีรายได้
    [6, baIds.bongchak], // บริจาค → บัญชีบริจาค
    [7, baIds.bongchak], // ดอกผล → บัญชีบริจาค
    [8, baIds.raidai], // อื่นๆ → บัญชีรายได้
  ];
  for (const [bgTypeId, baId] of links) {
    await AppDataSource.query(
      `INSERT INTO budget_income_type_school (sc_id, bg_type_id, ba_id, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
      [SC_ID, bgTypeId, baId, ADMIN_ID],
    );
  }
  console.log(`▶ BudgetIncomeTypeSchool: ${links.length} mapping`);
}

// -----------------------------------------------------------------------------
// 5. Students (รายชั้น × budget_year 2569)
// -----------------------------------------------------------------------------
// โรงเรียนขนาดเล็ก ~120 คน อนุบาล + ประถม (ไม่มีมัธยม)
const STUDENT_COUNTS: Array<{ classId: number; count: number }> = [
  { classId: 1, count: 8 }, // อ.1
  { classId: 2, count: 10 }, // อ.2
  { classId: 3, count: 12 }, // อ.3
  { classId: 4, count: 14 }, // ป.1
  { classId: 5, count: 13 }, // ป.2
  { classId: 6, count: 15 }, // ป.3
  { classId: 7, count: 14 }, // ป.4
  { classId: 8, count: 12 }, // ป.5
  { classId: 9, count: 16 }, // ป.6
];

async function seedStudents() {
  // Seed ทั้ง 2 school_year ที่อยู่ในปีงบประมาณ 2569
  // (ภาค 2/2568 = sy_id=1, ภาค 1/2569 = sy_id=2)
  // — frontend อาจใช้ sy_id ใดก็ได้ตามที่ผู้ใช้เลือกใน dropdown ปีการศึกษา
  for (const syId of [SY_ID_FIRST_SEM, SY_ID_SECOND_SEM]) {
    for (const s of STUDENT_COUNTS) {
      await AppDataSource.query(
        `INSERT INTO tb_student (sc_id, sy_id, class_id, budget_year, st_count, up_by, del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          SC_ID,
          syId,
          s.classId,
          String(BUDGET_YEAR),
          s.count,
          ADMIN_ID,
          isoDateTime(addDays(FY_START, 5)),
          isoDateTime(addDays(FY_START, 5)),
        ],
      );
    }

    // ยืนยันการส่งจำนวนนักเรียน — ครบทั้ง 2 sy_id
    await AppDataSource.query(
      `INSERT INTO submitting_student_records (sc_id, sy_id, year, status, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, 1, ?, 0, ?, ?)`,
      [
        SC_ID,
        syId,
        String(BUDGET_YEAR),
        ADMIN_ID,
        isoDateTime(addDays(FY_START, 7)),
        isoDateTime(addDays(FY_START, 7)),
      ],
    );
  }

  const total = STUDENT_COUNTS.reduce((s, x) => s + x.count, 0);
  console.log(
    `▶ Students: ${STUDENT_COUNTS.length} ชั้นเรียน × 2 ปีการศึกษา รวม ${total} คน + ยืนยันส่งข้อมูล`,
  );
  return total;
}

// -----------------------------------------------------------------------------
// 6. Budget allocation (PlnBudgetCategory + Detail + PlnRealBudget + TbEstimate)
// -----------------------------------------------------------------------------
// งบประมาณรวมที่จัดสรร (จำลองค่าคำนวณรายหัว)
const TOTAL_BUDGET = 350000; // บาท
const CATEGORY_ALLOC: Array<{
  bgCateId: number;
  pct: number;
  bgTypeId: number;
}> = [
  { bgCateId: 1, pct: 60, bgTypeId: 1 }, // งบพัฒนาคุณภาพการศึกษา
  { bgCateId: 2, pct: 25, bgTypeId: 1 }, // งบบริหาร/ดำเนินงาน
  { bgCateId: 3, pct: 10, bgTypeId: 2 }, // งบมีวัตถุประสงค์เฉพาะ
  { bgCateId: 5, pct: 5, bgTypeId: 1 }, // งบสำรองจ่าย
];

const pbcIds: Map<number, number> = new Map(); // bgCateId → pbcId

async function seedBudgetAllocation() {
  // ⚠️ pln_budget_category.acad_year = sy_id (ไม่ใช่ปีงบประมาณ!) ตาม budget.service.ts
  //   seed ทั้ง 2 sy_id เพื่อให้ frontend สลับ ปีการศึกษา 2568/2569 ก็เห็นข้อมูล
  for (const syId of [SY_ID_FIRST_SEM, SY_ID_SECOND_SEM]) {
    for (const cat of CATEGORY_ALLOC) {
      const total = (TOTAL_BUDGET * cat.pct) / 100;
      const r = await AppDataSource.query(
        `INSERT INTO pln_budget_category (sc_id, acad_year, bg_cate_id, percents, total, up_by, del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          SC_ID,
          syId,
          cat.bgCateId,
          cat.pct,
          total,
          ADMIN_ID,
          isoDateTime(addDays(FY_START, 10)),
          isoDateTime(addDays(FY_START, 10)),
        ],
      );
      // เก็บ pbc_id ของ sy_id แรก (ใช้ผูก project ด้านล่าง)
      if (syId === SY_ID_FIRST_SEM) {
        pbcIds.set(cat.bgCateId, r.insertId);
      }

      // Detail บอกว่าหมวดนี้ดึงจาก bg_type ไหน — budget_year ใช้ CE
      await AppDataSource.query(
        `INSERT INTO pln_budget_category_detail (pbc_id, bg_type_id, budget, budget_year, up_by, del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          r.insertId,
          cat.bgTypeId,
          total,
          String(BUDGET_YEAR),
          ADMIN_ID,
          isoDateTime(addDays(FY_START, 10)),
          isoDateTime(addDays(FY_START, 10)),
        ],
      );
    }
  }
  console.log(
    `▶ Budget Category: ${CATEGORY_ALLOC.length} หมวด × 2 ปีการศึกษา รวม ${TOTAL_BUDGET.toLocaleString('th-TH')} บาท`,
  );

  // pln_real_budget — รายการเงินที่คาดว่าจะได้รับ (รายไตรมาส)
  const realBudgets: Array<{
    bgTypeId: number;
    type: number;
    amount: number;
    detail: string;
    offsetDays: number;
  }> = [
    // เงินอุดหนุนทั่วไป: ออกไตรมาสละ 1 ครั้ง (70% ในงวด 1 ต.ค., 30% งวด 1 พ.ค.)
    {
      bgTypeId: 1,
      type: 1,
      amount: 196000,
      detail: 'งวด 1 ปี 2569 (70%)',
      offsetDays: 5,
    },
    {
      bgTypeId: 1,
      type: 1,
      amount: 84000,
      detail: 'งวด 2 ปี 2569 (30%)',
      offsetDays: 195,
    },
    // เงินรายได้: คาดการณ์ตลอดปี
    {
      bgTypeId: 3,
      type: 1,
      amount: 50000,
      detail: 'รายได้ขายอาหาร/บริการ',
      offsetDays: 1,
    },
    // บริจาค
    {
      bgTypeId: 6,
      type: 1,
      amount: 20000,
      detail: 'เงินบริจาคจากชุมชน',
      offsetDays: 60,
    },
  ];
  let prbCounter = 1;
  for (const rb of realBudgets) {
    await AppDataSource.query(
      `INSERT INTO pln_real_budget (sc_id, acad_year, auto_numbers, bg_type_id, receivetype, recieve_acadyear, detail, amount, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 0, ?, ?)`,
      [
        SC_ID,
        BUDGET_YEAR,
        prbCounter++,
        rb.bgTypeId,
        BUDGET_YEAR,
        rb.detail,
        rb.amount,
        ADMIN_ID,
        isoDateTime(addDays(FY_START, rb.offsetDays)),
        isoDateTime(addDays(FY_START, rb.offsetDays)),
      ],
    );
  }
  console.log(`▶ PlnRealBudget: ${realBudgets.length} รายการคาดการณ์`);

  // tb_estimate_acadyear — สรุปการประมาณ (seed ทั้ง 2 sy_id)
  for (const syId of [SY_ID_FIRST_SEM, SY_ID_SECOND_SEM]) {
    await AppDataSource.query(
      `INSERT INTO tb_estimate_acadyear (sc_id, sy_id, budget_year, ea_budget, real_budget, ea_status, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, 1, ?, 0, NOW(), NOW())`,
      [SC_ID, syId, BUDGET_YEAR, TOTAL_BUDGET, TOTAL_BUDGET, ADMIN_ID],
    );
  }
  console.log(`▶ TbEstimateAcadyear: 2 records (ทั้ง 2 sy_id)`);
}

// -----------------------------------------------------------------------------
// 7. OpeningBalance — ยอดยกมาต้นปี (1 ต.ค.)
// -----------------------------------------------------------------------------
async function seedOpeningBalance() {
  const rows = [
    // เงินสดในมือ
    { moneyType: 1, storage: 1, amount: 5000, baId: null as number | null }, // เงินอุดหนุน-สด
    { moneyType: 3, storage: 1, amount: 2500, baId: null }, // เงินรายได้-สด
    // เงินฝากธนาคาร
    { moneyType: 1, storage: 2, amount: 45000, baId: baIds.uudhun },
    { moneyType: 3, storage: 2, amount: 18000, baId: baIds.raidai },
    { moneyType: 6, storage: 2, amount: 12000, baId: baIds.bongchak },
  ];
  for (const r of rows) {
    await AppDataSource.query(
      `INSERT INTO opening_balance (sc_id, sy_id, budget_year, money_type_id, storage_type, bank_account_id, amount, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        SC_ID,
        SY_ID_FIRST_SEM,
        BUDGET_YEAR,
        r.moneyType,
        r.storage,
        r.baId,
        r.amount,
        ADMIN_ID,
        isoDateTime(FY_START),
        isoDateTime(FY_START),
      ],
    );
  }
  console.log(
    `▶ OpeningBalance: ${rows.length} buckets (รวม ${rows.reduce((s, r) => s + r.amount, 0).toLocaleString('th-TH')} บาท)`,
  );
}

// -----------------------------------------------------------------------------
// 8. Projects (โครงการ)
// -----------------------------------------------------------------------------
const PROJECTS: Array<{
  name: string;
  budget: number;
  bgCateId: number;
  dept: number;
}> = [
  { name: 'จัดซื้อวัสดุการศึกษาประจำปี', budget: 65000, bgCateId: 1, dept: 1 },
  {
    name: 'พัฒนาห้องสมุดและสื่อการเรียนรู้',
    budget: 35000,
    bgCateId: 1,
    dept: 1,
  },
  { name: 'กิจกรรมวันเด็กแห่งชาติ 2569', budget: 18000, bgCateId: 1, dept: 1 },
  { name: 'อบรมพัฒนาครูด้านดิจิทัล', budget: 25000, bgCateId: 1, dept: 4 },
  { name: 'ปรับปรุงห้องน้ำนักเรียน', budget: 45000, bgCateId: 2, dept: 2 },
  { name: 'ค่าสาธารณูปโภค (ไฟ-น้ำ-เน็ต)', budget: 60000, bgCateId: 2, dept: 5 },
  { name: 'ทัศนศึกษานักเรียนชั้น ป.6', budget: 22000, bgCateId: 3, dept: 1 },
  {
    name: 'จัดซื้อวัสดุอนามัยและทำความสะอาด',
    budget: 15000,
    bgCateId: 2,
    dept: 2,
  },
];

const projectIds: number[] = [];

async function seedProjects() {
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const r = await AppDataSource.query(
      `INSERT INTO pln_project (proj_name, proj_detail, proj_budget, pbc_id, sc_id, sy_id, department, up_by, proj_status, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [
        p.name,
        `${p.name} — ดำเนินการตามแผนปฏิบัติงานประจำปีงบประมาณ ${BUDGET_YEAR}`,
        p.budget,
        pbcIds.get(p.bgCateId) ?? null,
        SC_ID,
        SY_ID_FIRST_SEM,
        p.dept,
        ADMIN_ID,
        isoDateTime(addDays(FY_START, 15 + i * 2)),
        isoDateTime(addDays(FY_START, 15 + i * 2)),
      ],
    );
    projectIds.push(r.insertId);
  }
  console.log(`▶ Projects: ${PROJECTS.length} โครงการ`);
}

// -----------------------------------------------------------------------------
// 9. Supplies (วัสดุครุภัณฑ์)
// -----------------------------------------------------------------------------
const SUPPLIES: Array<{
  name: string;
  price: number;
  tsId: number;
  unId: number;
  init: number;
}> = [
  { name: 'กระดาษ A4 70 แกรม', price: 110, tsId: 1, unId: 5, init: 50 }, // รีม
  { name: 'ปากกาลูกลื่นน้ำเงิน', price: 8, tsId: 1, unId: 2, init: 200 },
  { name: 'ดินสอ HB', price: 5, tsId: 1, unId: 2, init: 150 },
  { name: 'หมึกเครื่องพิมพ์ HP 305 ดำ', price: 850, tsId: 2, unId: 6, init: 4 },
  { name: 'หมึกเครื่องพิมพ์ HP 305 สี', price: 950, tsId: 2, unId: 6, init: 4 },
  { name: 'แฟลชไดรฟ์ 32GB', price: 220, tsId: 2, unId: 6, init: 10 },
  { name: 'น้ำยาถูพื้น 5 ลิตร', price: 180, tsId: 3, unId: 8, init: 12 },
  { name: 'ถุงขยะดำ ขนาด 30x40', price: 35, tsId: 3, unId: 3, init: 30 },
  { name: 'หลอดไฟ LED 18W', price: 95, tsId: 4, unId: 6, init: 20 },
  { name: 'สีน้ำ 12 สี', price: 75, tsId: 6, unId: 1, init: 25 },
  { name: 'กระดาษโปสเตอร์', price: 12, tsId: 6, unId: 7, init: 100 },
  { name: 'ฟิวเจอร์บอร์ด ขนาด 65x80', price: 45, tsId: 6, unId: 7, init: 50 },
];

const suppIds: number[] = [];

async function seedSupplies() {
  for (let i = 0; i < SUPPLIES.length; i++) {
    const s = SUPPLIES[i];
    const r = await AppDataSource.query(
      `INSERT INTO tb_supplies (supp_no, supp_name, supp_price, ts_id, un_id, supp_cap_max, supp_cap_min, sc_id, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        `SP-${BUDGET_YEAR}-${padLeft(i + 1, 4)}`,
        s.name,
        s.price,
        s.tsId,
        s.unId,
        Math.max(s.init * 2, 10),
        Math.max(Math.floor(s.init * 0.1), 1),
        SC_ID,
        ADMIN_ID,
      ],
    );
    suppIds.push(r.insertId);

    // ยอดยกมา (trans_in = init, trans_out = 0, trans_balance = init)
    await AppDataSource.query(
      `INSERT INTO tb_transaction_supplies (supp_id, trans_in, trans_out, trans_balance, up_by, del, create_date, update_date)
       VALUES (?, ?, 0, ?, ?, 0, ?, ?)`,
      [
        r.insertId,
        s.init,
        s.init,
        ADMIN_ID,
        isoDateTime(FY_START),
        isoDateTime(FY_START),
      ],
    );
  }
  console.log(`▶ Supplies: ${SUPPLIES.length} รายการ + ยอดยกมา`);
}

// -----------------------------------------------------------------------------
// 10. PlnReceive + Receipt — รายรับ (เงินที่โรงเรียนได้รับ)
// -----------------------------------------------------------------------------
type ReceiveSeed = {
  date: Date;
  bgTypeId: number;
  amount: number;
  detail: string;
  money: number; // receive_money_type 1=เช็ค 2=สด 3=โอน
};

const RECEIVES: ReceiveSeed[] = [
  // เงินอุดหนุนทั่วไป งวด 1
  {
    date: new Date('2025-10-15'),
    bgTypeId: 1,
    amount: 196000,
    detail: 'เงินอุดหนุนทั่วไป งวด 1/2569',
    money: 3,
  },
  // รายได้ขายอาหารกลางวัน (รายเดือน)
  {
    date: new Date('2025-10-31'),
    bgTypeId: 3,
    amount: 5500,
    detail: 'ค่าอาหารกลางวันเดือน ต.ค. 68',
    money: 2,
  },
  {
    date: new Date('2025-11-29'),
    bgTypeId: 3,
    amount: 6200,
    detail: 'ค่าอาหารกลางวันเดือน พ.ย. 68',
    money: 2,
  },
  {
    date: new Date('2025-12-30'),
    bgTypeId: 3,
    amount: 4800,
    detail: 'ค่าอาหารกลางวันเดือน ธ.ค. 68',
    money: 2,
  },
  {
    date: new Date('2026-01-31'),
    bgTypeId: 3,
    amount: 6100,
    detail: 'ค่าอาหารกลางวันเดือน ม.ค. 69',
    money: 2,
  },
  {
    date: new Date('2026-02-27'),
    bgTypeId: 3,
    amount: 5900,
    detail: 'ค่าอาหารกลางวันเดือน ก.พ. 69',
    money: 2,
  },
  {
    date: new Date('2026-03-28'),
    bgTypeId: 3,
    amount: 4200,
    detail: 'ค่าอาหารกลางวันเดือน มี.ค. 69',
    money: 2,
  },
  // บริจาคจากชุมชน
  {
    date: new Date('2025-11-25'),
    bgTypeId: 6,
    amount: 8000,
    detail: 'เงินบริจาคงานทอดผ้าป่าศิษย์เก่า',
    money: 3,
  },
  {
    date: new Date('2026-01-12'),
    bgTypeId: 6,
    amount: 5000,
    detail: 'บริจาคจัดกิจกรรมวันเด็ก',
    money: 2,
  },
  {
    date: new Date('2026-02-20'),
    bgTypeId: 6,
    amount: 7000,
    detail: 'บริจาคปรับปรุงห้องน้ำ',
    money: 3,
  },
  // ดอกผลธนาคาร
  {
    date: new Date('2025-12-31'),
    bgTypeId: 7,
    amount: 320,
    detail: 'ดอกเบี้ยรับ ไตรมาส 1/2569',
    money: 3,
  },
  {
    date: new Date('2026-03-31'),
    bgTypeId: 7,
    amount: 415,
    detail: 'ดอกเบี้ยรับ ไตรมาส 2/2569',
    money: 3,
  },
  // เงินอุดหนุนทั่วไป งวด 2
  {
    date: new Date('2026-04-15'),
    bgTypeId: 1,
    amount: 84000,
    detail: 'เงินอุดหนุนทั่วไป งวด 2/2569',
    money: 3,
  },
  // ค่าจำหน่ายเครื่องแบบ-ของที่ระลึก
  {
    date: new Date('2025-10-20'),
    bgTypeId: 4,
    amount: 3400,
    detail: 'จำหน่ายเสื้อกีฬาสี',
    money: 2,
  },
  {
    date: new Date('2026-04-25'),
    bgTypeId: 4,
    amount: 2100,
    detail: 'จำหน่ายของที่ระลึกบัณฑิตน้อย',
    money: 2,
  },
];

type ReceiveRow = {
  prId: number;
  prdId: number;
  date: Date;
  bgTypeId: number;
  amount: number;
  money: number;
};
const receivesCreated: ReceiveRow[] = [];

async function seedReceiveAndReceipts() {
  let prNoCounter = 1;
  for (const rec of RECEIVES) {
    // pln_receive
    const r = await AppDataSource.query(
      `INSERT INTO pln_receive (pr_no, sc_id, receive_form, sy_id, budget_year, user_receive, receive_money_type, receive_date, cf_transaction, up_by, del, create_date, update_date)
       VALUES (?, ?, 'ใบรับเงิน', ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
      [
        `RV${BUDGET_YEAR}/${padLeft(prNoCounter++, 4)}`,
        SC_ID,
        syIdForDate(rec.date),
        String(BUDGET_YEAR),
        ADMIN_ID,
        rec.money,
        isoDate(rec.date),
        ADMIN_ID,
        isoDateTime(rec.date),
        isoDateTime(rec.date),
      ],
    );
    const prId: number = r.insertId;

    // pln_receive_detail
    const d = await AppDataSource.query(
      `INSERT INTO pln_receive_detail (pr_id, bg_type_id, prd_detail, prd_budget, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        prId,
        rec.bgTypeId,
        rec.detail,
        rec.amount,
        ADMIN_ID,
        isoDate(rec.date),
        isoDate(rec.date),
      ],
    );

    receivesCreated.push({
      prId,
      prdId: d.insertId,
      date: rec.date,
      bgTypeId: rec.bgTypeId,
      amount: rec.amount,
      money: rec.money,
    });

    // receipt — ออกใบเสร็จรับเงิน
    await AppDataSource.query(
      `INSERT INTO receipt (r_no, detail, pr_id, date_generate, status, sy_id, year, sc_id, up_by, create_date, update_date)
       VALUES (?, ?, ?, ?, '1', ?, ?, ?, ?, ?, ?)`,
      [
        `RC${BUDGET_YEAR}/${padLeft(receivesCreated.length, 4)}`,
        rec.detail,
        String(prId),
        isoDate(rec.date),
        syIdForDate(rec.date),
        String(BUDGET_YEAR),
        SC_ID,
        ADMIN_ID,
        isoDateTime(rec.date),
        isoDateTime(rec.date),
      ],
    );
  }
  console.log(
    `▶ PlnReceive + Receipt: ${RECEIVES.length} รายการ (รวม ${RECEIVES.reduce((s, r) => s + r.amount, 0).toLocaleString('th-TH')} บาท)`,
  );
}

// -----------------------------------------------------------------------------
// 11. ParcelOrder + ParcelDetail (ใบจัดซื้อ/จัดจ้าง)
// -----------------------------------------------------------------------------
type ParcelSeed = {
  date: Date;
  projectIdx: number; // index ใน projectIds
  partnerIdx: number;
  bgTypeId: number;
  jobType: number; // 1 จัดซื้อ 2 จัดจ้าง
  amount: number;
  items: Array<{ suppIdx: number; qty: number }>;
};
const PARCELS: ParcelSeed[] = [
  {
    date: new Date('2025-10-22'),
    projectIdx: 0,
    partnerIdx: 0,
    bgTypeId: 1,
    jobType: 1,
    amount: 12500,
    items: [
      { suppIdx: 0, qty: 30 },
      { suppIdx: 1, qty: 100 },
      { suppIdx: 2, qty: 80 },
    ],
  },
  {
    date: new Date('2025-11-10'),
    projectIdx: 1,
    partnerIdx: 0,
    bgTypeId: 1,
    jobType: 1,
    amount: 8800,
    items: [
      { suppIdx: 9, qty: 20 },
      { suppIdx: 10, qty: 80 },
      { suppIdx: 11, qty: 40 },
    ],
  },
  {
    date: new Date('2025-12-05'),
    projectIdx: 4,
    partnerIdx: 1,
    bgTypeId: 1,
    jobType: 2,
    amount: 22000,
    items: [],
  },
  {
    date: new Date('2026-01-20'),
    projectIdx: 0,
    partnerIdx: 2,
    bgTypeId: 1,
    jobType: 1,
    amount: 9600,
    items: [
      { suppIdx: 3, qty: 4 },
      { suppIdx: 4, qty: 4 },
      { suppIdx: 5, qty: 8 },
    ],
  },
  {
    date: new Date('2026-02-15'),
    projectIdx: 7,
    partnerIdx: 4,
    bgTypeId: 1,
    jobType: 1,
    amount: 4200,
    items: [
      { suppIdx: 6, qty: 10 },
      { suppIdx: 7, qty: 20 },
    ],
  },
  {
    date: new Date('2026-03-10'),
    projectIdx: 4,
    partnerIdx: 5,
    bgTypeId: 1,
    jobType: 2,
    amount: 14000,
    items: [],
  },
];

const parcelOrders: Array<{ orderId: number; data: ParcelSeed }> = [];

async function seedParcelOrders() {
  for (const pc of PARCELS) {
    const dueDate = addDays(pc.date, 30);
    const buyDate = addDays(pc.date, 5);

    const r = await AppDataSource.query(
      `INSERT INTO parcel_order
       (project_id, project_type, sc_id, bg_type_id, admin_id, order_date, order_status, is_urgent, p_id,
        operate_date, acad_year, numbers, details, resources, budgets, job_type, buy_date, buy_reason, departments,
        due_date, committee1, committee2, committee3, method_type, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, 8, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, 0, 0, 0, 3, ?, 0, ?, ?)`,
      [
        projectIds[pc.projectIdx],
        pc.jobType,
        SC_ID,
        pc.bgTypeId,
        ADMIN_ID,
        isoDateTime(pc.date),
        partnerIds[pc.partnerIdx],
        isoDate(buyDate),
        BUDGET_YEAR,
        nextSeq(),
        `จัดซื้อ/จัดจ้างตามโครงการ ${PROJECTS[pc.projectIdx].name}`,
        pc.amount,
        pc.jobType,
        isoDate(buyDate),
        'ใช้ในงานราชการประจำปี',
        isoDate(dueDate),
        ADMIN_ID,
        isoDateTime(pc.date),
        isoDateTime(pc.date),
      ],
    );
    parcelOrders.push({ orderId: r.insertId, data: pc });

    // parcel_detail
    for (const it of pc.items) {
      const supp = SUPPLIES[it.suppIdx];
      await AppDataSource.query(
        `INSERT INTO parcel_detail (order_id, supp_id, del, create_date, update_date)
         VALUES (?, ?, 0, ?, ?)`,
        [
          r.insertId,
          suppIds[it.suppIdx],
          isoDateTime(pc.date),
          isoDateTime(pc.date),
        ],
      );
    }

    // pln_proj_approve — มี schema drift (NOT NULL หลายฟิลด์) ใช้ค่า default ครบทุกคอลัมน์
    await AppDataSource.query(
      `INSERT INTO pln_proj_approve
       (sc_id, acad_year, proj_id, numbers, details, resources, total_budgets, budgets, remaind_budgets,
        operate_date, job_type, note_number, buy_date, buy_reason, departments, due_date,
        committee1, committee2, committee3,
        book_order_committee, date_order_committee, book_report_number, date_book_report,
        suppliers, present_cost, date_win, number_orders, orders_date, due_orders_date,
        over_due_date, prove_date, number_report_widdraw, date_report_widdraw,
        up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, '1', ?, ?, ?, ?, ?, ?, ?, ?, 1, 30,
               '-', '-', '-',
               '-', ?, '-', '-',
               0, ?, ?, '-', ?, 0,
               ?, ?, '-', ?,
               ?, 0, ?, ?)`,
      [
        SC_ID,
        BUDGET_YEAR,
        projectIds[pc.projectIdx],
        nextSeq(),
        `อนุมัติจัดซื้อ ${PROJECTS[pc.projectIdx].name}`,
        PROJECTS[pc.projectIdx].budget,
        pc.amount,
        PROJECTS[pc.projectIdx].budget - pc.amount,
        isoDate(pc.date),
        pc.jobType,
        nextSeq(),
        isoDate(buyDate),
        'ใช้ในงานราชการประจำปี',
        isoDate(pc.date),
        pc.amount,
        isoDate(buyDate),
        isoDate(buyDate),
        isoDate(dueDate),
        isoDate(dueDate),
        isoDate(dueDate),
        ADMIN_ID,
        isoDateTime(pc.date),
        isoDateTime(pc.date),
      ],
    );
  }
  console.log(`▶ ParcelOrder + Detail + PlnProjApprove: ${PARCELS.length} ใบ`);
}

// -----------------------------------------------------------------------------
// 12. RequestWithdraw (ใบเบิก/เช็ค) + WithholdingCertificate
// -----------------------------------------------------------------------------
type WithdrawSeed = {
  date: Date;
  orderIdx: number | null; // index ใน parcelOrders, null สำหรับเบิกอื่น
  partnerIdx: number;
  paymentType: number; // 1 วัสดุ 2 จ้างทำของ 3 บริการ
  expenseType: number; // 1-9
  rwType: number; // 1 ยืม 3 พัสดุ/บริการ 4 หัก ณ ที่จ่าย
  bgTypeId: number;
  amount: number;
  detail: string;
  isCheck: number; // 1 = จ่ายเช็ค
  withholdPct?: number; // % หัก ณ ที่จ่าย (0/1/3)
};

const WITHDRAWS: WithdrawSeed[] = [
  {
    date: new Date('2025-10-28'),
    orderIdx: 0,
    partnerIdx: 0,
    paymentType: 1,
    expenseType: 4,
    rwType: 3,
    bgTypeId: 1,
    amount: 12500,
    detail: 'ค่าวัสดุการศึกษา (กระดาษ ปากกา ดินสอ)',
    isCheck: 1,
    withholdPct: 1,
  },
  {
    date: new Date('2025-11-15'),
    orderIdx: 1,
    partnerIdx: 0,
    paymentType: 1,
    expenseType: 4,
    rwType: 3,
    bgTypeId: 1,
    amount: 8800,
    detail: 'ค่าวัสดุห้องสมุด',
    isCheck: 1,
    withholdPct: 1,
  },
  {
    date: new Date('2025-12-15'),
    orderIdx: 2,
    partnerIdx: 1,
    paymentType: 2,
    expenseType: 3,
    rwType: 3,
    bgTypeId: 1,
    amount: 22000,
    detail: 'ค่าปรับปรุงห้องน้ำนักเรียน',
    isCheck: 1,
    withholdPct: 3,
  },
  {
    date: new Date('2026-01-25'),
    orderIdx: 3,
    partnerIdx: 2,
    paymentType: 1,
    expenseType: 4,
    rwType: 3,
    bgTypeId: 1,
    amount: 9600,
    detail: 'ค่าหมึกพิมพ์ + แฟลชไดรฟ์',
    isCheck: 1,
    withholdPct: 1,
  },
  {
    date: new Date('2026-02-20'),
    orderIdx: 4,
    partnerIdx: 4,
    paymentType: 1,
    expenseType: 4,
    rwType: 3,
    bgTypeId: 1,
    amount: 4200,
    detail: 'ค่าวัสดุทำความสะอาด',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2026-03-15'),
    orderIdx: 5,
    partnerIdx: 5,
    paymentType: 2,
    expenseType: 3,
    rwType: 3,
    bgTypeId: 1,
    amount: 14000,
    detail: 'ค่าจ้างซ่อมหลังคาอาคารเรียน',
    isCheck: 1,
    withholdPct: 1,
  },
  // ค่าสาธารณูปโภค (รายเดือน)
  {
    date: new Date('2025-10-30'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 4800,
    detail: 'ค่าไฟฟ้าเดือน ต.ค. 68',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2025-11-30'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 5200,
    detail: 'ค่าไฟฟ้าเดือน พ.ย. 68',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2025-12-30'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 5800,
    detail: 'ค่าไฟฟ้าเดือน ธ.ค. 68',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2026-01-31'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 5400,
    detail: 'ค่าไฟฟ้าเดือน ม.ค. 69',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2026-02-28'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 5100,
    detail: 'ค่าไฟฟ้าเดือน ก.พ. 69',
    isCheck: 1,
    withholdPct: 0,
  },
  {
    date: new Date('2026-03-31'),
    orderIdx: null,
    partnerIdx: 3,
    paymentType: 3,
    expenseType: 5,
    rwType: 3,
    bgTypeId: 1,
    amount: 5600,
    detail: 'ค่าไฟฟ้าเดือน มี.ค. 69',
    isCheck: 1,
    withholdPct: 0,
  },
  // ค่าตอบแทน (ครูพี่เลี้ยง ภายใน, รายเดือน)
  {
    date: new Date('2025-10-31'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง ต.ค. 68',
    isCheck: 0,
  },
  {
    date: new Date('2025-11-30'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง พ.ย. 68',
    isCheck: 0,
  },
  {
    date: new Date('2025-12-30'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง ธ.ค. 68',
    isCheck: 0,
  },
  {
    date: new Date('2026-01-31'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง ม.ค. 69',
    isCheck: 0,
  },
  {
    date: new Date('2026-02-27'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง ก.พ. 69',
    isCheck: 0,
  },
  {
    date: new Date('2026-03-31'),
    orderIdx: null,
    partnerIdx: 7,
    paymentType: 3,
    expenseType: 2,
    rwType: 3,
    bgTypeId: 1,
    amount: 4500,
    detail: 'ค่าตอบแทนครูพี่เลี้ยง มี.ค. 69',
    isCheck: 0,
  },
  // เงินยืมโครงการ (rw_type=1)
  {
    date: new Date('2026-01-08'),
    orderIdx: null,
    partnerIdx: 6,
    paymentType: 3,
    expenseType: 3,
    rwType: 1,
    bgTypeId: 1,
    amount: 18000,
    detail: 'ยืมเงินจัดกิจกรรมวันเด็ก 2569',
    isCheck: 0,
  },
  {
    date: new Date('2026-04-05'),
    orderIdx: null,
    partnerIdx: 6,
    paymentType: 3,
    expenseType: 3,
    rwType: 1,
    bgTypeId: 1,
    amount: 22000,
    detail: 'ยืมเงินทัศนศึกษา ป.6',
    isCheck: 0,
  },
  // ค่าใช้สอย — อบรมครู
  {
    date: new Date('2025-12-18'),
    orderIdx: null,
    partnerIdx: 6,
    paymentType: 3,
    expenseType: 3,
    rwType: 3,
    bgTypeId: 1,
    amount: 12000,
    detail: 'ค่าใช้จ่ายอบรมพัฒนาครูด้านดิจิทัล',
    isCheck: 1,
  },
];

const withdrawIds: Array<{ rwId: number; data: WithdrawSeed }> = [];

async function seedWithdrawAndCertificates() {
  let docCounter = 1;
  let checkCounter = 1;
  for (const wd of WITHDRAWS) {
    const isCheckTransaction = wd.isCheck === 1;
    const checkNoDoc = isCheckTransaction
      ? `CH${BUDGET_YEAR}/${padLeft(checkCounter++, 4)}`
      : null;
    const offerCheckDate = isCheckTransaction
      ? isoDate(addDays(wd.date, 2))
      : null;

    const r = await AppDataSource.query(
      `INSERT INTO request_withdraw
       (sc_id, no_doc, payment_type, bg_type_id, rw_type, order_id, p_id, detail, amount, certificate_payment,
        date_request, user_request_head, user_request, user_offer_check, offer_check_date, check_no_doc, type_offer_check,
        status, sy_id, year, up_by, del, loan_type, loan_start_date, loan_return_due_date, expense_type, is_check, payee_name, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1,
               ?, ?, ?, ?, ?, ?, ?,
               202, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        SC_ID,
        `BG${BUDGET_YEAR}/${padLeft(docCounter++, 4)}`,
        wd.paymentType,
        wd.bgTypeId,
        wd.rwType,
        wd.orderIdx !== null ? parcelOrders[wd.orderIdx].orderId : 0,
        partnerIds[wd.partnerIdx],
        wd.detail,
        wd.amount,
        isoDate(wd.date),
        ADMIN_ID,
        ADMIN_ID,
        ADMIN_ID,
        offerCheckDate,
        checkNoDoc,
        isCheckTransaction ? 1 : 0,
        syIdForDate(wd.date),
        String(BUDGET_YEAR),
        ADMIN_ID,
        wd.rwType === 1 ? 2 : null,
        wd.rwType === 1 ? isoDate(wd.date) : null,
        wd.rwType === 1 ? isoDate(addDays(wd.date, 30)) : null,
        wd.expenseType,
        wd.isCheck,
        PARTNERS[wd.partnerIdx].name,
        isoDateTime(wd.date),
        isoDateTime(wd.date),
      ],
    );
    withdrawIds.push({ rwId: r.insertId, data: wd });

    // WithholdingCertificate — เฉพาะรายการที่มีหัก ณ ที่จ่าย
    if (wd.withholdPct && wd.withholdPct > 0) {
      const partner = PARTNERS[wd.partnerIdx];
      const calVat = partner.calVat;
      const vatAmount = calVat === 1 ? wd.amount - (wd.amount * 7) / 107 : 0;
      const taxBase = calVat === 1 ? vatAmount : wd.amount;
      const deduct = taxBase * (wd.withholdPct / 100);

      await AppDataSource.query(
        `INSERT INTO withholding_certificate (wc_no, of_id, sc_id, cer_date, sy_id, year, status, up_by, del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, ?, 101, ?, 0, ?, ?)`,
        [
          `WT${BUDGET_YEAR}/${padLeft(withdrawIds.length, 4)}`,
          r.insertId,
          SC_ID,
          isoDate(wd.date),
          syIdForDate(wd.date),
          String(BUDGET_YEAR),
          ADMIN_ID,
          isoDateTime(wd.date),
          isoDateTime(wd.date),
        ],
      );
    }
  }
  console.log(
    `▶ RequestWithdraw: ${WITHDRAWS.length} ใบ (รวม ${WITHDRAWS.reduce((s, w) => s + w.amount, 0).toLocaleString('th-TH')} บาท)`,
  );
}

// -----------------------------------------------------------------------------
// 13. ReceiveParcelOrder + Detail — รับของจาก parcel order
// -----------------------------------------------------------------------------
async function seedReceiveParcels() {
  let count = 0;
  for (let i = 0; i < parcelOrders.length; i++) {
    const pc = parcelOrders[i];
    if (pc.data.items.length === 0) continue; // จัดจ้าง — ไม่มีของรับ
    const receiveDate = addDays(pc.data.date, 7);

    const r = await AppDataSource.query(
      `INSERT INTO receive_parcel_order (admin_id, agent_admin_id, user_pacel_id, sc_id, order_id, sy_year, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        ADMIN_ID,
        ADMIN_ID,
        ADMIN_ID,
        SC_ID,
        pc.orderId,
        BUDGET_YEAR,
        isoDateTime(receiveDate),
        isoDateTime(receiveDate),
      ],
    );

    for (const it of pc.data.items) {
      const suppId = suppIds[it.suppIdx];
      await AppDataSource.query(
        `INSERT INTO receive_parcel_detail (receive_id, supp_id, del, create_date, update_date)
         VALUES (?, ?, 0, ?, ?)`,
        [
          r.insertId,
          suppId,
          isoDateTime(receiveDate),
          isoDateTime(receiveDate),
        ],
      );

      // อัปเดต transaction_supplies — เพิ่ม trans_in
      const cur = await AppDataSource.query(
        `SELECT trans_balance FROM tb_transaction_supplies WHERE supp_id = ? ORDER BY trans_id DESC LIMIT 1`,
        [suppId],
      );
      const prevBal = cur[0]?.trans_balance ?? 0;
      const newBal = Number(prevBal) + it.qty;
      await AppDataSource.query(
        `INSERT INTO tb_transaction_supplies (supp_id, trans_in, trans_out, trans_balance, up_by, del, create_date, update_date)
         VALUES (?, ?, 0, ?, ?, 0, ?, ?)`,
        [
          suppId,
          it.qty,
          newBal,
          ADMIN_ID,
          isoDateTime(receiveDate),
          isoDateTime(receiveDate),
        ],
      );
    }
    count++;
  }
  console.log(`▶ ReceiveParcelOrder: ${count} ใบรับของ`);
}

// -----------------------------------------------------------------------------
// 14. FinancialTransactions — รายวันสำหรับ daily-balance / dashboard
// -----------------------------------------------------------------------------
async function seedFinancialTransactions() {
  let count = 0;

  // รายรับจาก receives
  for (const r of receivesCreated) {
    const moneyChannel = r.money === 2 ? 1 : 2; // 2=สด → 1 cash, อื่นๆ → 2 bank
    const baId =
      moneyChannel === 2
        ? r.bgTypeId === 1 || r.bgTypeId === 2
          ? baIds.uudhun
          : r.bgTypeId === 6 || r.bgTypeId === 7
            ? baIds.bongchak
            : baIds.raidai
        : null;

    await AppDataSource.query(
      `INSERT INTO financial_transactions (type, bg_type_id, amount, rw_id, pr_id, prd_id, prb_id, money_channel, ba_id,
         up_by, sc_id, sy_id, budget_year, semester, del, create_date, update_date)
       VALUES (1, ?, ?, 0, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`,
      [
        r.bgTypeId,
        r.amount,
        r.prId,
        r.prdId,
        moneyChannel,
        baId,
        ADMIN_ID,
        SC_ID,
        syIdForDate(r.date),
        BUDGET_YEAR,
        isoDateTime(r.date),
        isoDateTime(r.date),
      ],
    );
    count++;
  }

  // รายจ่ายจาก withdraws
  for (const wd of withdrawIds) {
    const moneyChannel = wd.data.isCheck === 1 ? 2 : 1;
    const baId = moneyChannel === 2 ? baIds.uudhun : null;
    await AppDataSource.query(
      `INSERT INTO financial_transactions (type, bg_type_id, amount, rw_id, pr_id, prd_id, prb_id, money_channel, ba_id,
         up_by, sc_id, sy_id, budget_year, semester, del, create_date, update_date)
       VALUES (-1, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`,
      [
        wd.data.bgTypeId,
        wd.data.amount,
        wd.rwId,
        moneyChannel,
        baId,
        ADMIN_ID,
        SC_ID,
        syIdForDate(wd.data.date),
        BUDGET_YEAR,
        isoDateTime(wd.data.date),
        isoDateTime(wd.data.date),
      ],
    );
    count++;
  }

  console.log(
    `▶ FinancialTransactions: ${count} รายการ (รับ ${receivesCreated.length} / จ่าย ${withdrawIds.length})`,
  );
}

// -----------------------------------------------------------------------------
// 15. TbExpenses — สรุปรายจ่าย (สำหรับ Policy module)
// -----------------------------------------------------------------------------
async function seedExpenses() {
  let count = 0;
  for (const wd of withdrawIds) {
    await AppDataSource.query(
      `INSERT INTO tb_expenses (sc_id, ex_year_in, ex_year_out, bg_type_id, p_id, ex_money, ex_status, up_by, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        SC_ID,
        BUDGET_YEAR,
        BUDGET_YEAR,
        wd.data.bgTypeId,
        partnerIds[wd.data.partnerIdx],
        wd.data.amount,
        ADMIN_ID,
        isoDateTime(wd.data.date),
        isoDateTime(wd.data.date),
      ],
    );
    count++;
  }
  console.log(`▶ TbExpenses: ${count} รายการ`);
}

// -----------------------------------------------------------------------------
// 16. BudgetRequest — ใบขอเบิก/ขออนุมัติงบ
// -----------------------------------------------------------------------------
async function seedBudgetRequests() {
  const requests = [
    {
      date: new Date('2025-10-20'),
      expense: 4,
      amount: 12500,
      detail: 'ขออนุมัติจัดซื้อวัสดุการศึกษา',
    },
    {
      date: new Date('2025-12-15'),
      expense: 7,
      amount: 22000,
      detail: 'ขออนุมัติปรับปรุงห้องน้ำ',
    },
    {
      date: new Date('2026-04-08'),
      expense: 3,
      amount: 22000,
      detail: 'ขออนุมัติทัศนศึกษา ป.6',
    },
  ];
  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    await AppDataSource.query(
      `INSERT INTO budget_request (sc_id, sy_id, budget_year, br_seq, action_date, send_date, expense_type, amount, creditor_name, remark, up_by, del, create_date, update_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        SC_ID,
        syIdForDate(req.date),
        String(BUDGET_YEAR),
        i + 1,
        isoDate(req.date),
        isoDate(addDays(req.date, 2)),
        req.expense,
        req.amount,
        'ผู้ขายตามอนุมัติ',
        req.detail,
        ADMIN_ID,
        isoDateTime(req.date),
        isoDateTime(req.date),
      ],
    );
  }
  console.log(`▶ BudgetRequest: ${requests.length} ใบ`);
}

// -----------------------------------------------------------------------------
// Main runner
// -----------------------------------------------------------------------------
async function run() {
  try {
    await AppDataSource.initialize();
    console.log('▶ เชื่อมต่อ MySQL สำเร็จ\n');
    console.log(`================================================`);
    console.log(`  Reset & Seed: ${SCHOOL_NAME}`);
    console.log(`  ปีงบประมาณ ${BUDGET_YEAR} (1 ต.ค. 2568 – 10 พ.ค. 2569)`);
    console.log(`================================================\n`);

    await truncateTransactional();
    console.log('');

    await seedSchool();
    await seedSchoolYear();
    await seedPartners();
    await seedBankAccount();
    const totalStudents = await seedStudents();
    await seedBudgetAllocation();
    await seedOpeningBalance();
    await seedProjects();
    await seedSupplies();
    await seedReceiveAndReceipts();
    await seedParcelOrders();
    await seedWithdrawAndCertificates();
    await seedReceiveParcels();
    await seedFinancialTransactions();
    await seedExpenses();
    await seedBudgetRequests();

    console.log(`\n================================================`);
    console.log(`  ✔ Reset & Seed สำเร็จ`);
    console.log(`================================================`);

    // สรุป
    const [rcv] = await AppDataSource.query(
      `SELECT SUM(prd_budget) AS s FROM pln_receive_detail WHERE del=0`,
    );
    const [pay] = await AppDataSource.query(
      `SELECT SUM(amount) AS s FROM request_withdraw WHERE del=0`,
    );
    const [ftIn] = await AppDataSource.query(
      `SELECT SUM(amount) AS s FROM financial_transactions WHERE type=1 AND del=0`,
    );
    const [ftOut] = await AppDataSource.query(
      `SELECT SUM(amount) AS s FROM financial_transactions WHERE type=-1 AND del=0`,
    );
    console.log(`  รวมรายรับ:   ${Number(rcv.s).toLocaleString('th-TH')} บาท`);
    console.log(`  รวมรายจ่าย: ${Number(pay.s).toLocaleString('th-TH')} บาท`);
    console.log(`  FT รายรับ:   ${Number(ftIn.s).toLocaleString('th-TH')} บาท`);
    console.log(`  FT รายจ่าย: ${Number(ftOut.s).toLocaleString('th-TH')} บาท`);
    console.log(`  จำนวนนักเรียน: ${totalStudents} คน`);
    console.log(``);
  } catch (e) {
    console.error('✘ Error:', e);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
