import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * SchoolResetService — ล้าง/รีเซ็ตข้อมูล "เฉพาะโรงเรียนที่ login" (sc_id เดียว)
 *
 * 3 ฟังก์ชัน:
 *  1) resetSystem    — ลบเฉพาะข้อมูลธุรกรรม (Tier C) เก็บ master + ผู้ใช้ + โรงเรียน + ค่าตั้งค่า (Tier B)
 *                      → เริ่มใช้งานจริงบนระบบที่สะอาด แต่ยังมีค่าตั้งค่าเดิม
 *  2) demoSchool     — ลบทั้งธุรกรรม + ค่าตั้งค่า แล้วสร้างค่าตั้งค่าพื้นฐานใหม่ (พร้อมเริ่มงาน)
 *  3) resetDemoData  — เหมือน demoSchool + สร้างข้อมูลตัวอย่าง ~30 รายการ (ภายใน 1 เดือนล่าสุด)
 *
 * วิธีลบ: ค้นทุกตารางที่มีคอลัมน์ sc_id แบบ dynamic (ครอบคลุมตารางใหม่อัตโนมัติ)
 * + ลบตารางลูกที่ไม่มี sc_id ผ่าน FK ของ parent. ฐานข้อมูลไม่มี FK constraint
 * จึงลบลำดับใดก็ได้ (ลบลูกก่อน parent เพื่อให้ subquery ยัง resolve ได้)
 */
@Injectable()
export class SchoolResetService {
  private readonly logger = new Logger(SchoolResetService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** ตารางที่ "ห้ามลบเด็ดขาด" — identity ของโรงเรียน/ผู้ใช้ */
  private readonly IDENTITY_KEEP = ['admin', 'school', 'school_year'];

  /** ตารางค่าตั้งค่า (Tier B) — เก็บใน resetSystem, ลบใน demo/resetDemo (มี sc_id) */
  private readonly TIER_B_SCID = [
    'bankaccount',
    'budget_income_type_school',
    'cash_reserve_limit',
    'master_sc_policy',
    'regulatory_threshold',
    'cash_keeping_committee',
    'school_classroom',
    'tb_estimate_acadyear',
    'tb_partner',
    'tb_type_supplies',
    'tb_unit',
  ];

  /** ตารางลูกที่ไม่มี sc_id (Tier C) — ลบเสมอ ผ่าน parent: [child, fk, parent, parentPk] */
  private readonly TIER_C_CHILDREN: [string, string, string, string][] = [
    ['pln_receive_detail', 'pr_id', 'pln_receive', 'pr_id'],
    ['parcel_detail', 'order_id', 'parcel_order', 'order_id'],
    ['receive_parcel_detail', 'receive_id', 'receive_parcel_order', 'receive_id'],
    ['tb_transaction_supplies', 'supp_id', 'tb_supplies', 'supp_id'],
    ['pln_budget_category_detail', 'pbc_id', 'pln_budget_category', 'pbc_id'],
    ['bank_reconciliation_item', 'br_id', 'bank_reconciliation', 'br_id'],
    ['supplie_request_detail', 'req_id', 'supplie_request', 'req_id'],
    ['travel_reimbursement_traveler', 'tr_id', 'travel_reimbursement', 'tr_id'],
    ['tb_fixed_asset_depreciation', 'fa_id', 'tb_fixed_asset', 'fa_id'],
    ['pln_procurement_plan_item', 'pp_id', 'pln_procurement_plan', 'pp_id'],
  ];

  /** ตารางลูก Tier B (ไม่มี sc_id) — ลบเฉพาะตอน wipeConfig ผ่าน school_year */
  private readonly TIER_B_CHILDREN: [string, string, string, string][] = [
    ['master_classroombudget', 'sy_id', 'school_year', 'sy_id'],
  ];

  private async tableExists(em: EntityManager, table: string): Promise<boolean> {
    const rows = (await em.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
      [table],
    )) as unknown[];
    return rows.length > 0;
  }

