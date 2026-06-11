import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { SchoolResetService } from './school-reset.service';

/**
 * ทดสอบ "ความปลอดภัยของการลบ" — สมบัติสำคัญที่สุด:
 *  - resetSystem ต้องไม่ลบตาราง identity (admin/school/school_year) และ Tier B (bankaccount ฯลฯ)
 *  - demoSchool ต้องลบ Tier B ด้วย
 *  - ลบเฉพาะ sc_id ที่ส่งเข้ามา
 */
describe('SchoolResetService', () => {
  let service: SchoolResetService;
  let deletedTables: string[];
  let deleteScIds: number[];

  // ตารางสมมติที่มีคอลัมน์ sc_id
  const SC_TABLES = [
    'admin',
    'school',
    'school_year',
    'bankaccount',
    'budget_income_type_school',
    'regulatory_threshold',
    'financial_transactions',
    'request_withdraw',
    'receipt',
    'pln_project',
  ];

  function makeEm() {
    return {
      query: jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('INFORMATION_SCHEMA.TABLES')) return [{ x: 1 }]; // exists
        if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
          return SC_TABLES.map((t) => ({ TABLE_NAME: t }));
        }
        if (sql.startsWith('DELETE')) {
          const m = sql.match(/DELETE FROM `([^`]+)`/);
          if (m) deletedTables.push(m[1]);
          if (params && typeof params[0] === 'number')
            deleteScIds.push(params[0]);
          return { affectedRows: 1 };
        }
        // seedConfig queries
        if (sql.includes('FROM school_year')) return [{ sy_id: 5, budget_year: 2569 }];
        if (sql.includes('FROM bank_db')) return [{ b_id: 1 }];
        if (sql.includes('FROM bankaccount')) return [{ ba_id: 9 }];
        if (sql.includes('FROM master_budget_income_type'))
          return [{ bg_type_id: 1, budget_type: 'เงินอุดหนุนรายหัว' }];
        if (sql.includes('FROM master_classroom'))
          return [{ class_id: 1, class_lev: 'ประถมศึกษาปีที่ 1' }];
        if (sql.includes('FROM school_classroom')) return [{ class_id: 1 }];
        if (sql.includes('FROM budget_income_type_school'))
          return [{ bg_type_id: 1 }];
        return [];
      }),
    };
  }

  beforeEach(async () => {
    deletedTables = [];
    deleteScIds = [];
    const dataSource = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(makeEm())),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolResetService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();
    service = module.get(SchoolResetService);
  });

  describe('resetSystem (Tier C เท่านั้น)', () => {
    it('ลบ Tier C แต่ "ไม่แตะ" identity + Tier B', async () => {
      const res = await service.resetSystem(7);
      expect(res.flag).toBe(true);
      // identity — ห้ามลบ
      expect(deletedTables).not.toContain('admin');
      expect(deletedTables).not.toContain('school');
      expect(deletedTables).not.toContain('school_year');
      // Tier B — ห้ามลบ
      expect(deletedTables).not.toContain('bankaccount');
      expect(deletedTables).not.toContain('budget_income_type_school');
      expect(deletedTables).not.toContain('regulatory_threshold');
      // Tier C — ต้องลบ
      expect(deletedTables).toContain('financial_transactions');
      expect(deletedTables).toContain('request_withdraw');
      expect(deletedTables).toContain('pln_project');
    });

    it('ลบเฉพาะ sc_id ที่ส่งเข้ามา (7) เท่านั้น', async () => {
      await service.resetSystem(7);
      expect(deleteScIds.length).toBeGreaterThan(0);
      expect(deleteScIds.every((id) => id === 7)).toBe(true);
    });

    it('ลบ child tables (ไม่มี sc_id) ผ่าน parent', async () => {
      await service.resetSystem(7);
      expect(deletedTables).toContain('pln_receive_detail');
      expect(deletedTables).toContain('parcel_detail');
      expect(deletedTables).toContain('pln_budget_category_detail');
    });
  });

  describe('demoSchool (ลบ Tier B ด้วย + สร้างค่าตั้งค่า)', () => {
    it('ลบ Tier B (bankaccount/budget_income_type_school) ด้วย', async () => {
      const res = await service.demoSchool(7, 1);
      expect(res.flag).toBe(true);
      expect(deletedTables).toContain('bankaccount');
      expect(deletedTables).toContain('budget_income_type_school');
      // identity ยังห้ามลบ
      expect(deletedTables).not.toContain('admin');
      expect(deletedTables).not.toContain('school');
      // ลบ Tier B child ผ่าน school_year
      expect(deletedTables).toContain('master_classroombudget');
    });
  });

  describe('resetDemoData (+ ตัวอย่าง)', () => {
    it('คืน flag:true พร้อมจำนวนตัวอย่าง 30 รายการ', async () => {
      const res: any = await service.resetDemoData(7, 1);
      expect(res.flag).toBe(true);
      expect(res.transactions).toBe(30);
    });
  });
});
