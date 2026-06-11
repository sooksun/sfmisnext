import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RegisterMoneyTypeService } from './register-money-type.service';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { CashKeepingService } from '../cash-keeping/cash-keeping.service';

// queryBuilder mock factory — กำหนด terminal (getOne/getMany) ได้
function makeQb(terminal: { getOne?: unknown; getMany?: unknown } = {}) {
  const qb: Record<string, jest.Mock> = {};
  ['where', 'andWhere', 'orderBy', 'addOrderBy', 'select'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb['getOne'] = jest.fn().mockResolvedValue(terminal.getOne ?? null);
  qb['getMany'] = jest.fn().mockResolvedValue(terminal.getMany ?? []);
  return qb;
}

describe('RegisterMoneyTypeService', () => {
  let service: RegisterMoneyTypeService;
  let budgetTypeRepo: jest.Mocked<any>;
  let ftRepo: jest.Mocked<any>;
  let plnReceiveRepo: jest.Mocked<any>;
  let plnReceiveDetailRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let openingRepo: jest.Mocked<any>;

  beforeEach(async () => {
    budgetTypeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    };
    ftRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQb()) };
    plnReceiveRepo = { findOne: jest.fn().mockResolvedValue(null) };
    plnReceiveDetailRepo = { find: jest.fn().mockResolvedValue([]) };
    rwRepo = { findOne: jest.fn().mockResolvedValue(null) };
    openingRepo = { find: jest.fn().mockResolvedValue([]) };
    const dataSource = { transaction: jest.fn() };
    const fundBalance = { availableCashInTx: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterMoneyTypeService,
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        {
          provide: getRepositoryToken(FinancialTransactions),
          useValue: ftRepo,
        },
        { provide: getRepositoryToken(PlnReceive), useValue: plnReceiveRepo },
        {
          provide: getRepositoryToken(PlnReceiveDetail),
          useValue: plnReceiveDetailRepo,
        },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(OpeningBalance), useValue: openingRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: FundBalanceService, useValue: fundBalance },
        {
          provide: CashKeepingService,
          useValue: { markDepositedFifo: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RegisterMoneyTypeService);
  });

  // ─── loadBudgetType ───────────────────────────────────────────────────────
  describe('loadBudgetType', () => {
    it('filter del=0 + order ASC', async () => {
      budgetTypeRepo.find.mockResolvedValue([]);
      await service.loadBudgetType();
      expect(budgetTypeRepo.find).toHaveBeenCalledWith({
        where: { del: 0 },
        order: { bgTypeId: 'ASC' },
      });
    });

    it('map fields + bg_type_name alias', async () => {
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 2, budgetType: 'อุดหนุน', budgetBorrowType: 1 },
      ]);
      const rows = await service.loadBudgetType();
      expect(rows[0]).toEqual({
        bg_type_id: 2,
        budget_type: 'อุดหนุน',
        bg_type_name: 'อุดหนุน',
        budget_borrow_type: 1,
      });
    });
  });

  // ─── whtRemitReminder ─────────────────────────────────────────────────────
  describe('whtRemitReminder', () => {
    it('ไม่พบประเภทเงินภาษีหัก ณ ที่จ่าย → คืน data ว่าง + ms', async () => {
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: null }),
      );
      const res = await service.whtRemitReminder(1, 3, '2569');
      expect(res).toEqual({
        data: [],
        count: 0,
        ms: 'ไม่พบประเภทเงินภาษีหัก ณ ที่จ่าย',
      });
    });

    it('outstanding<=0 (นำส่งครบ) → status=remitted', async () => {
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: { bgTypeId: 9 } }),
      );
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            { type: 1, amount: 1000, createDate: '2026-04-15' },
            { type: -1, amount: 1000, createDate: '2026-04-20' },
          ],
        }),
      );
      const res = await service.whtRemitReminder(1, 3, '2569');
      expect(res.data[0].status).toBe('remitted');
      expect(res.data[0].outstanding).toBe(0);
    });

    it('เลยกำหนดนำส่ง (เดือนในอดีต) ยังค้าง → status=overdue', async () => {
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: { bgTypeId: 9 } }),
      );
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [{ type: 1, amount: 500, createDate: '2020-01-15' }],
        }),
      );
      const res = await service.whtRemitReminder(1, 3, '2569');
      expect(res.data[0].status).toBe('overdue');
      expect(res.overdue).toBe(1);
      expect(res.need_action).toBe(1);
    });

    it('group ตามเดือน + คำนวณ collected/remitted ถูกต้อง', async () => {
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: { bgTypeId: 9 } }),
      );
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            { type: 1, amount: 300, createDate: '2020-03-01' },
            { type: 1, amount: 200, createDate: '2020-03-15' },
            { type: -1, amount: 100, createDate: '2020-03-20' },
          ],
        }),
      );
      const res = await service.whtRemitReminder(1, 3, '2569');
      expect(res.count).toBe(1);
      expect(res.data[0].collected).toBe(500);
      expect(res.data[0].remitted).toBe(100);
      expect(res.data[0].outstanding).toBe(400);
    });

    it('ข้าม transaction ที่ไม่มี createDate', async () => {
      budgetTypeRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: { bgTypeId: 9 } }),
      );
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [{ type: 1, amount: 500, createDate: null }],
        }),
      );
      const res = await service.whtRemitReminder(1, 3, '2569');
      expect(res.count).toBe(0);
    });
  });

  // ─── loadRegisterControlMoneyType ─────────────────────────────────────────
  describe('loadRegisterControlMoneyType', () => {
    it('ไม่มี transaction → คืน carry_forward จากยอดยกมา + transaction ว่าง', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: [] }));
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      openingRepo.find.mockResolvedValue([
        { storageType: 1, amount: 1000 }, // cash
        { storageType: 2, amount: 2000 }, // bank
      ]);
      const res = await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      expect(res.carry_forward).toBe(3000);
      expect(res.data[0].transaction).toEqual([]);
      expect(res.data[0].budget_type).toBe('อุดหนุน');
    });

    it('running balance เริ่มจากยอดยกมา + รับ - จ่าย', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            {
              ftId: 1,
              type: 1,
              amount: 500,
              prId: 0,
              rwId: 0,
              createDate: null,
            },
            {
              ftId: 2,
              type: -1,
              amount: 200,
              rwId: 0,
              prId: 0,
              createDate: null,
            },
          ],
        }),
      );
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      openingRepo.find.mockResolvedValue([{ storageType: 1, amount: 1000 }]);

      const res = await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      const txns = res.data[0].transaction;
      expect(txns[0].balance).toBe(1500); // 1000 + 500
      expect(txns[1].balance).toBe(1300); // 1500 - 200
      expect(res.carry_forward).toBe(1000);
      expect(res.revenue).toBe(500);
      expect(res.expenses).toBe(200);
      expect(res.total).toBe(300);
    });

    it('รับเข้าจากการหักภาษี (prId=0, rwId>0) → ใช้ noDoc ของ rw', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            {
              ftId: 5,
              type: 1,
              amount: 100,
              prId: 0,
              rwId: 9,
              createDate: null,
            },
          ],
        }),
      );
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'ภาษีหัก' });
      rwRepo.findOne.mockResolvedValue({ noDoc: 'D-9', detail: 'ค่าจ้าง' });

      const res = await service.loadRegisterControlMoneyType(9, 1, 3, '2569');
      const recv = res.data[0].transaction[0].receive as any;
      expect(recv.pr_no).toBe('D-9');
      expect(recv.prd_detail).toContain('หักภาษี ณ ที่จ่าย');
    });

    it('รายจ่าย (type=-1, rwId>0) → โหลด request_withdraw เป็น pay detail', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            {
              ftId: 7,
              type: -1,
              amount: 800,
              rwId: 3,
              prId: 0,
              createDate: null,
            },
          ],
        }),
      );
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      rwRepo.findOne.mockResolvedValue({
        noDoc: 'RW-3',
        dateRequest: '2026-05-01',
        detail: 'ค่าวัสดุ',
        checkNoDoc: 'CHK-1',
      });

      const res = await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      const pay = res.data[0].transaction[0].pay as any;
      expect(pay.no_doc).toBe('RW-3');
      expect(pay.check_no_doc).toBe('CHK-1');
    });

    it('รับเงินสด (receive_money_type=2) → เพิ่ม cash, ธนาคารไม่เปลี่ยน', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getMany: [
            {
              ftId: 1,
              type: 1,
              amount: 500,
              prId: 4,
              rwId: 0,
              createDate: null,
            },
          ],
        }),
      );
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      plnReceiveRepo.findOne.mockResolvedValue({
        prNo: 'PR-1',
        receiveDate: '2026-05-01',
        receiveMoneyType: 2, // เงินสด
      });
      openingRepo.find.mockResolvedValue([]);

      const res = await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      const txn = res.data[0].transaction[0];
      expect(txn.cash).toBe(500);
      expect(txn.receive_bank).toBe(0);
      expect(txn.receive_money_type).toBe(2);
    });

    it('openingBank รวม storage 2 และ 3', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: [] }));
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      openingRepo.find.mockResolvedValue([
        { storageType: 2, amount: 1000 },
        { storageType: 3, amount: 500 }, // ฝาก สพป.
      ]);
      const res = await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      expect(res.carry_forward).toBe(1500);
    });

    it('filter opening ด้วย syId เมื่อมี syId', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: [] }));
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      await service.loadRegisterControlMoneyType(2, 1, 3, '2569');
      expect(openingRepo.find).toHaveBeenCalledWith({
        where: { scId: 1, syId: 3, moneyTypeId: 2, del: 0 },
      });
    });

    it('syId=0 → filter opening โดยไม่ใส่ syId', async () => {
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: [] }));
      budgetTypeRepo.findOne.mockResolvedValue({ budgetType: 'อุดหนุน' });
      await service.loadRegisterControlMoneyType(2, 1, 0, '2569');
      expect(openingRepo.find).toHaveBeenCalledWith({
        where: { scId: 1, moneyTypeId: 2, del: 0 },
      });
    });
  });
});
