import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanPrevBalanceService } from './plan-prev-balance.service';
import { PlanPrevBalance } from './entities/plan-prev-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { FundBalanceService } from '../fund-balance/fund-balance.service';

describe('PlanPrevBalanceService.expiredForTreasury', () => {
  let service: PlanPrevBalanceService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { find: jest.fn().mockResolvedValue([]) };
    const stub = { find: jest.fn(), findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanPrevBalanceService,
        { provide: getRepositoryToken(PlanPrevBalance), useValue: repo },
        { provide: getRepositoryToken(FiscalYearBalance), useValue: stub },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: stub },
        { provide: getRepositoryToken(SchoolYear), useValue: stub },
        { provide: FundBalanceService, useValue: { available: jest.fn() } },
      ],
    }).compile();
    service = module.get(PlanPrevBalanceService);
  });

  it('คืนเฉพาะรายการ expired (ปีที่มา+1 < ปีงบปัจจุบัน) และรวมยอด', async () => {
    repo.find.mockResolvedValue([
      // ปีงบปัจจุบัน 2569: ปีที่มา 2567 → ใช้ได้ถึง 2568 < 2569 = expired
      {
        ppbId: 1,
        moneyTypeId: 1,
        moneyTypeName: 'รายหัว',
        sourceBudgetYear: '2567',
        amount: 5000,
      },
      // ปีที่มา 2568 → ใช้ได้ถึง 2569 = last_year (ยังไม่ expired)
      {
        ppbId: 2,
        moneyTypeId: 2,
        moneyTypeName: 'ปัจจัยพื้นฐาน',
        sourceBudgetYear: '2568',
        amount: 3000,
      },
      // expired แต่ยอด 0 → ตัดออก
      {
        ppbId: 3,
        moneyTypeId: 3,
        moneyTypeName: 'ว่าง',
        sourceBudgetYear: '2566',
        amount: 0,
      },
    ]);
    const r = await service.expiredForTreasury(5, 10, '2569');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].ppb_id).toBe(1);
    expect(r.data[0].usable_until_year).toBe(2568);
    expect(r.total).toBe(5000);
  });

  it('ไม่มี expired → total 0', async () => {
    repo.find.mockResolvedValue([
      {
        ppbId: 2,
        moneyTypeId: 2,
        moneyTypeName: 'x',
        sourceBudgetYear: '2568',
        amount: 3000,
      },
    ]);
    const r = await service.expiredForTreasury(5, 10, '2569');
    expect(r.data).toHaveLength(0);
    expect(r.total).toBe(0);
  });
});
