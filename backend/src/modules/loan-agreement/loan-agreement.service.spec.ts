import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoanAgreementService } from './loan-agreement.service';
import { LoanAgreement } from './entities/loan-agreement.entity';
import { LoanReturnEvidence } from './entities/loan-return-evidence.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

/**
 * ทดสอบว่า "เงินยืม" ผูกกับทะเบียนคุมเงิน (financial_transactions) ถูกต้อง
 *   - ยืม → ตัดยอด (type=-1) ของประเภทเงิน
 *   - ส่งใช้ (คืนเงินสด) → คืนยอด (type=+1) เฉพาะเงินสด ; ใบสำคัญถือเป็นค่าใช้จ่ายแล้ว
 *   - ยกเลิก → soft-delete FT ตอนยืม (คืนยอด)
 */
describe('LoanAgreementService — ledger integration (financial_transactions)', () => {
  let service: LoanAgreementService;

  // mocks ที่ test เข้าถึงได้ผ่าน em.getRepository
  let ftRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let laTxRepo: { create: jest.Mock; save: jest.Mock };
  let lreTxRepo: { create: jest.Mock; save: jest.Mock };

  // record ผลของ FT ที่ถูก save
  let savedFts: any[];
  // loan ปัจจุบันที่ findOne (ระดับ service) จะคืน
  let currentLoan: any;
  // ยอดคงเหลือที่ FundBalanceService จะคืน (override ได้ใน test การบล็อก)
  let availableBalance: number;

  beforeEach(async () => {
    savedFts = [];
    currentLoan = null;
    availableBalance = Number.MAX_SAFE_INTEGER;

    ftRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => {
        const row = { ftId: savedFts.length + 100, ...e };
        savedFts.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    laTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ laId: 1, ...e })),
    };
    lreTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const em = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === FinancialTransactions) return ftRepo;
        if (entity === LoanAgreement) return laTxRepo;
        if (entity === LoanReturnEvidence) return lreTxRepo;
        return {};
      }),
    };

    const dataSource: Partial<DataSource> = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(em)),
    };

    // service-level repos (นอก transaction)
    const laRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(currentLoan)),
    };
    const adminRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ adminId: 9, name: 'ครูทดสอบ', position: 5 }),
    };
    const budgetTypeRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ bgTypeId: 101, budgetType: 'เงินอุดหนุนรายหัว' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanAgreementService,
        { provide: getRepositoryToken(LoanAgreement), useValue: laRepo },
        { provide: getRepositoryToken(LoanReturnEvidence), useValue: {} },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: budgetTypeRepo },
        { provide: getRepositoryToken(FinancialTransactions), useValue: ftRepo },
        {
          provide: DocCounterService,
          useValue: {
            issue: jest
              .fn()
              .mockResolvedValue({ seq: 5, formatted: 'บย.5/2556' }),
          },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: FundBalanceService,
          useValue: {
            available: jest.fn().mockImplementation(() =>
              Promise.resolve(availableBalance),
            ),
            availableInTx: jest.fn().mockImplementation(() =>
              Promise.resolve(availableBalance),
            ),
          },
        },
        {
          provide: RegulatoryConfigService,
          useValue: { getThreshold: jest.fn().mockResolvedValue(1) },
        },
      ],
    }).compile();

    service = module.get<LoanAgreementService>(LoanAgreementService);
  });

  it('ยืมเงิน → สร้าง FT ตัดยอด (type=-1) ของประเภทเงินตามจำนวนยืม', async () => {
    const res = await service.addLoanAgreement({
      sc_id: 1,
      sy_id: 3,
      budget_year: '2556',
      borrower_id: 9,
      money_type_id: 101,
      purpose: 'ยืมไปราชการ',
      amount: 29500,
      borrow_date: '2012-12-24',
      loan_category: 1,
      up_by: 1,
    } as any);

    expect(res.flag).toBe(true);
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({
      type: -1,
      bgTypeId: 101,
      amount: 29500,
      scId: 1,
    });
    // loan ถูกผูกกับ ft_borrow_id
    const savedLoan = laTxRepo.save.mock.calls[0][0];
    expect(savedLoan.ftBorrowId).toBe(savedFts[0].ftId);
  });

  it('ส่งใช้เงินยืม (เงินสด 850 + ใบสำคัญ 28650) → คืนยอดเฉพาะเงินสด (type=+1, 850)', async () => {
    currentLoan = {
      laId: 1,
      laNo: 'บย.5/2556',
      moneyTypeId: 101,
      scId: 1,
      syId: 3,
      amount: 29500,
      status: 1,
    };

    const res = await service.returnLoan({
      la_id: 1,
      returned_date: '2012-12-28',
      return_cash: 850,
      return_voucher_amount: 28650,
      up_by: 1,
    });

    expect(res.flag).toBe(true);
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({
      type: 1,
      bgTypeId: 101,
      amount: 850,
    });
    // ผลสุทธิต่อประเภทเงิน = -29500 (ยืม) + 850 (คืนสด) = -28650 (= ใบสำคัญ)
  });

  it('ส่งใช้เงินยืมด้วยใบสำคัญเต็มจำนวน (เงินสด 0) → ไม่สร้าง FT คืน', async () => {
    currentLoan = {
      laId: 2,
      laNo: 'บย.6/2556',
      moneyTypeId: 106,
      scId: 1,
      syId: 3,
      amount: 4110,
      status: 1,
    };

    const res = await service.returnLoan({
      la_id: 2,
      returned_date: '2012-12-11',
      return_cash: 4110,
      return_voucher_amount: 0,
      up_by: 1,
    });

    expect(res.flag).toBe(true);
    // คืนเป็นเงินสด 4110 → สร้าง FT +1 เพราะ return_cash > 0
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({ type: 1, amount: 4110 });
  });

  it('ยืมเกินยอดคงเหลือ → บล็อก (flag:false) ไม่สร้าง FT', async () => {
    availableBalance = 5000; // คงเหลือ 5,000 แต่ขอยืม 29,500

    const res = await service.addLoanAgreement({
      sc_id: 1,
      sy_id: 3,
      budget_year: '2556',
      borrower_id: 9,
      money_type_id: 101,
      purpose: 'ยืมเกินยอด',
      amount: 29500,
      borrow_date: '2012-12-24',
      loan_category: 1,
      up_by: 1,
    } as any);

    expect(res.flag).toBe(false);
    expect(res.ms).toContain('ไม่พอ');
    expect(savedFts).toHaveLength(0);
  });

  it('ยกเลิกสัญญายืม → soft-delete FT ตอนยืม (คืนยอดประเภทเงิน)', async () => {
    currentLoan = { laId: 3, status: 1, ftBorrowId: 100 };

    const res = await service.cancelLoan(3, 'ยกเลิก', 1);

    expect(res.flag).toBe(true);
    expect(ftRepo.update).toHaveBeenCalledWith({ ftId: 100 }, { del: 1 });
  });
});
