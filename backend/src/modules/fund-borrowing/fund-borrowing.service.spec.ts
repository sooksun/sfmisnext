import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FundBorrowingService } from './fund-borrowing.service';
import { FundBorrowing } from './entities/fund-borrowing.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

// ─── createQueryBuilder mock ที่จบด้วย getRawOne ─────────────────────────────
function makeSumQb(sum: number) {
  const qb: Record<string, jest.Mock> = {};
  ['select', 'where', 'andWhere'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb['getRawOne'] = jest.fn().mockResolvedValue({ sum: String(sum) });
  return qb;
}

describe('FundBorrowingService', () => {
  let service: FundBorrowingService;
  let fbRepo: jest.Mocked<any>;
  let ftRepo: jest.Mocked<any>;
  let obRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  // repo ภายใน transaction (em.getRepository)
  let txFtRepo: jest.Mocked<any>;
  let txFbRepo: jest.Mocked<any>;

  beforeEach(async () => {
    fbRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    ftRepo = { createQueryBuilder: jest.fn() };
    obRepo = { createQueryBuilder: jest.fn() };
    budgetTypeRepo = { findOne: jest.fn().mockResolvedValue(null) };

    // tx repos
    let ftIdCounter = 100;
    txFtRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ ftId: ++ftIdCounter, ...x })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    txFbRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ fbId: 77, ...x })),
    };

    const em = {
      getRepository: jest.fn((entity) =>
        entity === FinancialTransactions ? txFtRepo : txFbRepo,
      ),
    };
    dataSource = {
      transaction: jest.fn((cb: any) => cb(em)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundBorrowingService,
        { provide: getRepositoryToken(FundBorrowing), useValue: fbRepo },
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
        { provide: getRepositoryToken(OpeningBalance), useValue: obRepo },
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(FundBorrowingService);
  });

  // helper: ตั้ง computeAvailable = opening + income - expense
  function stubAvailable(opening: number, income: number, expense: number) {
    obRepo.createQueryBuilder.mockReturnValue(makeSumQb(opening));
    ftRepo.createQueryBuilder
      .mockReturnValueOnce(makeSumQb(income)) // income (type=1)
      .mockReturnValueOnce(makeSumQb(expense)); // expense (type=-1)
  }

  // ─── loadBorrowings ─────────────────────────────────────────────────────────
  describe('loadBorrowings', () => {
    it('filter scId, syId, del=0 และ order desc', async () => {
      fbRepo.find.mockResolvedValue([]);
      await service.loadBorrowings(5, 3, '2569');
      expect(fbRepo.find).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, del: 0 },
        order: { fbId: 'DESC' },
      });
    });

    it('map fields + is_outstanding=true เมื่อ status=1', async () => {
      fbRepo.find.mockResolvedValue([
        {
          fbId: 1,
          fromMoneyTypeId: 2,
          fromMoneyTypeName: 'อุดหนุน',
          toMoneyTypeId: 3,
          toMoneyTypeName: 'เรียนฟรี',
          amount: 5000,
          borrowDate: '2026-04-01',
          repayDate: null,
          purpose: 'จ่ายแทน',
          status: 1,
          note: null,
          createDate: null,
        },
      ]);
      const res = await service.loadBorrowings(5, 3, '2569');
      expect(res.count).toBe(1);
      expect(res.data[0].fb_id).toBe(1);
      expect(res.data[0].is_outstanding).toBe(true);
      expect(res.data[0].from_money_type_name).toBe('อุดหนุน');
    });

    it('total_outstanding รวมเฉพาะ status=1', async () => {
      fbRepo.find.mockResolvedValue([
        { fbId: 1, amount: 5000, status: 1 },
        { fbId: 2, amount: 3000, status: 2 }, // คืนแล้ว ไม่นับ
        { fbId: 3, amount: '2000', status: 1 }, // string → number
      ]);
      const res = await service.loadBorrowings(5, 3, '2569');
      expect(res.total_outstanding).toBe(7000);
    });

    it('ไม่มีข้อมูล → count=0, total_outstanding=0', async () => {
      fbRepo.find.mockResolvedValue([]);
      const res = await service.loadBorrowings(5, 3, '2569');
      expect(res.count).toBe(0);
      expect(res.total_outstanding).toBe(0);
    });
  });

  // ─── addBorrowing ────────────────────────────────────────────────────────────
  describe('addBorrowing', () => {
    const baseDto = {
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      from_money_type_id: 2,
      to_money_type_id: 3,
      amount: 1000,
      borrow_date: '2026-05-01',
      up_by: 9,
    };

    it('amount <= 0 → BadRequestException', async () => {
      await expect(
        service.addBorrowing({ ...baseDto, amount: 0 }),
      ).rejects.toThrow('จำนวนเงินยืมต้องมากกว่า 0');
    });

    it('ต้นทาง = ปลายทาง → BadRequestException', async () => {
      await expect(
        service.addBorrowing({
          ...baseDto,
          from_money_type_id: 2,
          to_money_type_id: 2,
        }),
      ).rejects.toThrow('ต้องต่างกัน');
    });

    it('ประเภทเงินต้นทางเป็นเงินผ่าน/ฝาก (ภาษี) → block', async () => {
      budgetTypeRepo.findOne
        .mockResolvedValueOnce({ budgetType: 'ภาษีหัก ณ ที่จ่าย' }) // from
        .mockResolvedValueOnce({ budgetType: 'เรียนฟรี' }); // to
      await expect(service.addBorrowing(baseDto)).rejects.toThrow(
        /ไม่อนุญาตให้ยืมจาก/,
      );
    });

    it('ยอดคงเหลือต้นทางไม่พอ → block', async () => {
      budgetTypeRepo.findOne
        .mockResolvedValueOnce({ budgetType: 'เงินอุดหนุน' })
        .mockResolvedValueOnce({ budgetType: 'เรียนฟรี' });
      stubAvailable(500, 0, 0); // คงเหลือ 500 < 1000
      await expect(service.addBorrowing(baseDto)).rejects.toThrow(
        /ไม่พอให้ยืม/,
      );
    });

    it('happy path → สร้าง FT คู่ + fund_borrowing status=1 คืน flag:true', async () => {
      budgetTypeRepo.findOne
        .mockResolvedValueOnce({ budgetType: 'เงินอุดหนุน' })
        .mockResolvedValueOnce({ budgetType: 'เรียนฟรี' });
      stubAvailable(2000, 0, 0); // คงเหลือ 2000 >= 1000

      const res = await service.addBorrowing(baseDto);
      expect(res.flag).toBe(true);
      expect(res.fb_id).toBe(77);
      // FT 2 รายการ (out type=-1, in type=1)
      expect(txFtRepo.save).toHaveBeenCalledTimes(2);
      const ftOut = txFtRepo.create.mock.calls[0][0];
      const ftIn = txFtRepo.create.mock.calls[1][0];
      expect(ftOut.type).toBe(-1);
      expect(ftOut.bgTypeId).toBe(2);
      expect(ftIn.type).toBe(1);
      expect(ftIn.bgTypeId).toBe(3);
      // fund_borrowing
      const fb = txFbRepo.create.mock.calls[0][0];
      expect(fb.status).toBe(1);
      expect(fb.amount).toBe(1000);
      expect(fb.ftOutId).toBeDefined();
      expect(fb.ftInId).toBeDefined();
    });

    it('ยอดพอดี (amount = available) → ผ่าน', async () => {
      budgetTypeRepo.findOne
        .mockResolvedValueOnce({ budgetType: 'เงินอุดหนุน' })
        .mockResolvedValueOnce({ budgetType: 'เรียนฟรี' });
      stubAvailable(1000, 0, 0); // เท่ากันพอดี
      const res = await service.addBorrowing(baseDto);
      expect(res.flag).toBe(true);
    });

    it('computeAvailable = opening + income - expense', async () => {
      budgetTypeRepo.findOne
        .mockResolvedValueOnce({ budgetType: 'เงินอุดหนุน' })
        .mockResolvedValueOnce({ budgetType: 'เรียนฟรี' });
      // opening 500 + income 1000 - expense 200 = 1300 >= 1000 → ผ่าน
      stubAvailable(500, 1000, 200);
      const res = await service.addBorrowing(baseDto);
      expect(res.flag).toBe(true);
    });
  });

  // ─── repayBorrowing ──────────────────────────────────────────────────────────
  describe('repayBorrowing', () => {
    const dto = { fb_id: 1, repay_date: '2026-06-01', up_by: 9 };

    it('ไม่พบรายการ → flag:false', async () => {
      fbRepo.findOne.mockResolvedValue(null);
      const res = await service.repayBorrowing(dto);
      expect(res).toEqual({ flag: false, ms: 'ไม่พบรายการยืมเงิน' });
    });

    it('status != 1 (คืน/ยกเลิกแล้ว) → flag:false', async () => {
      fbRepo.findOne.mockResolvedValue({ fbId: 1, status: 2, del: 0 });
      const res = await service.repayBorrowing(dto);
      expect(res).toEqual({ flag: false, ms: 'รายการนี้คืน/ยกเลิกแล้ว' });
    });

    it('happy path → สร้าง FT คู่ย้อนกลับ + set status=2', async () => {
      const fb = {
        fbId: 1,
        status: 1,
        del: 0,
        amount: 1000,
        fromMoneyTypeId: 2,
        toMoneyTypeId: 3,
        scId: 1,
        syId: 3,
      } as any;
      fbRepo.findOne.mockResolvedValue(fb);

      const res = await service.repayBorrowing(dto);
      expect(res.flag).toBe(true);
      expect(txFtRepo.save).toHaveBeenCalledTimes(2);
      // คืนเข้าต้นทาง type=+1, ตัดปลายทาง type=-1
      const ftBack = txFtRepo.create.mock.calls[0][0];
      const ftCut = txFtRepo.create.mock.calls[1][0];
      expect(ftBack.type).toBe(1);
      expect(ftBack.bgTypeId).toBe(2);
      expect(ftCut.type).toBe(-1);
      expect(ftCut.bgTypeId).toBe(3);
      expect(fb.status).toBe(2);
      expect(fb.repayDate).toBe('2026-06-01');
    });

    it('filter del=0 ที่ findOne', async () => {
      fbRepo.findOne.mockResolvedValue(null);
      await service.repayBorrowing(dto);
      expect(fbRepo.findOne).toHaveBeenCalledWith({
        where: { fbId: 1, del: 0 },
      });
    });
  });

  // ─── cancelBorrowing ─────────────────────────────────────────────────────────
  describe('cancelBorrowing', () => {
    it('ไม่พบรายการ → flag:false', async () => {
      fbRepo.findOne.mockResolvedValue(null);
      const res = await service.cancelBorrowing(1, 9);
      expect(res).toEqual({ flag: false, ms: 'ไม่พบรายการยืมเงิน' });
    });

    it('status=2 (คืนแล้ว) → ยกเลิกไม่ได้', async () => {
      fbRepo.findOne.mockResolvedValue({ fbId: 1, status: 2, del: 0 });
      const res = await service.cancelBorrowing(1, 9);
      expect(res).toEqual({ flag: false, ms: 'รายการที่คืนแล้วยกเลิกไม่ได้' });
    });

    it('happy path → ลบ FT คู่ (del=1) + set status=3', async () => {
      const fb = {
        fbId: 1,
        status: 1,
        del: 0,
        ftOutId: 101,
        ftInId: 102,
      } as any;
      fbRepo.findOne.mockResolvedValue(fb);

      const res = await service.cancelBorrowing(1, 9);
      expect(res.flag).toBe(true);
      expect(txFtRepo.update).toHaveBeenCalledWith({ ftId: 101 }, { del: 1 });
      expect(txFtRepo.update).toHaveBeenCalledWith({ ftId: 102 }, { del: 1 });
      expect(fb.status).toBe(3);
      expect(fb.upBy).toBe(9);
    });

    it('ไม่มี ftOutId/ftInId → ไม่เรียก update FT แต่ยัง set status=3', async () => {
      const fb = {
        fbId: 1,
        status: 1,
        del: 0,
        ftOutId: null,
        ftInId: null,
      } as any;
      fbRepo.findOne.mockResolvedValue(fb);
      const res = await service.cancelBorrowing(1, 9);
      expect(txFtRepo.update).not.toHaveBeenCalled();
      expect(fb.status).toBe(3);
      expect(res.flag).toBe(true);
    });
  });

  // ─── countOutstanding ────────────────────────────────────────────────────────
  describe('countOutstanding', () => {
    it('นับเฉพาะ status=1 del=0 ตาม scId/syId', async () => {
      fbRepo.count.mockResolvedValue(4);
      const n = await service.countOutstanding(5, 3);
      expect(n).toBe(4);
      expect(fbRepo.count).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, status: 1, del: 0 },
      });
    });
  });
});
