import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnifiedRegisterService } from './unified-register.service';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { Receipt } from '../receipt/entities/receipt.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';

// QueryBuilder mock — รองรับทั้ง getRawMany และ getMany
function makeQb(opts: { rawMany?: unknown[]; many?: unknown[] } = {}) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['select', 'addSelect', 'where', 'andWhere', 'groupBy', 'orderBy', 'addOrderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getRawMany'] = jest.fn().mockResolvedValue(opts.rawMany ?? []);
  qb['getMany'] = jest.fn().mockResolvedValue(opts.many ?? []);
  return qb;
}

describe('UnifiedRegisterService', () => {
  let service: UnifiedRegisterService;
  let bitRepo: jest.Mocked<any>;
  let ftRepo: jest.Mocked<any>;
  let prRepo: jest.Mocked<any>;
  let prdRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let obRepo: jest.Mocked<any>;
  let receiptRepo: jest.Mocked<any>;
  let laRepo: jest.Mocked<any>;

  beforeEach(async () => {
    bitRepo = { find: jest.fn(), findOne: jest.fn() };
    ftRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQb()) };
    prRepo = { findOne: jest.fn() };
    prdRepo = { find: jest.fn() };
    rwRepo = { findOne: jest.fn(), find: jest.fn() };
    obRepo = { find: jest.fn().mockResolvedValue([]) };
    receiptRepo = { findOne: jest.fn() };
    laRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedRegisterService,
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bitRepo },
        { provide: getRepositoryToken(FinancialTransactions), useValue: ftRepo },
        { provide: getRepositoryToken(PlnReceive), useValue: prRepo },
        { provide: getRepositoryToken(PlnReceiveDetail), useValue: prdRepo },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(OpeningBalance), useValue: obRepo },
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(LoanAgreement), useValue: laRepo },
      ],
    }).compile();

    service = module.get(UnifiedRegisterService);
  });

  // ─── getSummary ─────────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('รวม revenue/expenses/entry_count และคำนวณ balance = carry + rev - exp', async () => {
      bitRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      obRepo.find.mockResolvedValue([{ moneyTypeId: 1, amount: 1000 }]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          rawMany: [
            { type: 1, total: '5000', cnt: '3' },
            { type: -1, total: '2000', cnt: '2' },
          ],
        }),
      );

      const result = await service.getSummary(1, 3, '2569');
      expect(result).toHaveLength(1);
      const item = result[0];
      expect(item.carry_forward).toBe(1000);
      expect(item.revenue).toBe(5000);
      expect(item.expenses).toBe(2000);
      expect(item.entry_count).toBe(5);
      expect(item.balance).toBe(1000 + 5000 - 2000);
    });

    it('ข้าม budget type ที่ไม่มีรายการและไม่มียอดยกมา', async () => {
      bitRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'ว่าง' },
      ]);
      obRepo.find.mockResolvedValue([]);
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ rawMany: [] }));

      const result = await service.getSummary(1, 3, '2569');
      expect(result).toEqual([]);
    });

    it('รวม budget type ที่ไม่มีรายการ แต่มียอดยกมา (carry !== 0)', async () => {
      bitRepo.find.mockResolvedValue([{ bgTypeId: 1, budgetType: 'มียอดยกมา' }]);
      obRepo.find.mockResolvedValue([{ moneyTypeId: 1, amount: 500 }]);
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ rawMany: [] }));

      const result = await service.getSummary(1, 3, '2569');
      expect(result).toHaveLength(1);
      expect(result[0].carry_forward).toBe(500);
      expect(result[0].balance).toBe(500);
    });

    it('total/cnt ที่เป็น null → parse เป็น 0', async () => {
      bitRepo.find.mockResolvedValue([{ bgTypeId: 1, budgetType: 'x' }]);
      obRepo.find.mockResolvedValue([{ moneyTypeId: 1, amount: 100 }]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({ rawMany: [{ type: 1, total: null, cnt: null }] }),
      );

      const result = await service.getSummary(1, 3, '2569');
      expect(result[0].revenue).toBe(0);
      expect(result[0].entry_count).toBe(0);
    });

    it('loadOpeningByType รวมยอดยกมาหลายแถวของ money_type เดียวกัน', async () => {
      bitRepo.find.mockResolvedValue([{ bgTypeId: 1, budgetType: 'x' }]);
      obRepo.find.mockResolvedValue([
        { moneyTypeId: 1, amount: 300 },
        { moneyTypeId: 1, amount: 200 },
      ]);
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ rawMany: [] }));

      const result = await service.getSummary(1, 3, '2569');
      expect(result[0].carry_forward).toBe(500);
    });
  });

  // ─── getRegisterDetail ──────────────────────────────────────────────────────
  describe('getRegisterDetail', () => {
    it('คำนวณ running balance เริ่มจากยอดยกมา + รายรับ - รายจ่าย', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'เงินอุดหนุน' });
      obRepo.find.mockResolvedValue([{ moneyTypeId: 1, amount: 1000 }]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [
            { ftId: 1, type: 1, amount: 500, prId: 0, rwId: 0, createDate: null },
            { ftId: 2, type: -1, amount: 200, prId: 0, rwId: 0, createDate: null },
          ],
        }),
      );

      const result = await service.getRegisterDetail(1, 1, 3, '2569');
      expect(result.carry_forward).toBe(1000);
      expect(result.revenue).toBe(500);
      expect(result.expenses).toBe(200);
      expect(result.balance).toBe(1300);
      expect(result.transactions[0].balance).toBe(1500); // 1000 + 500
      expect(result.transactions[1].balance).toBe(1300); // 1500 - 200
    });

    it('ค่าใช้จ่ายปกติตัดจากธนาคารเสมอ — money_channel=1 ไม่ทำให้เงินสดติดลบ (อาหารกลางวัน)', async () => {
      bitRepo.findOne.mockResolvedValue({
        bgTypeId: 8,
        budgetType: 'เงินอุดหนุน อปท. (อาหารกลางวัน)',
      });
      // ยอดยกมา: ธนาคาร 200,000 + สพป. 150,500 (ไม่มีเงินสด)
      obRepo.find.mockResolvedValue([
        { moneyTypeId: 8, storageType: 2, amount: 200000 },
        { moneyTypeId: 8, storageType: 3, amount: 150500 },
      ]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [
            {
              ftId: 1,
              type: -1,
              amount: 13975,
              prId: 0,
              rwId: 0,
              moneyChannel: 1, // ข้อมูลเดิมระบุเงินสด แต่กองนี้ไม่มีเงินสด
              registerKind: null,
              laId: 0,
              refNo: null,
              createDate: null,
            },
          ],
        }),
      );

      const result = await service.getRegisterDetail(8, 1, 2, '2569');
      expect(result.opening).toEqual({
        cash: 0,
        bank: 200000,
        smp: 150500,
        debtor: 0,
      });
      const row = result.transactions[0];
      expect(row.cash).toBe(0); // ต้องไม่ติดลบ
      expect(row.bank).toBe(186025); // 200,000 − 13,975
      expect(row.smp).toBe(150500); // คงเดิม
      expect(row.pay_voucher).toBe(13975);
    });

    it('รายรับมี prId → ดึง doc_no จากใบเสร็จ (บร.{book}/{no}) + detail', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [{ ftId: 1, type: 1, amount: 500, prId: 7, rwId: 0, createDate: null }],
        }),
      );
      prRepo.findOne.mockResolvedValue({
        prId: 7,
        prNo: 'PR-7',
        receiveMoneyType: 2,
      });
      receiptRepo.findOne.mockResolvedValue({ bookNo: '253ก', receiptNo: 22 });
      prdRepo.find.mockResolvedValue([{ prId: 7, prdDetail: 'ค่าบำรุง' }]);

      const result = await service.getRegisterDetail(1, 1, 3, '2569');
      expect(result.transactions[0].doc_no).toBe('บร.253ก/22');
      expect(result.transactions[0].detail).toBe('ค่าบำรุง');
      expect(result.transactions[0].receive_money_type).toBe(2);
    });

    it('รายรับมี prId แต่ไม่มีใบเสร็จ → fallback ใช้ prNo', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [{ ftId: 1, type: 1, amount: 500, prId: 7, rwId: 0, createDate: null }],
        }),
      );
      prRepo.findOne.mockResolvedValue({ prId: 7, prNo: 'PR-7', receiveMoneyType: 1 });
      receiptRepo.findOne.mockResolvedValue(null);
      prdRepo.find.mockResolvedValue([]);

      const result = await service.getRegisterDetail(1, 1, 3, '2569');
      expect(result.transactions[0].doc_no).toBe('PR-7');
      expect(result.transactions[0].detail).toBeNull();
    });

    it('รายจ่ายมี rwId → ใช้ noDoc (fallback checkNoDoc) + detail', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [{ ftId: 1, type: -1, amount: 300, prId: 0, rwId: 9, createDate: null }],
        }),
      );
      rwRepo.findOne.mockResolvedValue({
        rwId: 9,
        noDoc: 'D-9',
        checkNoDoc: 'CHK-9',
        detail: 'ค่าน้ำ',
      });

      const result = await service.getRegisterDetail(1, 1, 3, '2569');
      expect(result.transactions[0].doc_no).toBe('D-9');
      expect(result.transactions[0].detail).toBe('ค่าน้ำ');
    });

    it('budget type ไม่พบ → budget_type = empty string', async () => {
      bitRepo.findOne.mockResolvedValue(null);
      obRepo.find.mockResolvedValue([]);
      ftRepo.createQueryBuilder.mockReturnValue(makeQb({ many: [] }));

      const result = await service.getRegisterDetail(99, 1, 3, '2569');
      expect(result.budget_type).toBe('');
      expect(result.transactions).toEqual([]);
    });

    it('ส่ง fromDate/toDate → เพิ่ม andWhere ช่วงวันที่', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      const qb = makeQb({ many: [] });
      ftRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRegisterDetail(1, 1, 3, '2569', '2026-05-01', '2026-05-31');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'ft.create_date >= :fromDate',
        expect.objectContaining({ fromDate: expect.any(Date) }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'ft.create_date <= :toDate',
        expect.objectContaining({ toDate: expect.any(Date) }),
      );
    });
  });

  // ─── getSchoolRevenueReport (form-030) ──────────────────────────────────────
  describe('getSchoolRevenueReport', () => {
    it('จัดหมวดรายรับ (heuristic) + รายจ่าย (expense_type) และคำนวณ carry_forward', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'เงินรายได้' });
      obRepo.find.mockResolvedValue([{ moneyTypeId: 1, amount: 1000 }]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          many: [
            { ftId: 1, type: 1, amount: 2000, prId: 11, rwId: 0 },
            { ftId: 2, type: -1, amount: 800, prId: 0, rwId: 21 },
          ],
        }),
      );
      prdRepo.find.mockResolvedValue([
        { prId: 11, prdDetail: 'เงินบริจาคจากผู้ปกครอง' },
      ]);
      rwRepo.find.mockResolvedValue([{ rwId: 21, expenseType: 4 }]); // operate_material

      const result = await service.getSchoolRevenueReport(1, 3, '2569', 1);
      expect(result.opening).toBe(1000);
      expect(result.total_receive).toBe(2000);
      expect(result.total_pay).toBe(800);
      expect(result.income.donation_clear).toBe(2000);
      expect(result.expense.operate_material).toBe(800);
      expect(result.carry_forward).toBe(1000 + 2000 - 800);
    });

    it('รายรับที่ไม่เข้าหมวดใด → other', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      obRepo.find.mockResolvedValue([]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({ many: [{ ftId: 1, type: 1, amount: 500, prId: 5, rwId: 0 }] }),
      );
      prdRepo.find.mockResolvedValue([{ prId: 5, prdDetail: 'รายการทั่วไป' }]);
      rwRepo.find.mockResolvedValue([]);

      const result = await service.getSchoolRevenueReport(1, 3, '2569', 1);
      expect(result.income.other).toBe(500);
    });

    it('รายจ่าย expense_type null → other', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      obRepo.find.mockResolvedValue([]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({ many: [{ ftId: 1, type: -1, amount: 700, prId: 0, rwId: 8 }] }),
      );
      prdRepo.find.mockResolvedValue([]);
      rwRepo.find.mockResolvedValue([{ rwId: 8, expenseType: null }]);

      const result = await service.getSchoolRevenueReport(1, 3, '2569', 1);
      expect(result.expense.other).toBe(700);
    });

    it('จัดหมวดค่าเช่าราชพัสดุ → raachapasadu', async () => {
      bitRepo.findOne.mockResolvedValue({ bgTypeId: 1, budgetType: 'x' });
      obRepo.find.mockResolvedValue([]);
      ftRepo.createQueryBuilder.mockReturnValue(
        makeQb({ many: [{ ftId: 1, type: 1, amount: 1200, prId: 3, rwId: 0 }] }),
      );
      prdRepo.find.mockResolvedValue([{ prId: 3, prdDetail: 'ค่าเช่าที่ราชพัสดุ' }]);
      rwRepo.find.mockResolvedValue([]);

      const result = await service.getSchoolRevenueReport(1, 3, '2569', 1);
      expect(result.income.raachapasadu).toBe(1200);
    });
  });
});
