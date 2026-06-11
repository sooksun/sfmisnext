import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { PlnRealBudget } from '../policy/entities/pln-real-budget.entity';
import { TbExpenses } from './entities/tb-expenses.entity';
import { StudentService } from '../student/student.service';
import { PlanPrevBalanceService } from '../plan-prev-balance/plan-prev-balance.service';

describe('BudgetService', () => {
  let service: BudgetService;
  let plnRepo: jest.Mocked<any>;
  let plnDetailRepo: jest.Mocked<any>;
  let estimateRepo: jest.Mocked<any>;
  let masterRepo: jest.Mocked<any>;
  let bgTypeRepo: jest.Mocked<any>;
  let plnRealBudgetRepo: jest.Mocked<any>;
  let expensesRepo: jest.Mocked<any>;
  let studentSvc: jest.Mocked<any>;
  let planPrevSvc: jest.Mocked<any>;

  beforeEach(async () => {
    plnRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      // insert().orIgnore().values().execute() chain for idempotent category creation
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
    };
    plnDetailRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    estimateRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    masterRepo = { find: jest.fn() };
    bgTypeRepo = { find: jest.fn() };
    plnRealBudgetRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
    expensesRepo = { find: jest.fn() };
    // ยอดประมาณการมาจากการคำนวณรายหัว (StudentService)
    studentSvc = {
      getPerheadTotal: jest.fn().mockResolvedValue(0),
      getPerheadByType: jest.fn().mockResolvedValue([]),
    };
    // เงินเหลือจ่ายปีเก่า (PlanPrevBalanceService) — default ว่าง/0
    planPrevSvc = {
      getSummaryByType: jest.fn().mockResolvedValue([]),
      getCarryoverTotal: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: StudentService, useValue: studentSvc },
        { provide: PlanPrevBalanceService, useValue: planPrevSvc },
        { provide: getRepositoryToken(PlnBudgetCategory), useValue: plnRepo },
        {
          provide: getRepositoryToken(PlnBudgetCategoryDetail),
          useValue: plnDetailRepo,
        },
        {
          provide: getRepositoryToken(TbEstimateAcadyear),
          useValue: estimateRepo,
        },
        {
          provide: getRepositoryToken(MasterBudgetCategory),
          useValue: masterRepo,
        },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bgTypeRepo },
        {
          provide: getRepositoryToken(PlnRealBudget),
          useValue: plnRealBudgetRepo,
        },
        { provide: getRepositoryToken(TbExpenses), useValue: expensesRepo },
      ],
    }).compile();

    service = module.get(BudgetService);
  });

  // ─── loadEstimateAcadyearGroup ────────────────────────────────────────────────
  describe('loadEstimateAcadyearGroup', () => {
    it('invalid scId (0) → คืน array ว่าง', async () => {
      const result = await service.loadEstimateAcadyearGroup(0, 2026, 1);
      expect(result).toEqual([]);
    });

    it('invalid year → คืน array ว่าง', async () => {
      const result = await service.loadEstimateAcadyearGroup(1, 0, 1);
      expect(result).toEqual([]);
    });

    it('ไม่มีประเภทเงินที่มีประมาณการ → คืน array ว่าง', async () => {
      studentSvc.getPerheadByType.mockResolvedValue([]);
      const result = await service.loadEstimateAcadyearGroup(1, 2026, 1);
      expect(result).toEqual([]);
    });

    it('คืนรายการแยกตามประเภทเงิน: estimate จากรายหัว, real จาก expenses, remain = ผลต่าง', async () => {
      studentSvc.getPerheadByType.mockResolvedValue([
        {
          bg_type_id: 1,
          budget_type: 'เงินอุดหนุนทั่วไป',
          estimated_amount: 100000,
        },
        {
          bg_type_id: 2,
          budget_type: 'ค่าใช้จ่ายรายหัว',
          estimated_amount: 50000,
        },
      ]);
      // ใช้จริงเฉพาะ type 1 = 30000
      expensesRepo.find.mockResolvedValue([
        { bgTypeId: 1, exMoney: 20000 },
        { bgTypeId: 1, exMoney: 10000 },
      ]);

      const result = await service.loadEstimateAcadyearGroup(1, 2026, 2);
      expect(studentSvc.getPerheadByType).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual([
        {
          budget_type_id: 1,
          budget_type_name: 'เงินอุดหนุนทั่วไป',
          estimate_amount: 100000,
          carryover_amount: 0,
          total_income: 100000,
          real_amount: 30000,
          remain_amount: 70000,
          budget_year: 2569, // 2026 + 543
        },
        {
          budget_type_id: 2,
          budget_type_name: 'ค่าใช้จ่ายรายหัว',
          estimate_amount: 50000,
          carryover_amount: 0,
          total_income: 50000,
          real_amount: 0,
          remain_amount: 50000,
          budget_year: 2569,
        },
      ]);
    });

    it('กรองประเภทที่ประมาณการ = 0 ออก', async () => {
      studentSvc.getPerheadByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'มีงบ', estimated_amount: 100000 },
        { bg_type_id: 9, budget_type: 'ไม่มีงบ', estimated_amount: 0 },
      ]);
      expensesRepo.find.mockResolvedValue([]);

      const result = await service.loadEstimateAcadyearGroup(1, 2026, 1);
      expect(result).toHaveLength(1);
      expect((result as any[])[0].budget_type_id).toBe(1);
    });

    it('บวกเงินเหลือจ่ายปีเก่าเป็นบรรทัดแยก และรวมยอด total_income', async () => {
      studentSvc.getPerheadByType.mockResolvedValue([
        {
          bg_type_id: 1,
          budget_type: 'เงินอุดหนุนทั่วไป',
          estimated_amount: 100000,
        },
      ]);
      // type 1 มี carryover 20000; type 5 มีเฉพาะ carryover (ไม่มีรายหัว)
      planPrevSvc.getSummaryByType.mockResolvedValue([
        {
          bg_type_id: 1,
          budget_type: 'เงินอุดหนุนทั่วไป',
          carryover_amount: 20000,
        },
        { bg_type_id: 5, budget_type: 'เงินบริจาค', carryover_amount: 5000 },
      ]);
      expensesRepo.find.mockResolvedValue([{ bgTypeId: 1, exMoney: 30000 }]);

      const result = (await service.loadEstimateAcadyearGroup(
        1,
        2026,
        1,
      )) as any[];
      const t1 = result.find((r) => r.budget_type_id === 1);
      const t5 = result.find((r) => r.budget_type_id === 5);
      expect(t1).toMatchObject({
        estimate_amount: 100000,
        carryover_amount: 20000,
        total_income: 120000,
        real_amount: 30000,
        remain_amount: 90000,
      });
      expect(t5).toMatchObject({
        estimate_amount: 0,
        carryover_amount: 5000,
        total_income: 5000,
      });
    });
  });

  // ─── checkBudgetCategoryOnYear ────────────────────────────────────────────────
  describe('checkBudgetCategoryOnYear', () => {
    it('invalid sc_id → { valid: false }', async () => {
      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 0,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result.valid).toBe(false);
    });

    it('ไม่มี budget_date → { valid: false }', async () => {
      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '',
        up_by: 1,
      });
      expect(result.valid).toBe(false);
    });

    it('ครบทุกหมวดอยู่แล้ว → ไม่ insert ซ้ำ', async () => {
      masterRepo.find.mockResolvedValue([{ bgCateId: 1 }, { bgCateId: 2 }]);
      // มีครบทั้ง 2 หมวดแล้ว
      plnRepo.find.mockResolvedValue([{ bgCateId: 1 }, { bgCateId: 2 }]);
      const qb = plnRepo.createQueryBuilder();

      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result.valid).toBe(true);
      expect(qb.execute).not.toHaveBeenCalled(); // ไม่มี insert
    });

    it('ยังไม่มีหมวด → insert เฉพาะที่ขาด (idempotent)', async () => {
      masterRepo.find.mockResolvedValue([{ bgCateId: 1 }, { bgCateId: 2 }]);
      plnRepo.find.mockResolvedValue([{ bgCateId: 1 }]); // มีแค่หมวด 1
      const qb = plnRepo.createQueryBuilder();

      await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 7,
      });
      // insert เฉพาะหมวด 2 ที่ขาด
      expect(qb.values).toHaveBeenCalledWith([
        expect.objectContaining({ bgCateId: 2, scId: 1 }),
      ]);
      expect(qb.execute).toHaveBeenCalled();
    });

    it('budget = ผลรวมยอดประมาณการแยกประเภท (เพดานกรอกจริง)', async () => {
      masterRepo.find.mockResolvedValue([]);
      plnRepo.find.mockResolvedValue([]);
      studentSvc.getPerheadTotal.mockResolvedValue(75000);
      // budget มาจาก loadEstimatedIncomeByType (per-type) ไม่ใช่ getPerheadTotal
      studentSvc.getPerheadByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', estimated_amount: 50000 },
        { bg_type_id: 2, budget_type: 'B', estimated_amount: 25000 },
      ]);
      planPrevSvc.getSummaryByType.mockResolvedValue([]);

      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result).toMatchObject({ valid: true, budget: 75000 });
    });

    it('budget รวมเงินเหลือจ่ายปีเก่า (รายหัวต่อประเภท + carryover ต่อประเภท)', async () => {
      masterRepo.find.mockResolvedValue([]);
      plnRepo.find.mockResolvedValue([]);
      studentSvc.getPerheadTotal.mockResolvedValue(75000);
      planPrevSvc.getCarryoverTotal.mockResolvedValue(25000);
      studentSvc.getPerheadByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', estimated_amount: 75000 },
      ]);
      // carryover ต่อประเภท → loadEstimatedIncomeByType บวกเข้า estimated_amount
      planPrevSvc.getSummaryByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', carryover_amount: 25000 },
      ]);

      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result).toMatchObject({
        valid: true,
        budget: 100000, // 75000 + 25000 carryover
        perhead: 75000,
        carryover: 25000,
      });
    });
  });

  // ─── checkBudgetCategoryOnYears ───────────────────────────────────────────────
  describe('checkBudgetCategoryOnYears', () => {
    it('ไม่มี pbc_id → flag: false', async () => {
      const result = await service.checkBudgetCategoryOnYears({
        pbc_id: 0,
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
      });
      expect(result).toMatchObject({ flag: false });
    });

    it('ไม่พบ plnBudget → flag: false', async () => {
      plnRepo.findOne.mockResolvedValue(null);
      const result = await service.checkBudgetCategoryOnYears({
        pbc_id: 1,
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
      });
      expect(result).toMatchObject({
        flag: false,
        ms: 'ไม่พบข้อมูลหมวดงบประมาณ',
      });
    });

    it('คำนวณ balance_budget ถูกต้อง', async () => {
      plnRepo.findOne.mockResolvedValue({ pbcId: 1 });
      plnDetailRepo.find.mockResolvedValue([
        { budget: 30000 },
        { budget: 20000 },
      ]); // total = 50000
      studentSvc.getPerheadTotal.mockResolvedValue(100000);

      const result = await service.checkBudgetCategoryOnYears({
        pbc_id: 1,
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
      });
      expect(result).toMatchObject({
        budgetProject: 100000,
        totalBudgetGroup: 50000,
        balance_budget: 50000,
        percent: '50.00',
      });
    });
  });

  // ─── updateEstimate ──────────────────────────────────────────────────────────
  describe('updateEstimate', () => {
    it('ไม่พบ estimate → flag: false', async () => {
      estimateRepo.findOne.mockResolvedValue(null);
      const result = await service.updateEstimate({ ea_id: 999 });
      expect(result).toMatchObject({ flag: false, ms: 'ไม่พบข้อมูลงบประมาณ' });
    });

    it('happy path → บันทึกและคืน flag: true', async () => {
      const estimate = { eaId: 1, del: 0, eaStatus: 0 };
      estimateRepo.findOne.mockResolvedValue(estimate);
      estimateRepo.save.mockResolvedValue(estimate);

      const result = await service.updateEstimate({ ea_id: 1, ea_status: 1 });
      expect(result).toMatchObject({ flag: true });
      expect(estimate.eaStatus).toBe(1);
    });
  });

  // ─── updateRealBudget ─────────────────────────────────────────────────────────
  describe('updateRealBudget', () => {
    it('ไม่มี pbc_id → flag: false', async () => {
      const result = await service.updateRealBudget({
        pbc_id: 0,
        sc_id: 1,
        sy_id: 1,
        real_budget: 0,
      });
      expect(result).toMatchObject({ flag: false, ms: 'ไม่พบข้อมูล pbc_id' });
    });

    it('real_budget < 0 → flag: false', async () => {
      const result = await service.updateRealBudget({
        pbc_id: 1,
        sc_id: 1,
        sy_id: 1,
        real_budget: -100,
      });
      expect(result).toMatchObject({ flag: false });
    });

    it('ไม่พบ plnBudget → flag: false', async () => {
      plnRepo.findOne.mockResolvedValue(null);
      const result = await service.updateRealBudget({
        pbc_id: 1,
        sc_id: 1,
        sy_id: 1,
        real_budget: 5000,
      });
      expect(result).toMatchObject({
        flag: false,
        ms: 'ไม่พบข้อมูลหมวดงบประมาณ',
      });
    });

    it('คำนวณ percent ถูกต้อง', async () => {
      const plnBudget = {
        pbcId: 1,
        scId: 1,
        acadYear: 1,
        del: 0,
        budgetYear: '2568',
        total: 0,
        percents: 0,
      };
      plnRepo.findOne.mockResolvedValue(plnBudget);
      // ยังต้องมี estimate record ผ่าน guard, แต่ฐาน % มาจากการคำนวณรายหัว
      estimateRepo.findOne.mockResolvedValue({ eaId: 1, eaStatus: 0 });
      studentSvc.getPerheadTotal.mockResolvedValue(200000);
      plnRepo.save.mockResolvedValue(plnBudget);

      await service.updateRealBudget({
        pbc_id: 1,
        sc_id: 1,
        sy_id: 1,
        real_budget: 50000,
      });
      expect(plnBudget.percents).toBe(25); // 50000/200000*100
      expect(plnBudget.total).toBe(50000);
    });
  });

  // ─── addEstimateAcadyear ──────────────────────────────────────────────────────
  describe('addEstimateAcadyear', () => {
    const dto = {
      sc_id: 1,
      sy_id: 1,
      budget_year: '2568',
      ea_budget: 100000,
      ea_status: 0,
      up_by: 5,
    };

    it('มีอยู่แล้ว → flag: false', async () => {
      estimateRepo.findOne.mockResolvedValue({ eaId: 1 });
      const result = await service.addEstimateAcadyear(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('มีข้อมูลงบประมาณ');
    });

    it('สร้างใหม่ + default categories → flag: true', async () => {
      estimateRepo.findOne.mockResolvedValue(null);
      const saved = { eaId: 7 };
      estimateRepo.save.mockResolvedValue(saved);
      masterRepo.find.mockResolvedValue([{ bgCateId: 1 }, { bgCateId: 2 }]);
      plnRepo.find.mockResolvedValue([]); // ยังไม่มี categories
      plnRepo.save.mockResolvedValue([]);

      const result = await service.addEstimateAcadyear(dto);
      expect(result.flag).toBe(true);
      expect(result.ea_id).toBe(7);
      expect(plnRepo.save).toHaveBeenCalled(); // สร้าง default categories
    });

    it('มี categories อยู่แล้ว → ไม่สร้าง default', async () => {
      estimateRepo.findOne.mockResolvedValue(null);
      estimateRepo.save.mockResolvedValue({ eaId: 1 });
      masterRepo.find.mockResolvedValue([{ bgCateId: 1 }]);
      plnRepo.find.mockResolvedValue([{ pbcId: 1 }]); // มีอยู่แล้ว
      plnRepo.save.mockResolvedValue([]);

      await service.addEstimateAcadyear(dto);
      expect(plnRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── removePLNBudgetCategory ──────────────────────────────────────────────────
  describe('removePLNBudgetCategory', () => {
    it('pbc_id ไม่ถูกต้อง → flag:false', async () => {
      const result = await service.removePLNBudgetCategory(0, 1, 2);
      expect(result.flag).toBe(false);
      expect(plnRepo.findOne).not.toHaveBeenCalled();
    });

    it('ไม่พบหมวด → flag:false', async () => {
      plnRepo.findOne.mockResolvedValue(null);
      const result = await service.removePLNBudgetCategory(99, 1, 2);
      expect(result).toMatchObject({ flag: false });
    });

    it('happy path → soft-delete หมวด + รายละเอียดทุกแถว', async () => {
      const cat: any = { pbcId: 1, scId: 1, del: 0 };
      const details: any[] = [
        { pbcdId: 10, del: 0 },
        { pbcdId: 11, del: 0 },
      ];
      plnRepo.findOne.mockResolvedValue(cat);
      plnDetailRepo.find.mockResolvedValue(details);
      plnDetailRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      plnRepo.save.mockResolvedValue(cat);

      const result = await service.removePLNBudgetCategory(1, 1, 2, 7);
      expect(result.flag).toBe(true);
      expect(cat.del).toBe(1);
      expect(cat.upBy).toBe(7);
      expect(details[0].del).toBe(1);
      expect(details[1].del).toBe(1);
      expect(plnDetailRepo.save).toHaveBeenCalledTimes(2);
    });

    it('cross-tenant (ไม่ใช่ super admin, คนละ sc) → throw 403', async () => {
      plnRepo.findOne.mockResolvedValue({ pbcId: 1, scId: 99, del: 0 });
      await expect(
        service.removePLNBudgetCategory(1, 5, 2),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(plnRepo.save).not.toHaveBeenCalled();
    });

    it('super admin (type=1) ลบข้ามโรงเรียนได้', async () => {
      const cat: any = { pbcId: 1, scId: 99, del: 0 };
      plnRepo.findOne.mockResolvedValue(cat);
      plnDetailRepo.find.mockResolvedValue([]);
      plnRepo.save.mockResolvedValue(cat);
      const result = await service.removePLNBudgetCategory(1, 5, 1);
      expect(result.flag).toBe(true);
    });
  });

  // ─── loadEstimatedIncomeByType (ปัดเศษเต็มบาท) ─────────────────────────────────
  describe('loadEstimatedIncomeByType', () => {
    it('ปัดยอดประมาณการต่อประเภทเป็นจำนวนเต็มบาท (เพดาน+งบทั้งหมดลงตัว)', async () => {
      // เศษสตางค์จากรายหัว×สัดส่วน → ต้องปัดเป็นจำนวนเต็ม
      studentSvc.getPerheadByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', estimated_amount: 6499.6 },
        { bg_type_id: 2, budget_type: 'B', estimated_amount: 411277.33 },
      ]);
      planPrevSvc.getSummaryByType.mockResolvedValue([]);

      const result = await service.loadEstimatedIncomeByType(1, 1);
      const a = result.find((r: any) => r.bg_type_id === 1);
      const b = result.find((r: any) => r.bg_type_id === 2);
      expect(a?.estimated_amount).toBe(6500); // 6499.6 → 6500
      expect(b?.estimated_amount).toBe(411277); // 411277.33 → 411277
      // ทุกค่าต้องเป็นจำนวนเต็ม
      expect(result.every((r: any) => Number.isInteger(r.estimated_amount))).toBe(
        true,
      );
    });

    it('บวก carryover ก่อนปัด (รายหัว+เหลือจ่ายปีเก่า แล้วปัดเต็มบาท)', async () => {
      studentSvc.getPerheadByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', estimated_amount: 100000.4 },
      ]);
      planPrevSvc.getSummaryByType.mockResolvedValue([
        { bg_type_id: 1, budget_type: 'A', carryover_amount: 20000.3 },
      ]);
      const result = await service.loadEstimatedIncomeByType(1, 1);
      // (100000.4 + 20000.3) = 120000.7 → 120001
      expect(result[0].estimated_amount).toBe(120001);
    });
  });
});
