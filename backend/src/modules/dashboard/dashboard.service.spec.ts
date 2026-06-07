import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { School } from '../school/entities/school.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { TbEstimateAcadyear } from '../budget/entities/tb-estimate-acadyear.entity';
import { GovRevenueService } from '../gov-revenue/gov-revenue.service';
import { RegisterMoneyTypeService } from '../register-money-type/register-money-type.service';
import { LoanAgreementService } from '../loan-agreement/loan-agreement.service';
import { ReportDailyBalanceService } from '../report-daily-balance/report-daily-balance.service';
import { CashKeepingService } from '../cash-keeping/cash-keeping.service';

// ─── QueryBuilder mock factory ─────────────────────────────────────────────────
function makeQb(rawResult?: unknown) {
  const qb: Record<string, jest.Mock> = {};
  ['select', 'addSelect', 'where', 'andWhere', 'groupBy', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb as any)),
  );
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawResult ?? []);
  qb['getRawOne'] = jest.fn().mockResolvedValue(rawResult ?? null);
  return qb;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let syRepo: jest.Mocked<any>;
  let schoolRepo: jest.Mocked<any>;
  let ftRepo: jest.Mocked<any>;
  let bgTypeRepo: jest.Mocked<any>;
  let estimateRepo: jest.Mocked<any>;

  beforeEach(async () => {
    syRepo = { find: jest.fn(), findOne: jest.fn() };
    schoolRepo = {};
    ftRepo = { createQueryBuilder: jest.fn() };
    bgTypeRepo = { find: jest.fn() };
    estimateRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(SchoolYear), useValue: syRepo },
        { provide: getRepositoryToken(School), useValue: schoolRepo },
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bgTypeRepo },
        {
          provide: getRepositoryToken(TbEstimateAcadyear),
          useValue: estimateRepo,
        },
        {
          provide: GovRevenueService,
          useValue: { interestReminder: jest.fn() },
        },
        {
          provide: RegisterMoneyTypeService,
          useValue: { whtRemitReminder: jest.fn() },
        },
        { provide: LoanAgreementService, useValue: { dueReminder: jest.fn() } },
        {
          provide: ReportDailyBalanceService,
          useValue: { loadCashLimitCheck: jest.fn() },
        },
        {
          provide: CashKeepingService,
          useValue: { depositReminder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  // ─── loadChartBudgetTypePie ───────────────────────────────────────────────────
  describe('loadChartBudgetTypePie', () => {
    it('ไม่มีข้อมูล → { data: [], labels: [] }', async () => {
      const qb = makeQb([]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.loadChartBudgetTypePie(1);
      expect(result).toEqual({ data: [], labels: [] });
    });

    it('filter scId และ type=1 (รายรับ) และ del=0', async () => {
      const qb = makeQb([]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);

      await service.loadChartBudgetTypePie(5);
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('ft.sc_id = :scId'),
        expect.objectContaining({ scId: 5 }),
      );
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('ft.type = 1'),
        expect.anything(),
      );
    });

    it('แปลง total string → number และ round ทศนิยม', async () => {
      const qb = makeQb([{ bgTypeId: 1, total: '12345.678' }]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);
      bgTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน', del: 0 },
      ]);

      const result = await service.loadChartBudgetTypePie(1);
      expect(result.data[0]).toBe(12345.68); // round 2 ทศนิยม
      expect(result.labels[0]).toBe('เงินอุดหนุน');
    });

    it('ไม่พบ bgType ในตาราง → label เป็น "ประเภท X"', async () => {
      const qb = makeQb([{ bgTypeId: 99, total: '500' }]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);
      bgTypeRepo.find.mockResolvedValue([]);

      const result = await service.loadChartBudgetTypePie(1);
      expect(result.labels[0]).toBe('ประเภท 99');
    });

    it('cross-tenant — query ใช้ scId ที่ส่งมาเท่านั้น (ไม่ cross to sc_id อื่น)', async () => {
      const qb = makeQb([]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);

      await service.loadChartBudgetTypePie(42);
      expect(qb.where).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ scId: 42 }),
      );
    });
  });

  // ─── loadChartBudgetTypeBar ───────────────────────────────────────────────────
  describe('loadChartBudgetTypeBar', () => {
    it('ไม่มีข้อมูล → { data: [], labels: [] }', async () => {
      const qb = makeQb([]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.loadChartBudgetTypeBar(1);
      expect(result).toEqual({ data: [], labels: [] });
    });

    it('แปลง income/expense string → number', async () => {
      const qb = makeQb([{ bgTypeId: 1, income: '5000', expense: '1500' }]);
      ftRepo.createQueryBuilder.mockReturnValue(qb);
      bgTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน', del: 0 },
      ]);

      const result = await service.loadChartBudgetTypeBar(1);
      expect(result.data[0].income).toBe(5000);
      expect(result.data[0].expense).toBe(1500);
    });
  });

  // ─── predictBudget ────────────────────────────────────────────────────────────
  describe('predictBudget', () => {
    it('คำนวณ fiscal year จาก budget_year พ.ศ. ถูกต้อง', async () => {
      // budget_year='2568' → CE end=2025, start=2024 → fiscalStart=2024-10-01, fiscalEnd=2025-09-30
      const estQb = makeQb({ predicted: '100000', realBudget: '90000' });
      estimateRepo.createQueryBuilder.mockReturnValue(estQb);

      const ftQb = makeQb({ total: '85000' });
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);

      const result = await service.predictBudget(1, '2568');

      // ตรวจว่า ftQb.andWhere ถูกเรียกด้วย fiscalStart/End ที่ถูกต้อง
      expect(ftQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ft.create_date'),
        expect.objectContaining({
          fiscalStart: '2024-10-01',
          fiscalEnd: '2025-09-30',
        }),
      );
    });

    it('คำนวณ difference = actual - predicted', async () => {
      const estQb = makeQb({ predicted: '100000', realBudget: '80000' });
      estimateRepo.createQueryBuilder.mockReturnValue(estQb);
      const ftQb = makeQb({ total: '120000' });
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);

      const result = await service.predictBudget(1, '2568');
      expect(result.predicted).toBe(100000);
      expect(result.actual).toBe(120000);
      expect(result.difference).toBe(20000);
    });

    it('null estimate/actual → คืน 0', async () => {
      const estQb = makeQb(null);
      estimateRepo.createQueryBuilder.mockReturnValue(estQb);
      const ftQb = makeQb(null);
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);

      const result = await service.predictBudget(1, '2568');
      expect(result.predicted).toBe(0);
      expect(result.actual).toBe(0);
    });
  });

  // ─── loadDashboard ────────────────────────────────────────────────────────────
  describe('loadDashboard', () => {
    it('cross-tenant isolation — query ใช้ scId ที่ส่งมา', async () => {
      syRepo.findOne.mockResolvedValue(null);
      const ftQb = makeQb(null);
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);

      await service.loadDashboard(77);
      expect(ftQb.where).toHaveBeenCalledWith(
        expect.stringContaining('ft.sc_id = :scId'),
        expect.objectContaining({ scId: 77 }),
      );
    });

    it('ไม่มี currentYear → currentYear = null ใน response', async () => {
      syRepo.findOne.mockResolvedValue(null);
      const ftQb = makeQb({ income: '50000', expense: '20000' });
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);

      const result = await service.loadDashboard(1);
      expect(result.currentYear).toBeNull();
    });

    it('คำนวณ remaining = income - expense', async () => {
      syRepo.findOne.mockResolvedValue({
        syId: 1,
        syYear: '2568',
        budgetYear: '2568',
      });
      const ftQb = makeQb({ income: '100000', expense: '30000' });
      ftRepo.createQueryBuilder.mockReturnValue(ftQb);
      const estQb = makeQb({ total: '90000' });
      estimateRepo.createQueryBuilder.mockReturnValue(estQb);

      const result = await service.loadDashboard(1);
      expect(result.budgetReceived).toBe(100000);
      expect(result.disbursement).toBe(30000);
      expect(result.remaining).toBe(70000);
    });
  });

  // ─── getRound ─────────────────────────────────────────────────────────────────
  describe('getRound', () => {
    it('filter scId และ del=0 และ take 10', async () => {
      syRepo.find.mockResolvedValue([]);
      await service.getRound(8);
      expect(syRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 8, del: 0 }, take: 10 }),
      );
    });

    it('map ปีการศึกษาถูกต้อง', async () => {
      syRepo.find.mockResolvedValue([
        {
          syId: 3,
          syYear: '2568',
          semester: 1,
          syDateS: null,
          syDateE: null,
          budgetYear: '2568',
        },
      ]);

      const result = await service.getRound(1);
      expect(result.rounds[0]).toMatchObject({
        sy_id: 3,
        sy_year: '2568',
        semester: 1,
        budget_year: '2568',
      });
    });
  });
});
