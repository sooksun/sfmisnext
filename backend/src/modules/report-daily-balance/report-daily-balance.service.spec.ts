import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportDailyBalanceService } from './report-daily-balance.service';
import { FinancialTransactions } from './entities/financial-transactions.entity';
import { CashReserveLimit } from './entities/cash-reserve-limit.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(opts: { many?: unknown[]; one?: unknown } = {}) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  [
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'groupBy',
  ].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['getMany'] = jest.fn().mockResolvedValue(opts.many ?? []);
  qb['getRawOne'] = jest.fn().mockResolvedValue(opts.one ?? null);
  return qb;
}

describe('ReportDailyBalanceService', () => {
  let service: ReportDailyBalanceService;
  let ftRepo: jest.Mocked<any>;
  let cashLimitRepo: jest.Mocked<any>;
  let prRepo: jest.Mocked<any>;
  let prdRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let btRepo: jest.Mocked<any>;
  let openingRepo: jest.Mocked<any>;
  let smpRepo: jest.Mocked<any>;

  beforeEach(async () => {
    ftRepo = { createQueryBuilder: jest.fn() };
    cashLimitRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    prRepo = { find: jest.fn().mockResolvedValue([]) };
    prdRepo = { find: jest.fn().mockResolvedValue([]) };
    rwRepo = { find: jest.fn().mockResolvedValue([]) };
    btRepo = { find: jest.fn().mockResolvedValue([]) };
    openingRepo = { createQueryBuilder: jest.fn(), find: jest.fn() };
    smpRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDailyBalanceService,
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
        {
          provide: getRepositoryToken(CashReserveLimit),
          useValue: cashLimitRepo,
        },
        { provide: getRepositoryToken(PlnReceive), useValue: prRepo },
        { provide: getRepositoryToken(PlnReceiveDetail), useValue: prdRepo },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: btRepo },
        { provide: getRepositoryToken(OpeningBalance), useValue: openingRepo },
        { provide: getRepositoryToken(SmpDepositEntry), useValue: smpRepo },
      ],
    }).compile();

    service = module.get(ReportDailyBalanceService);
  });

  // ─── loadDailyBalance ─────────────────────────────────────────────────────────
  describe('loadDailyBalance', () => {
    // helper: queue FT createQueryBuilder calls ตามลำดับที่ service เรียก
    //   1) transactions ของวันนี้  2) previousTransactions (ยอดยกมา)
    function setupFt(todayTxns: unknown[], prevTxns: unknown[]) {
      ftRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ many: todayTxns })) // วันนี้
        .mockReturnValueOnce(makeQb({ many: prevTxns })); // ยอดยกมา
    }

    function setupOpening(rows: unknown[]) {
      openingRepo.createQueryBuilder.mockReturnValue(makeQb({ many: rows }));
    }
    function setupSmp(rows: unknown[]) {
      smpRepo.createQueryBuilder.mockReturnValue(makeQb({ many: rows }));
    }

    it('คำนวณ carryForward จาก previousTransactions (รับ - จ่าย)', async () => {
      setupFt(
        [],
        [
          { bgTypeId: 1, type: 1, amount: 1000, moneyChannel: 1 },
          { bgTypeId: 1, type: -1, amount: 300, moneyChannel: 1 },
        ],
      );
      setupOpening([]);
      setupSmp([]);
      btRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'อุดหนุน', del: 0 },
      ]);

      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      const row = result.find((r) => r.bg_type_id === 1)!;
      expect(row.carry_forward).toBe(700);
      expect(row.income).toBe(0);
      expect(row.expense).toBe(0);
      expect(row.balance).toBe(700);
    });

    it('income/expense ของวันนี้ และ balance = ยกมา + รับ - จ่าย', async () => {
      setupFt(
        [
          {
            ftId: 1,
            bgTypeId: 1,
            type: 1,
            amount: 500,
            prId: 0,
            prdId: 0,
            rwId: 0,
            moneyChannel: 1,
            createDate: new Date(),
          },
          {
            ftId: 2,
            bgTypeId: 1,
            type: -1,
            amount: 200,
            prId: 0,
            prdId: 0,
            rwId: 0,
            moneyChannel: 1,
            createDate: new Date(),
          },
        ],
        [{ bgTypeId: 1, type: 1, amount: 1000, moneyChannel: 1 }],
      );
      setupOpening([]);
      setupSmp([]);
      btRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'อุดหนุน', del: 0 },
      ]);

      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      const row = result.find((r) => r.bg_type_id === 1)!;
      expect(row.carry_forward).toBe(1000);
      expect(row.income).toBe(500);
      expect(row.expense).toBe(200);
      expect(row.balance).toBe(1300); // 1000 + 500 - 200
    });

    it('รวม opening_balance เข้า carryForward', async () => {
      setupFt([], []);
      setupOpening([{ moneyTypeId: 1, amount: '2500', storageType: 1 }]);
      setupSmp([]);
      btRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'อุดหนุน', del: 0 },
      ]);

      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      const row = result.find((r) => r.bg_type_id === 1)!;
      expect(row.carry_forward).toBe(2500);
      expect(row.balance).toBe(2500);
    });

    it('แยกยอดตาม storage/channel: เงินสด / ธนาคาร / สพป.', async () => {
      setupFt(
        [
          {
            ftId: 1,
            bgTypeId: 1,
            type: 1,
            amount: 100,
            prId: 0,
            prdId: 0,
            rwId: 0,
            moneyChannel: 2,
            createDate: new Date(),
          },
        ],
        [],
      );
      setupOpening([
        { moneyTypeId: 1, amount: '1000', storageType: 1 }, // เงินสด
        { moneyTypeId: 1, amount: '5000', storageType: 2 }, // ธนาคาร
        { moneyTypeId: 1, amount: '300', storageType: 3 }, // สพป.
      ]);
      setupSmp([{ moneyTypeId: 1, amount: '200', entryType: 1 }]); // ฝาก สพป. +200

      btRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'อุดหนุน', del: 0 },
      ]);

      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      const row = result.find((r) => r.bg_type_id === 1)!;
      expect(row.cash_balance).toBe(1000); // opening cash 1000 (FT channel 2 ไปธนาคาร)
      expect(row.bank_balance).toBe(5100); // opening bank 5000 + FT 100
      expect(row.smp_balance).toBe(500); // opening 300 + ฝาก 200
      expect(row.total_balance).toBe(6600);
    });

    it('ใส่ชื่อประเภทงบจาก budgetIncomeType; ถ้าไม่พบใช้ "ประเภท {id}"', async () => {
      setupFt([], [{ bgTypeId: 9, type: 1, amount: 100, moneyChannel: 1 }]);
      setupOpening([]);
      setupSmp([]);
      btRepo.find.mockResolvedValue([]); // ไม่พบชื่อ

      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      const row = result.find((r) => r.bg_type_id === 9)!;
      expect(row.budget_type).toBe('ประเภท 9');
    });

    it('คืน array ว่างเมื่อไม่มีรายการใด ๆ', async () => {
      setupFt([], []);
      setupOpening([]);
      setupSmp([]);
      const result = await service.loadDailyBalance(1, '2026-05-15', 3);
      expect(result).toEqual([]);
    });
  });

  // ─── loadCashLimitCheck ───────────────────────────────────────────────────────
  describe('loadCashLimitCheck', () => {
    function setupCheck(opts: {
      limit?: number | null;
      cash?: { total_income: string; total_expense: string } | null;
      bank?: { total_income: string; total_expense: string } | null;
      opening?: unknown[];
    }) {
      cashLimitRepo.findOne.mockResolvedValue(
        opts.limit == null ? null : { limitAmount: opts.limit, note: 'n' },
      );
      // ft createQueryBuilder ถูกเรียก 2 ครั้ง: cashResult แล้ว bankResult
      ftRepo.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({
            one: opts.cash ?? { total_income: '0', total_expense: '0' },
          }),
        )
        .mockReturnValueOnce(
          makeQb({
            one: opts.bank ?? { total_income: '0', total_expense: '0' },
          }),
        );
      openingRepo.find.mockResolvedValue(opts.opening ?? []);
    }

    it('ใช้ DEFAULT_CASH_LIMIT (15000) ถ้ายังไม่ได้ตั้ง limit', async () => {
      setupCheck({ limit: null });
      const result = await service.loadCashLimitCheck(1);
      expect(result.limit_amount).toBe(15000);
    });

    it('คำนวณ cash_balance = opening(cash) + income - expense', async () => {
      setupCheck({
        limit: 20000,
        cash: { total_income: '8000', total_expense: '3000' },
        opening: [{ storageType: 1, amount: '1000' }],
      });
      const result = await service.loadCashLimitCheck(1);
      expect(result.cash_balance).toBe(6000); // 1000 + 8000 - 3000
      expect(result.current_balance).toBe(6000);
    });

    it('cash เกินวงเงิน → exceeded=true และคำนวณ excess_amount', async () => {
      setupCheck({
        limit: 5000,
        cash: { total_income: '9000', total_expense: '0' },
        opening: [],
      });
      const result = await service.loadCashLimitCheck(1);
      expect(result.exceeded).toBe(true);
      expect(result.excess_amount).toBe(4000); // 9000 - 5000
    });

    it('cash ไม่เกินวงเงิน → exceeded=false, excess_amount=0', async () => {
      setupCheck({
        limit: 15000,
        cash: { total_income: '5000', total_expense: '0' },
        opening: [],
      });
      const result = await service.loadCashLimitCheck(1);
      expect(result.exceeded).toBe(false);
      expect(result.excess_amount).toBe(0);
    });

    it('ระบุ syId → กรองยอดยกมา + รายการ เฉพาะปีงบนั้น (กันยอดข้ามปี)', async () => {
      setupCheck({
        limit: 30000,
        cash: { total_income: '5000', total_expense: '1000' },
        opening: [{ storageType: 1, amount: '2000' }],
      });
      const result = await service.loadCashLimitCheck(1, 2);
      // opening_balance ต้องถูกกรองด้วย syId
      expect(openingRepo.find).toHaveBeenCalledWith({
        where: { scId: 1, syId: 2, del: 0 },
      });
      expect(result.sy_id).toBe(2);
      expect(result.cash_balance).toBe(6000); // 2000 + 5000 - 1000 (เฉพาะปี 2)
    });

    it('ไม่ระบุ syId → legacy รวมทุกปี (sy_id=0)', async () => {
      setupCheck({ limit: 15000, opening: [] });
      const result = await service.loadCashLimitCheck(1);
      expect(openingRepo.find).toHaveBeenCalledWith({
        where: { scId: 1, del: 0 },
      });
      expect(result.sy_id).toBe(0);
    });

    it('bank_balance แยกจาก cash; total = cash + bank', async () => {
      setupCheck({
        limit: 50000,
        cash: { total_income: '1000', total_expense: '0' },
        bank: { total_income: '7000', total_expense: '2000' },
        opening: [
          { storageType: 1, amount: '500' },
          { storageType: 2, amount: '3000' },
        ],
      });
      const result = await service.loadCashLimitCheck(1);
      expect(result.cash_balance).toBe(1500); // 500 + 1000
      expect(result.bank_balance).toBe(8000); // 3000 + 7000 - 2000
      expect(result.total_balance).toBe(9500);
    });
  });

  // ─── setCashLimit ─────────────────────────────────────────────────────────────
  describe('setCashLimit', () => {
    it('record มีอยู่ → update limitAmount/note/upBy', async () => {
      const record = { scId: 1, limitAmount: 0, note: null, upBy: 0 } as any;
      cashLimitRepo.findOne.mockResolvedValue(record);
      cashLimitRepo.save.mockResolvedValue(record);
      const result = await service.setCashLimit({
        sc_id: 1,
        limit_amount: 20000,
        note: 'ใหม่',
        up_by: 7,
      });
      expect(record.limitAmount).toBe(20000);
      expect(record.note).toBe('ใหม่');
      expect(record.upBy).toBe(7);
      expect(result).toEqual({
        flag: true,
        ms: 'บันทึกวงเงินสำรองจ่ายเรียบร้อยแล้ว',
      });
    });

    it('ยังไม่มี record → create ใหม่', async () => {
      cashLimitRepo.findOne.mockResolvedValue(null);
      const created = { scId: 1 } as any;
      cashLimitRepo.create.mockReturnValue(created);
      cashLimitRepo.save.mockResolvedValue(created);
      const result = await service.setCashLimit({
        sc_id: 1,
        limit_amount: 10000,
      });
      expect(cashLimitRepo.create).toHaveBeenCalledWith({ scId: 1 });
      expect(created.limitAmount).toBe(10000);
      expect(result.flag).toBe(true);
    });
  });
});