  /**
   * ลบข้อมูลของโรงเรียน scId
   * @param wipeConfig true = ลบค่าตั้งค่า (Tier B) ด้วย ; false = เก็บ Tier B
   * @returns รายชื่อตาราง→จำนวนแถวที่ลบ + รวม
   */
  private async wipe(
    em: EntityManager,
    scId: number,
    wipeConfig: boolean,
  ): Promise<{ deleted: Record<string, number>; total: number }> {
    const deleted: Record<string, number> = {};
    const keep = new Set<string>([
      ...this.IDENTITY_KEEP,
      ...(wipeConfig ? [] : this.TIER_B_SCID),
    ]);

    const del = async (sql: string, params: unknown[], label: string) => {
      const res = (await em.query(sql, params)) as { affectedRows?: number };
      const n = res?.affectedRows ?? 0;
      if (n > 0) deleted[label] = (deleted[label] ?? 0) + n;
    };

    // 1) ลบตารางลูก (ไม่มี sc_id) ผ่าน parent ก่อน — subquery ต้องอ่าน parent ที่ยังอยู่
    const children = [
      ...this.TIER_C_CHILDREN,
      ...(wipeConfig ? this.TIER_B_CHILDREN : []),
    ];
    for (const [child, fk, parent, ppk] of children) {
      if (!(await this.tableExists(em, child))) continue;
      await del(
        `DELETE FROM \`${child}\` WHERE \`${fk}\` IN
           (SELECT \`${ppk}\` FROM \`${parent}\` WHERE sc_id = ?)`,
        [scId],
        child,
      );
    }

    // 2) ลบทุกตารางที่มีคอลัมน์ sc_id (ยกเว้น keep) แบบ dynamic
    const scTables = (await em.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'sc_id'`,
    )) as { TABLE_NAME: string }[];

    for (const { TABLE_NAME } of scTables) {
      if (keep.has(TABLE_NAME)) continue;
      await del(
        `DELETE FROM \`${TABLE_NAME}\` WHERE sc_id = ?`,
        [scId],
        TABLE_NAME,
      );
    }

