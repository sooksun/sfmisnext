import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TravelReimbursementService } from './travel-reimbursement.service';
import { TravelReimbursement } from './entities/travel-reimbursement.entity';
import { TravelReimbursementTraveler } from './entities/travel-reimbursement-traveler.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { LoanReturnEvidence } from '../loan-agreement/entities/loan-return-evidence.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

/**
 * ทดสอบ workflow ใบเบิกค่าเดินทาง (แบบ 8708) + การลงบัญชี
 *   - จ่ายตรง (ไม่เชื่อมเงินยืม) → FT -1 (บค.) + cash guard
 *   - เชื่อมเงินยืม จ่ายจริง < ยืม → ส่งใช้ + คืนเงินสด (FT +1) ปิดเงินยืม
 *   - เชื่อมเงินยืม จ่ายจริง > ยืม → ปิดเงินยืม + เบิกเพิ่ม (FT -1)
 *   - จ่ายเงินสดเกินเงินสดคงเหลือ → block
 */
describe('TravelReimbursementService', () => {
  let service: TravelReimbursementService;

  let savedFts: any[];
  let currentTr: any;
  let currentLoan: any;
  let cashAvailable: number;
  let totalAvailable: number;

  let trTxRepo: { create: jest.Mock; save: jest.Mock };
  let trtTxRepo: { create: jest.Mock; save: jest.Mock };
  let laTxRepo: { findOne: jest.Mock; save: jest.Mock };
  let lreTxRepo: { create: jest.Mock; save: jest.Mock };
  let ftRepo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    savedFts = [];
    currentTr = null;
    currentLoan = null;
    cashAvailable = Number.MAX_SAFE_INTEGER;
    totalAvailable = Number.MAX_SAFE_INTEGER;

    ftRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => {
        const row = { ftId: savedFts.length + 100, ...e };
        savedFts.push(row);
        return Promise.resolve(row);
      }),
    };
    trTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ trId: 1, ...e })),
    };
    trtTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    laTxRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(currentLoan)),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    lreTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const em = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === FinancialTransactions) return ftRepo;
        if (entity === TravelReimbursement) return trTxRepo;
        if (entity === TravelReimbursementTraveler) return trtTxRepo;
        if (entity === LoanAgreement) return laTxRepo;
        if (entity === LoanReturnEvidence) return lreTxRepo;
        return {};
      }),
    };
    const dataSource: Partial<DataSource> = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(em)),
    };

    const trRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockImplementation(() => Promise.resolve(currentTr)),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((e) => e),
    };
    const trtRepo = { find: jest.fn().mockResolvedValue([]) };
    const adminRepo = {
      findOne: jest.fn().mockResolvedValue({ adminId: 9, name: 'ครูสมชาย', position: 3 }),
    };
    const budgetTypeRepo = {
      findOne: jest.fn().mockResolvedValue({ bgTypeId: 5, budgetType: 'เงินรายได้สถานศึกษา' }),
    };
    const laRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelReimbursementService,
        { provide: getRepositoryToken(TravelReimbursement), useValue: trRepo },
        { provide: getRepositoryToken(TravelReimbursementTraveler), useValue: trtRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: budgetTypeRepo },
        { provide: getRepositoryToken(LoanAgreement), useValue: laRepo },
        { provide: getRepositoryToken(FinancialTransactions), useValue: ftRepo },
        { provide: DocCounterService, useValue: { issueWithin: jest.fn().mockResolvedValue({ seq: 7, formatted: 'บค.7/2569' }) } },
        { provide: DataSource, useValue: dataSource },
        {
          provide: FundBalanceService,
          useValue: {
            available: jest.fn().mockImplementation(() => Promise.resolve(totalAvailable)),
            availableInTx: jest.fn().mockImplementation(() => Promise.resolve(totalAvailable)),
            availableCash: jest.fn().mockImplementation(() => Promise.resolve(cashAvailable)),
            availableCashInTx: jest.fn().mockImplementation(() => Promise.resolve(cashAvailable)),
          },
        },
        { provide: RegulatoryConfigService, useValue: { getThreshold: jest.fn().mockResolvedValue(1) } },
      ],
    }).compile();

    service = module.get<TravelReimbursementService>(TravelReimbursementService);
  });

  it('ยื่นขอเบิก → รวมยอดจาก travelers + สถานะ 10 (รอตรวจสอบ)', async () => {
    const res = await service.addTravelReimbursement({
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      requester_id: 9,
      money_type_id: 5,
      travelers: [
        { name: 'ครูสมชาย', allowance: 720, lodging: 1200, transport: 500, other: 0 },
      ],
      up_by: 9,
    } as any);
    expect(res.flag).toBe(true);
    const savedTr = trTxRepo.save.mock.calls[0][0];
    expect(savedTr.grandTotal).toBe(2420);
    expect(savedTr.status).toBe(10);
  });

  it('จ่ายตรง (ไม่เชื่อมเงินยืม) → FT -1 เงินสด(บค.) ตามยอดรวม', async () => {
    currentTr = {
      trId: 1, scId: 1, syId: 3, budgetYear: '2569',
      moneyTypeId: 5, laId: null, grandTotal: 2420, status: 12,
    };
    const res = await service.disburse({ tr_id: 1, receipt_date: '2026-06-05', type_offer_check: 1, up_by: 9 });
    expect(res.flag).toBe(true);
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({ type: -1, bgTypeId: 5, amount: 2420, moneyChannel: 1 });
    const savedTr = trTxRepo.save.mock.calls[0][0];
    expect(savedTr.status).toBe(2);
    expect(savedTr.bcNo).toBe('บค.7/2569');
  });

  it('จ่ายเงินสดเกินยอดเงินสดคงเหลือ → block (ไม่สร้าง FT)', async () => {
    cashAvailable = 1000; // เงินสด 1,000 แต่จ่าย 2,420
    currentTr = {
      trId: 1, scId: 1, syId: 3, budgetYear: '2569',
      moneyTypeId: 5, laId: null, grandTotal: 2420, status: 12,
    };
    const res = await service.disburse({ tr_id: 1, receipt_date: '2026-06-05', type_offer_check: 1, up_by: 9 });
    expect(res.flag).toBe(false);
    expect(res.ms).toContain('เงินสด');
    expect(savedFts).toHaveLength(0);
  });

  it('เชื่อมเงินยืม จ่ายจริง < ยืม → ส่งใช้ + คืนเงินสด (FT +1) ปิดเงินยืม', async () => {
    currentLoan = { laId: 50, laNo: 'บย.1/2569', scId: 1, syId: 3, moneyTypeId: 5, amount: 3000, status: 1 };
    currentTr = {
      trId: 1, scId: 1, syId: 3, budgetYear: '2569',
      moneyTypeId: 5, laId: 50, grandTotal: 2420, status: 12,
    };
    const res = await service.disburse({ tr_id: 1, receipt_date: '2026-06-05', type_offer_check: 1, up_by: 9 });
    expect(res.flag).toBe(true);
    // ไม่จ่ายเงินใหม่ (เงินออกตอนยืมแล้ว) → มีแต่ FT คืนเงินสด 580
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({ type: 1, amount: 580 });
    expect(currentLoan.status).toBe(2);
    expect(currentLoan.returnVoucherAmount).toBe(2420);
    expect(currentLoan.returnCash).toBe(580);
  });

  it('เชื่อมเงินยืม จ่ายจริง > ยืม → ปิดเงินยืม + เบิกเพิ่มส่วนต่าง (FT -1)', async () => {
    currentLoan = { laId: 50, laNo: 'บย.1/2569', scId: 1, syId: 3, moneyTypeId: 5, amount: 2000, status: 1 };
    currentTr = {
      trId: 1, scId: 1, syId: 3, budgetYear: '2569',
      moneyTypeId: 5, laId: 50, grandTotal: 2420, status: 12,
    };
    const res = await service.disburse({ tr_id: 1, receipt_date: '2026-06-05', type_offer_check: 1, up_by: 9 });
    expect(res.flag).toBe(true);
    // เบิกเพิ่ม 420 (FT -1) ; ปิดเงินยืมด้วย voucher=2000
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({ type: -1, amount: 420 });
    expect(currentLoan.status).toBe(2);
    expect(currentLoan.returnVoucherAmount).toBe(2000);
  });
});
