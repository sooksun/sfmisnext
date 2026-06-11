import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoanAgreementService } from './loan-agreement.service';
import { LoanAgreement } from './entities/loan-agreement.entity';
import { LoanReturnEvidence } from './entities/loan-return-evidence.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

/**
 * ทดสอบ workflow สัญญายืมเงิน (ตัวอย่างที่ 34) + การผูกกับทะเบียนคุมเงิน
 *   - สร้างสัญญา → สถานะ "รอตรวจสอบ" ยังไม่ตัดยอด (ไม่มี FT)
 *   - ตรวจสอบ → อนุมัติ → รับเงิน(disburse) จึงตัดยอด (FT type=-1) + คำนวณกำหนดส่งใช้
 *   - ส่งใช้ (คืนเงินสด) → คืนยอด (type=+1) เฉพาะเงินสด ; ใบสำคัญถือเป็นค่าใช้จ่ายแล้ว
 *   - ยกเลิก → soft-delete FT ตอนรับเงิน (คืนยอด)
 */
describe('LoanAgreementService — workflow + ledger (financial_transactions)', () => {
  let service: LoanAgreementService;

  // mocks ที่ test เข้าถึงได้ผ่าน em.getRepository
  let ftRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let laTxRepo: { create: jest.Mock; save: jest.Mock };
  let lreTxRepo: { create: jest.Mock; save: jest.Mock };
  let ckTxRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  // service-level laRepo (นอก transaction)
  let laRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

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
      save: jest
        .fn()
        .mockImplementation((e) => Promise.resolve({ laId: 1, ...e })),
    };
    lreTxRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    // บันทึกเก็บรักษาเงินสด (auto ตอนคืนเงินสด) — getCount=0 (ยังไม่มี → สร้างได้)
    const ckQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    ckTxRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(ckQb),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const em = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === FinancialTransactions) return ftRepo;
        if (entity === LoanAgreement) return laTxRepo;
        if (entity === LoanReturnEvidence) return lreTxRepo;
        if (entity === CashKeepingRecord) return ckTxRepo;
        return {};
      }),
    };

    const dataSource: Partial<DataSource> = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(em)),
    };

    // service-level repos (นอก transaction)
    laRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(currentLoan)),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((e) => e),
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
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
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
            available: jest
              .fn()
              .mockImplementation(() => Promise.resolve(availableBalance)),
            availableInTx: jest
              .fn()
              .mockImplementation(() => Promise.resolve(availableBalance)),
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

  it('สร้างสัญญา → สถานะ "รอตรวจสอบ" (10) ยังไม่ตัดยอด (ไม่มี FT)', async () => {
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
    // ยังไม่ตัดยอด — ไม่มี FT ตอนสร้างสัญญา
    expect(savedFts).toHaveLength(0);
    const savedLoan = laRepo.save.mock.calls[0][0];
    expect(savedLoan.status).toBe(10);
    expect(savedLoan.ftBorrowId == null).toBe(true);
  });

  it('ตรวจสอบ → อนุมัติ → เปลี่ยนสถานะตามลำดับ (10→11→12)', async () => {
    currentLoan = { laId: 1, laNo: 'บย.5/2556', amount: 29500, status: 10 };
    const v = await service.verifyLoan({
      la_id: 1,
      verify_by: 7,
      verify_name: 'การเงิน',
      verify_date: '2012-12-25',
    });
    expect(v.flag).toBe(true);
    expect(currentLoan.status).toBe(11);

    const a = await service.approveLoan({
      la_id: 1,
      approve_by: 2,
      approve_name: 'ผอ.',
      approve_date: '2012-12-26',
    });
    expect(a.flag).toBe(true);
    expect(currentLoan.status).toBe(12);
    expect(currentLoan.approveAmount).toBe(29500);
  });

  it('รับเงิน (disburse) → สร้าง FT ตัดยอด (type=-1) + คำนวณกำหนดส่งใช้จากวันรับเงิน', async () => {
    currentLoan = {
      laId: 1,
      laNo: 'บย.5/2556',
      scId: 1,
      syId: 3,
      moneyTypeId: 101,
      amount: 29500,
      loanCategory: 1, // 15 วัน
      dueDays: 0,
      status: 12,
    };

    const res = await service.disburseLoan({
      la_id: 1,
      receipt_date: '2012-12-24',
      up_by: 1,
    });

    expect(res.flag).toBe(true);
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({
      type: -1,
      bgTypeId: 101,
      amount: 29500,
      scId: 1,
    });
    // loan ถูกผูกกับ ft_borrow_id + คำนวณ due_date (24 + 15 วัน = 2013-01-08) + สถานะ 1
    const savedLoan = laTxRepo.save.mock.calls[0][0];
    expect(savedLoan.ftBorrowId).toBe(savedFts[0].ftId);
    expect(savedLoan.status).toBe(1);
    expect(savedLoan.dueDate).toBe('2013-01-08');
    expect(savedLoan.receiptDate).toBe('2012-12-24');
  });

  it('รับเงินไม่ได้ถ้ายังไม่อนุมัติ (สถานะไม่ใช่ 12)', async () => {
    currentLoan = { laId: 1, status: 10 };
    const res = await service.disburseLoan({
      la_id: 1,
      receipt_date: '2012-12-24',
    });
    expect(res.flag).toBe(false);
    expect(savedFts).toHaveLength(0);
  });

  it('ส่งใช้เงินยืม (เงินสด 850 + ใบสำคัญ 28650) → contra: clear_voucher(type0) + return_cash(type1 เงินสด)', async () => {
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
    // 1) ส่งใช้ใบสำคัญ → clear_voucher (type=0, ล้างลูกหนี้ ไม่กระทบยอดเงิน)
    // 2) คืนเงินสด → return_cash (type=+1, เงินสดในมือ channel=1)
    expect(savedFts).toHaveLength(2);
    const clear = savedFts.find((f: any) => f.registerKind === 'clear_voucher');
    const cash = savedFts.find((f: any) => f.registerKind === 'return_cash');
    expect(clear).toMatchObject({
      type: 0,
      bgTypeId: 101,
      amount: 28650,
      laId: 1,
    });
    expect(cash).toMatchObject({
      type: 1,
      bgTypeId: 101,
      amount: 850,
      moneyChannel: 1,
      laId: 1,
    });
    // ผลสุทธิต่อประเภทเงิน = -29500 (ยืม) + 850 (คืนสด) = -28650 (= ใบสำคัญ)
    // อัตโนมัติ: มีเงินสดคืน → สร้างบันทึกการเก็บรักษาเงินสด 1 ฉบับ
    expect(ckTxRepo.save).toHaveBeenCalledTimes(1);
    expect(ckTxRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 850, status: 1 }),
    );
  });

  it('ส่งใช้เงินยืมด้วยใบสำคัญเต็มจำนวน (เงินสด 0) → สร้างเฉพาะ clear_voucher (ไม่มี FT คืนเงินสด)', async () => {
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
      return_cash: 0,
      return_voucher_amount: 4110,
      up_by: 1,
    });

    expect(res.flag).toBe(true);
    // ใบสำคัญทั้งหมด → clear_voucher 1 รายการ (type=0) ; ไม่มี return_cash
    expect(savedFts).toHaveLength(1);
    expect(savedFts[0]).toMatchObject({
      type: 0,
      registerKind: 'clear_voucher',
      amount: 4110,
    });
    // ไม่มีเงินสดคืน → ไม่สร้างบันทึกการเก็บรักษาเงินสด
    expect(ckTxRepo.save).not.toHaveBeenCalled();
  });

  it('ยืมเกินยอดคงเหลือ → บล็อกตั้งแต่สร้างสัญญา (flag:false) ไม่สร้าง FT', async () => {
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

  it('ยกเลิกสัญญายืม → soft-delete FT ตอนรับเงิน (คืนยอดประเภทเงิน)', async () => {
    currentLoan = { laId: 3, status: 1, ftBorrowId: 100 };

    const res = await service.cancelLoan(3, 'ยกเลิก', 1);

    expect(res.flag).toBe(true);
    expect(ftRepo.update).toHaveBeenCalledWith({ ftId: 100 }, { del: 1 });
  });
});
