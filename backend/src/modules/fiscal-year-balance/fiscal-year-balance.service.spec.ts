import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FiscalYearBalanceService } from './fiscal-year-balance.service';
import { FiscalYearBalance } from './entities/fiscal-year-balance.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { FundBorrowing } from '../fund-borrowing/entities/fund-borrowing.entity';

// updateQb chain mock สำหรับ openingRepo.createQueryBuilder().update()...execute()
function makeUpdateQb() {
  const qb: Record<string, jest.Mock> = {};
  ['update', 'set', 'where', 'andWhere'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb['execute'] = jest.fn().mockResolvedValue(undefined);
  return qb;
}

describe('FiscalYearBalanceService', () => {
  let service: FiscalYearBalanceService;
  let fybRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let openingRepo: jest.Mocked<any>;
  let schoolYearRepo: jest.Mocked<any>;
  let loanRepo: jest.Mocked<any>;
  let fundBorrowRepo: jest.Mocked<any>;

  beforeEach(async () => {
    fybRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    adminRepo = { findOne: jest.fn().mockResolvedValue(null) };
    budgetTypeRepo = { findOne: jest.fn().mockResolvedValue(null) };
    openingRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      createQueryBuilder: jest.fn().mockReturnValue(makeUpdateQb()),
    };
    schoolYearRepo = { findOne: jest.fn().mockResolvedValue(null) };
    loanRepo = { count: jest.fn().mockResolvedValue(0) };
    fundBorrowRepo = { count: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalYearBalanceService,
        { provide: getRepositoryToken(FiscalYearBalance), useValue: fybRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        { provide: getRepositoryToken(OpeningBalance), useValue: openingRepo },
        { provide: getRepositoryToken(SchoolYear), useValue: schoolYearRepo },
        { provide: getRepositoryToken(LoanAgreement), useValue: loanRepo },
        {
          provide: getRepositoryToken(FundBorrowing),
          useValue: fundBorrowRepo,
        },
      ],
    }).compile();

    service = module.get(FiscalYearBalanceService);
  });

  // ─── loadBalances ─────────────────────────────────────────────────────────
  describe('loadBalances', () => {
    it('filter scId, budgetYear, del=0 + order ASC', async () => {
      fybRepo.find.mockResolvedValue([]);
      await service.loadBalances(5, '2568');
      expect(fybRepo.find).toHaveBeenCalledWith({
        where: { scId: 5, budgetYear: '2568', del: 0 },
        order: { moneyTypeId: 'ASC' },
      });
    });

    it('map fields + is_final=true เมื่อ isFinal=1', async () => {
      fybRepo.find.mockResolvedValue([
        {
          fybId: 1,
          scId: 5,
          budgetYear: '2568',
          moneyTypeId: 2,
          moneyTypeName: 'อุดหนุน',
          cashBalance: 100,
          bankBalance: 200,
          smpBalance: 0,
          totalBalance: 300,
          closingDate: '2025-09-30',
          closedBy: 9,
          closedByName: 'ผอ.',
          isFinal: 1,
          note: null,
        },
      ]);
      const res = await service.loadBalances(5, '2568');
      expect(res.count).toBe(1);
      expect(res.data[0].fyb_id).toBe(1);
      expect(res.data[0].is_final).toBe(true);
      expect(res.data[0].total_balance).toBe(300);
    });

    it('is_year_final=true เมื่อทุกรายการ isFinal=1', async () => {
      fybRepo.find.mockResolvedValue([
        { fybId: 1, isFinal: 1 },
        { fybId: 2, isFinal: 1 },
      ]);
      const res = await service.loadBalances(5, '2568');
      expect(res.is_year_final).toBe(true);
    });

    it('is_year_final=false เมื่อมีรายการที่ยังไม่ final', async () => {
      fybRepo.find.mockResolvedValue([
        { fybId: 1, isFinal: 1 },
        { fybId: 2, isFinal: 0 },
      ]);
      const res = await service.loadBalances(5, '2568');
      expect(res.is_year_final).toBe(false);
    });

    it('ไม่มีข้อมูล → is_year_final=false, count=0', async () => {
      fybRepo.find.mockResolvedValue([]);
      const res = await service.loadBalances(5, '2568');
      expect(res.is_year_final).toBe(false);
      expect(res.count).toBe(0);
    });
  });

  // ─── saveBalance ───────────────────────────────────────────────────────────
  describe('saveBalance', () => {
    const dto = {
      sc_id: 1,
      budget_year: '2568',
      money_type_id: 2,
      cash_balance: 100,
      bank_balance: 200,
      smp_balance: 50,
      closing_date: '2025-09-30',
      closed_by: 9,
      note: 'ปิดปี',
      up_by: 9,
    };

    it('ไม่มี row เดิม → create ใหม่ + คำนวณ total_balance', async () => {
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      adminRepo.findOne.mockResolvedValue({ name: 'ผอ.' });
      fybRepo.findOne.mockResolvedValue(null);

      const res = await service.saveBalance(dto);
      expect(fybRepo.create).toHaveBeenCalled();
      const saved = fybRepo.save.mock.calls[0][0];
      expect(saved.totalBalance).toBe(350); // 100+200+50
      expect(saved.moneyTypeName).toBe('อุดหนุน');
      expect(saved.closedByName).toBe('ผอ.');
      expect(res).toEqual({ flag: true, ms: 'บันทึกยอดยกมาเรียบร้อยแล้ว' });
    });

    it('มี row เดิม → update ค่าเดิม', async () => {
      const existing = { fybId: 7 } as any;
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      fybRepo.findOne.mockResolvedValue(existing);

      await service.saveBalance(dto);
      expect(fybRepo.create).not.toHaveBeenCalled();
      expect(existing.cashBalance).toBe(100);
      expect(existing.totalBalance).toBe(350);
    });

    it('ค่า balance null → default 0', async () => {
      fybRepo.findOne.mockResolvedValue(null);
      await service.saveBalance({
        sc_id: 1,
        budget_year: '2568',
        money_type_id: 2,
      } as any);
      const saved = fybRepo.save.mock.calls[0][0];
      expect(saved.cashBalance).toBe(0);
      expect(saved.totalBalance).toBe(0);
    });

    it('admin ใช้ username ถ้าไม่มี name', async () => {
      fybRepo.findOne.mockResolvedValue(null);
      adminRepo.findOne.mockResolvedValue({ name: null, username: 'u01' });
      await service.saveBalance(dto);
      const saved = fybRepo.save.mock.calls[0][0];
      expect(saved.closedByName).toBe('u01');
    });

    it('ไม่ส่ง closed_by → ไม่ query admin, closedByName=null', async () => {
      fybRepo.findOne.mockResolvedValue(null);
      await service.saveBalance({ ...dto, closed_by: undefined });
      expect(adminRepo.findOne).not.toHaveBeenCalled();
      const saved = fybRepo.save.mock.calls[0][0];
      expect(saved.closedByName).toBeNull();
    });

    it('row เดิมถูกปิดปีแล้ว (is_final=1) → flag:false ห้ามแก้', async () => {
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      fybRepo.findOne.mockResolvedValue({ fybId: 7, isFinal: 1 } as any);

      const res = await service.saveBalance(dto);
      expect(res.flag).toBe(false);
      expect(res.ms).toContain('ล็อก');
      expect(fybRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── saveBulkBalances ──────────────────────────────────────────────────────
  describe('saveBulkBalances', () => {
    it('บันทึกทุกประเภทใน balances แล้วคืนจำนวน', async () => {
      fybRepo.findOne.mockResolvedValue(null);
      const res = await service.saveBulkBalances({
        sc_id: 1,
        budget_year: '2568',
        closing_date: '2025-09-30',
        closed_by: 9,
        balances: [
          {
            money_type_id: 1,
            cash_balance: 10,
            bank_balance: 0,
            smp_balance: 0,
          },
          {
            money_type_id: 2,
            cash_balance: 20,
            bank_balance: 0,
            smp_balance: 0,
          },
        ],
      } as any);
      expect(fybRepo.save).toHaveBeenCalledTimes(2);
      expect(res.flag).toBe(true);
      expect(res.ms).toContain('2 ประเภท');
    });
  });

  // ─── finalizeYear ──────────────────────────────────────────────────────────
  describe('finalizeYear', () => {
    const dto = {
      sc_id: 1,
      budget_year: '2568',
      signed_by: 9,
      note: 'ลงนาม',
    };

    it('ไม่มีข้อมูลยอดยกมา → flag:false', async () => {
      fybRepo.find.mockResolvedValue([]);
      const res: any = await service.finalizeYear(dto);
      expect(res).toEqual({
        flag: false,
        ms: 'ไม่พบข้อมูลยอดยกมา กรุณาบันทึกก่อน',
      });
    });

    it('ปีงบถูกปิดแล้วทุกรายการ (is_final=1) → flag:false ห้ามปิดซ้ำ', async () => {
      fybRepo.find.mockResolvedValue([
        { fybId: 1, isFinal: 1 },
        { fybId: 2, isFinal: 1 },
      ] as any);
      const res: any = await service.finalizeYear(dto);
      expect(res.flag).toBe(false);
      expect(res.ms).toContain('ปิดซ้ำ');
      expect(fybRepo.save).not.toHaveBeenCalled();
    });

    it('ยังมีลูกหนี้เงินยืมค้างคืน → block', async () => {
      fybRepo.find.mockResolvedValue([{ fybId: 1 }]);
      loanRepo.count.mockResolvedValue(2);
      fundBorrowRepo.count.mockResolvedValue(0);
      const res: any = await service.finalizeYear(dto);
      expect(res.flag).toBe(false);
      expect(res.ms).toContain('ลูกหนี้เงินยืม 2 รายการ');
    });

    it('ยังมียืมเงินข้ามประเภทค้างคืน → block', async () => {
      fybRepo.find.mockResolvedValue([{ fybId: 1 }]);
      loanRepo.count.mockResolvedValue(0);
      fundBorrowRepo.count.mockResolvedValue(1);
      const res: any = await service.finalizeYear(dto);
      expect(res.flag).toBe(false);
      expect(res.ms).toContain('ยืมเงินข้ามประเภท 1 รายการ');
    });

    it('ค้างทั้งสองประเภท → ขึ้นข้อความรวมทั้งคู่', async () => {
      fybRepo.find.mockResolvedValue([{ fybId: 1 }]);
      loanRepo.count.mockResolvedValue(1);
      fundBorrowRepo.count.mockResolvedValue(2);
      const res: any = await service.finalizeYear(dto);
      expect(res.ms).toContain('ลูกหนี้เงินยืม 1 รายการ');
      expect(res.ms).toContain('ยืมเงินข้ามประเภท 2 รายการ');
    });

    it('happy path (ไม่มีค้าง) → set isFinal=1 ทุกรายการ + flag:true', async () => {
      const balances: any[] = [
        { fybId: 1, cashBalance: 0, bankBalance: 0, smpBalance: 0, upBy: 9 },
      ];
      fybRepo.find.mockResolvedValue(balances);
      loanRepo.count.mockResolvedValue(0);
      fundBorrowRepo.count.mockResolvedValue(0);
      adminRepo.findOne.mockResolvedValue({ name: 'ผอ.' });
      schoolYearRepo.findOne.mockResolvedValue(null); // ปีถัดไปไม่มี → carry skip

      const res: any = await service.finalizeYear(dto);
      expect(res.flag).toBe(true);
      expect(balances[0].isFinal).toBe(1);
      expect(balances[0].closedBy).toBe(9);
      expect(fybRepo.save).toHaveBeenCalledWith(balances);
    });

    it('ปีถัดไปไม่มีในระบบ → carry skipped, flag ยัง true', async () => {
      fybRepo.find.mockResolvedValue([
        { fybId: 1, cashBalance: 100, bankBalance: 0, smpBalance: 0, upBy: 9 },
      ]);
      schoolYearRepo.findOne.mockResolvedValue(null);
      const res: any = await service.finalizeYear(dto);
      expect(res.carry_forward.skipped).toContain('2569');
      expect(res.carry_forward.created).toBe(0);
      expect(res.flag).toBe(true);
    });

    it('ปีถัดไปมี → carry forward สร้าง opening_balance ตาม storage type (>0 เท่านั้น)', async () => {
      fybRepo.find
        .mockResolvedValueOnce([
          // รอบแรก: หา balances เพื่อ finalize
          {
            fybId: 1,
            moneyTypeId: 2,
            moneyTypeName: 'อุดหนุน',
            cashBalance: 100,
            bankBalance: 200,
            smpBalance: 0, // 0 → ไม่สร้าง
            upBy: 9,
          },
        ])
        .mockResolvedValueOnce([
          // รอบสอง: carryForwardToNextYear โหลด balances อีกครั้ง
          {
            fybId: 1,
            moneyTypeId: 2,
            moneyTypeName: 'อุดหนุน',
            cashBalance: 100,
            bankBalance: 200,
            smpBalance: 0,
            upBy: 9,
          },
        ]);
      schoolYearRepo.findOne.mockResolvedValue({
        syId: 10,
        budgetDateS: '2025-10-01',
      });

      const res: any = await service.finalizeYear(dto);
      // cash (100>0) + bank (200>0) = 2 รายการ, smp=0 ข้าม
      expect(openingRepo.save).toHaveBeenCalledTimes(2);
      expect(res.carry_forward.created).toBe(2);
      expect(res.carry_forward.nextYear).toBe('2569');
      // storage type 1 (cash) และ 2 (bank)
      const storageTypes = openingRepo.create.mock.calls.map(
        (c: any) => c[0].storageType,
      );
      expect(storageTypes).toEqual([1, 2]);
    });
  });
});