    const total = Object.values(deleted).reduce((s, n) => s + n, 0);
    return { deleted, total };
  }

  // ── 1) reset system ───────────────────────────────────────────────────────
  async resetSystem(scId: number) {
    return this.dataSource.transaction(async (em) => {
      const { deleted, total } = await this.wipe(em, scId, false);
      this.logger.warn(
        `resetSystem sc_id=${scId} ลบ ${total} แถว จาก ${Object.keys(deleted).length} ตาราง`,
      );
      return {
        flag: true,
        ms: `รีเซ็ตระบบเรียบร้อย — ลบข้อมูลธุรกรรม ${total} รายการ (เก็บค่าตั้งค่า/ผู้ใช้/โรงเรียนไว้)`,
        deleted_tables: Object.keys(deleted).length,
        total_deleted: total,
      };
    });
  }

  // ── 2) demo school (reset + ค่าตั้งค่าพื้นฐาน) ────────────────────────────
  async demoSchool(scId: number, upBy: number) {
    return this.dataSource.transaction(async (em) => {
      const { total } = await this.wipe(em, scId, true);
      const cfg = await this.seedConfig(em, scId, upBy);
      this.logger.warn(`demoSchool sc_id=${scId} ลบ ${total} + สร้างค่าตั้งค่า`);
      return {
        flag: true,
        ms: `สร้างโรงเรียน Demo เรียบร้อย — ล้าง ${total} รายการ + สร้างค่าตั้งค่าพื้นฐาน (ประเภทเงิน ${cfg.moneyTypes}, บัญชี ${cfg.bankAccounts}, ชั้นเรียน ${cfg.classrooms})`,
        ...cfg,
      };
    });
  }

  // ── 3) reset demo data (reset + ค่าตั้งค่า + ตัวอย่าง 30 รายการ) ──────────
  async resetDemoData(scId: number, upBy: number) {
    return this.dataSource.transaction(async (em) => {
      const { total } = await this.wipe(em, scId, true);
      const cfg = await this.seedConfig(em, scId, upBy);
      const sample = await this.seedSamples(em, scId, cfg.syId, upBy);
      this.logger.warn(`resetDemoData sc_id=${scId} ลบ ${total} + config + ตัวอย่าง`);
      return {
        flag: true,
        ms: `รีเซ็ต + สร้างข้อมูลตัวอย่างเรียบร้อย — ล้าง ${total} รายการ, ค่าตั้งค่าพื้นฐาน, และตัวอย่าง ${sample.transactions} รายการธุรกรรม (ภายใน 1 เดือน)`,
        ...cfg,
        ...sample,
      };
    });
  }

  /**
   * สร้างค่าตั้งค่าพื้นฐานให้โรงเรียน: ปีการศึกษา, ผูกประเภทเงิน, บัญชีธนาคาร,
   * ชั้นเรียนที่เปิดสอน, อัตราเงินรายหัวเบื้องต้น
   */
  private async seedConfig(em: EntityManager, scId: number, upBy: number) {
    // ── ปีการศึกษา/งบ ปัจจุบัน — หาที่มีอยู่ ถ้าไม่มีสร้างใหม่ ──
    const beYear = new Date().getFullYear() + 543;
    let syRows = (await em.query(
      `SELECT sy_id, budget_year FROM school_year WHERE sc_id = ? AND del = 0
       ORDER BY sy_id DESC LIMIT 1`,
      [scId],
    )) as { sy_id: number; budget_year: number }[];

    if (syRows.length === 0) {
      const ce = new Date().getFullYear();
      await em.query(
        `INSERT INTO school_year
          (sy_year, semester, sy_date_s, sy_date_e, up_by, del, cre_date, up_date,
           sc_id, budget_year, budget_date_s, budget_date_e)
         VALUES (?,1,?,?,?,0,NOW(),NOW(),?,?,?,?)`,
        [
          beYear,
          `${ce}-05-16`,
          `${ce + 1}-03-31`,
          upBy,
          scId,
          beYear,
          `${ce}-10-01`,
          `${ce + 1}-09-30`,
        ],
      );
      syRows = (await em.query(
        `SELECT sy_id, budget_year FROM school_year WHERE sc_id = ? AND del = 0
         ORDER BY sy_id DESC LIMIT 1`,
        [scId],
      )) as { sy_id: number; budget_year: number }[];
    }
    const syId = syRows[0].sy_id;
    const budgetYear = syRows[0].budget_year;

    // ── บัญชีธนาคาร (1 บัญชี) ──
    const banks = (await em.query(
      `SELECT b_id FROM bank_db ORDER BY b_id LIMIT 1`,
    )) as { b_id: number }[];
    const bId = banks[0]?.b_id ?? 1;
    await em.query(
      `INSERT INTO bankaccount (b_id, ba_name, ba_no, sc_id, up_by, del, create_date, update_date)
       VALUES (?, 'บัญชีออมทรัพย์ (เงินอุดหนุน)', '123-4-56789-0', ?, ?, 0, NOW(), NOW())`,
      [bId, scId, upBy],
    );
    const baRow = (await em.query(
      `SELECT ba_id FROM bankaccount WHERE sc_id = ? AND del = 0 ORDER BY ba_id DESC LIMIT 1`,
      [scId],
    )) as { ba_id: number }[];
    const baId = baRow[0]?.ba_id ?? null;

    // ── ผูกประเภทเงินที่ใช้ (จาก master) + perhead = 1 ──
    const moneyTypes = (await em.query(
      `SELECT bg_type_id, budget_type FROM master_budget_income_type WHERE del = 0
       ORDER BY bg_type_id`,
    )) as { bg_type_id: number; budget_type: string }[];
    for (const mt of moneyTypes) {
      await em.query(
        `INSERT INTO budget_income_type_school
           (sc_id, ba_id, bg_type_id, up_by, del, create_date, update_date, perhead)
         VALUES (?, ?, ?, ?, 0, NOW(), NOW(), 1)`,
        [scId, baId, mt.bg_type_id, upBy],
      );
    }

    // ── ชั้นเรียนที่เปิดสอน (อนุบาล 1-3, ป.1-6) ──
    const classes = (await em.query(
      `SELECT class_id, class_lev FROM master_classroom
       WHERE class_lev LIKE 'อนุบาล%' OR class_lev LIKE 'ประถม%'
       ORDER BY class_id`,
    )) as { class_id: number; class_lev: string }[];
    for (const c of classes) {
      await em.query(
        `INSERT INTO school_classroom (sc_id, class_id, up_by, del, create_date, update_date, is_open)
         VALUES (?, ?, ?, 0, NOW(), NOW(), 1)`,
        [scId, c.class_id, upBy],
      );
    }

    // ── อัตราเงินรายหัวเบื้องต้น (เงินอุดหนุนรายหัว) ต่อชั้น ──
    // ใช้ประเภทเงินแรกที่ชื่อมี "รายหัว" หรือประเภทแรกสุด
    const mainType =
      moneyTypes.find((m) => m.budget_type.includes('รายหัว')) ?? moneyTypes[0];
    if (mainType) {
      // ประถม 1,900 / อนุบาล 1,700 (ตัวอย่าง)
      for (const c of classes) {
        const rate = c.class_lev.includes('อนุบาล') ? 1700 : 1900;
        await em.query(
          `INSERT INTO master_classroombudget
             (sy_id, class_id, bg_type_id, amount, up_by, del, create_date, update_date)
           VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [syId, c.class_id, mainType.bg_type_id, rate, upBy],
        );
      }
    }

    return {
      syId,
      budgetYear,
      moneyTypes: moneyTypes.length,
      bankAccounts: 1,
      classrooms: classes.length,
    };
  }

  /**
   * สร้างข้อมูลตัวอย่าง ~30 รายการ ภายใน 1 เดือนล่าสุด:
   *  - จำนวนนักเรียนรายชั้น (ให้คำนวณรายหัวได้)
   *  - financial_transactions 30 รายการ (รับ/จ่ายสลับ) ลงวันที่ย้อนหลัง ≤ 30 วัน
   */
  private async seedSamples(
    em: EntityManager,
    scId: number,
    syId: number,
    upBy: number,
  ) {
    // จำนวนนักเรียนรายชั้น (ของชั้นที่เปิดสอน)
    const openClasses = (await em.query(
      `SELECT class_id FROM school_classroom WHERE sc_id = ? AND del = 0 AND is_open = 1`,
      [scId],
    )) as { class_id: number }[];
    const beYear = new Date().getFullYear() + 543;
    for (const c of openClasses) {
      const count = 20 + Math.floor(Math.random() * 21); // 20-40
      await em.query(
        `INSERT INTO tb_student
           (sc_id, sy_id, budget_year, class_id, st_count, up_by, del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [scId, syId, beYear, c.class_id, count, upBy],
      );
    }

    // ประเภทเงินที่ผูกไว้ (สำหรับสุ่มลงธุรกรรม)
    const types = (await em.query(
      `SELECT bg_type_id FROM budget_income_type_school WHERE sc_id = ? AND del = 0`,
      [scId],
    )) as { bg_type_id: number }[];
    const typeIds = types.map((t) => t.bg_type_id);

    // 30 รายการธุรกรรม ภายใน 30 วันล่าสุด
    const N = 30;
    let income = 0;
    let expense = 0;
    for (let i = 0; i < N; i++) {
      const daysAgo = Math.floor((i / N) * 29); // กระจาย 0-29 วัน
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const dateStr = d.toISOString().slice(0, 19).replace('T', ' ');

      const type = i % 3 === 0 ? -1 : 1; // ~1/3 จ่าย, 2/3 รับ
      const bgTypeId = typeIds.length
        ? typeIds[i % typeIds.length]
        : 1;
      const amount =
        type === 1
          ? 5000 + Math.floor(Math.random() * 50000)
          : 1000 + Math.floor(Math.random() * 20000);
      const moneyChannel = Math.random() < 0.4 ? 1 : 2; // 1=เงินสด 2=ธนาคาร
      if (type === 1) income += amount;
      else expense += amount;

      await em.query(
        `INSERT INTO financial_transactions
           (type, bg_type_id, amount, money_channel, up_by, sc_id, sy_id, budget_year,
            del, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [type, bgTypeId, amount, moneyChannel, upBy, scId, syId, beYear, dateStr, dateStr],
      );
    }

    return {
      transactions: N,
      students: openClasses.length,
      sample_income: income,
      sample_expense: expense,
    };
  }
}
