import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetService } from './budget.service';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { PlnRealBudget } from '../policy/entities/pln-real-budget.entity';
import { TbExpenses } from './entities/tb-expenses.entity';
import { StudentService } from '../student/student.service';

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

  beforeEach(async () => {
    plnRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
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
    // ยอดประมาณการมาจากการคำนวณรายหัว (StudentService) — default 0
    studentSvc = { getPerheadTotal: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: StudentService, useValue: studentSvc },
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
    it('invalid scId (0) → คืน empty structure', async () => {
      const result = await service.loadEstimateAcadyearGroup(0, 2568, 1);
      expect(result).toEqual({
        data: [],
        totalrealbudget: 0,
        totalsumbudget: 0,
      });
    });

    it('invalid year → คืน empty structure', async () => {
      const result = await service.loadEstimateAcadyearGroup(1, 0, 1);
      expect(result).toEqual({
        data: [],
        totalrealbudget: 0,
        totalsumbudget: 0,
      });
    });

    it('ไม่มี master categories → คืน empty structure', async () => {
      masterRepo.find.mockResolvedValue([]);
      const result = await service.loadEstimateAcadyearGroup(1, 2568, 1);
      expect(result).toEqual({
        data: [],
        totalrealbudget: 0,
        totalsumbudget: 0,
      });
    });

    it('คำนวณ totalrealbudget จาก details', async () => {
      masterRepo.find.mockResolvedValue([
        { bgCateId: 1, budgetCate: 'หมวด 1' },
      ]);
      estimateRepo.findOne.mockResolvedValue({
        eaId: 1,
        eaBudget: 100000,
        eaStatus: 1,
      });
      plnRepo.find.mockResolvedValue([
        {
          pbcId: 5,
          bgCateId: 1,
          scId: 1,
          acadYear: 1,
          budgetYear: '2568',
          del: 0,
        },
      ]);
      plnDetailRepo.find.mockResolvedValue([
        { pbcId: 5, budget: 30000, bgTypeId: 2, del: 0 },
        { pbcId: 5, budget: 20000, bgTypeId: 2, del: 0 },
      ]);
      expensesRepo.find.mockResolvedValue([]);

      const result = await service.loadEstimateAcadyearGroup(1, 2568, 1);
      expect(result.totalrealbudget).toBe(50000);
    });

    it('totalsumbudget รวมยอดประมาณการ (จากการคำนวณรายหัว) ทุก row', async () => {
      masterRepo.find.mockResolvedValue([
        { bgCateId: 1, budgetCate: 'A' },
        { bgCateId: 2, budgetCate: 'B' },
      ]);
      estimateRepo.findOne.mockResolvedValue({ eaId: 1, eaStatus: 1 });
      // ยอดประมาณการดึงสดจากการคำนวณรายหัว
      studentSvc.getPerheadTotal.mockResolvedValue(200000);
      plnRepo.find.mockResolvedValue([]);
      plnDetailRepo.find.mockResolvedValue([]);
      expensesRepo.find.mockResolvedValue([]);

      const result = await service.loadEstimateAcadyearGroup(1, 2568, 1);
      // 2 categories × 200000 = 400000
      expect(result.totalsumbudget).toBe(400000);
      expect(studentSvc.getPerheadTotal).toHaveBeenCalledWith(1, 1);
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

    it('มีข้อมูลอยู่แล้ว → ไม่สร้าง default categories', async () => {
      plnRepo.count.mockResolvedValue(3);
      estimateRepo.findOne.mockResolvedValue({ eaBudget: 50000 });

      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result.valid).toBe(true);
      expect(masterRepo.find).not.toHaveBeenCalled();
    });

    it('count=0 → สร้าง default categories จาก master', async () => {
      plnRepo.count.mockResolvedValue(0);
      masterRepo.find.mockResolvedValue([{ bgCateId: 1 }, { bgCateId: 2 }]);
      plnRepo.save.mockResolvedValue([]);
      estimateRepo.findOne.mockResolvedValue({ eaBudget: 50000 });

      await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 7,
      });
      expect(plnRepo.save).toHaveBeenCalled();
    });

    it('คืน budget จากการคำนวณรายหัว (สด) ถูกต้อง', async () => {
      plnRepo.count.mockResolvedValue(1);
      studentSvc.getPerheadTotal.mockResolvedValue(75000);

      const result = await service.checkBudgetCategoryOnYear({
        sc_id: 1,
        sy_id: 1,
        budget_date: '2568',
        up_by: 1,
      });
      expect(result).toMatchObject({ valid: true, budget: 75000 });
      expect(studentSvc.getPerheadTotal).toHaveBeenCalledWith(1, 1);
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
});
