import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReceiveService } from './receive.service';
import { PlnReceive } from './entities/pln-receive.entity';
import { PlnReceiveDetail } from './entities/pln-receive-detail.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';
import { Receipt } from '../receipt/entities/receipt.entity';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';
import { AddReceiveDto } from './dto/add-receive.dto';

// chainable update QB ที่ลงท้ายด้วย execute()
function makeUpdateQb() {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['update', 'set', 'where'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['execute'] = jest.fn().mockResolvedValue({});
  return qb;
}

describe('ReceiveService', () => {
  let service: ReceiveService;
  let plnReceiveRepo: jest.Mocked<any>;
  let plnReceiveDetailRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let budgetIncomeTypeRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;
  let financialAuditService: jest.Mocked<
    Pick<FinancialAuditService, 'isDateLocked'>
  >;
  // EntityManager mock ที่ใช้ภายใน transaction
  let em: jest.Mocked<any>;

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((_e: unknown, v: unknown) => ({
        ...(v as object),
      })),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(makeUpdateQb()),
      getRepository: jest.fn(),
    };

    plnReceiveRepo = { find: jest.fn(), findOne: jest.fn() };
    plnReceiveDetailRepo = { find: jest.fn() };
    adminRepo = { find: jest.fn(), findOne: jest.fn() };
    budgetIncomeTypeRepo = { find: jest.fn(), findOne: jest.fn() };
    dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)),
      query: jest.fn(),
    };
    financialAuditService = { isDateLocked: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveService,
        { provide: getRepositoryToken(PlnReceive), useValue: plnReceiveRepo },
        {
          provide: getRepositoryToken(PlnReceiveDetail),
          useValue: plnReceiveDetailRepo,
        },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetIncomeTypeRepo,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: FinancialAuditService, useValue: financialAuditService },
      ],
    }).compile();

    service = module.get(ReceiveService);
  });

  // ─── loadReceive ──────────────────────────────────────────────────────────────
  describe('loadReceive', () => {
    it('filter scId/syId/budgetYear/del=0', async () => {
      plnReceiveRepo.find.mockResolvedValue([]);
      await service.loadReceive(5, 3, '2569');
      expect(plnReceiveRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
        }),
      );
    });

    it('คืน [] เมื่อไม่มีข้อมูล', async () => {
      plnReceiveRepo.find.mockResolvedValue([]);
      const result = await service.loadReceive(1, 3, '2569');
      expect(result).toEqual([]);
    });

    it('คำนวณ amount/total_budget จาก detail และ map field', async () => {
      plnReceiveRepo.find.mockResolvedValue([
        { prId: 10, prNo: '5', scId: 1, syId: 3, receiveMoneyType: 2 },
      ]);
      plnReceiveDetailRepo.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 2, prdBudget: 1000 },
        { prdId: 2, prId: 10, bgTypeId: 2, prdBudget: 500 },
      ]);
      budgetIncomeTypeRepo.findOne.mockResolvedValue({
        bgTypeId: 2,
        budgetType: 'เงินสด',
      });

      const [row] = await service.loadReceive(1, 3, '2569');
      expect(row.amount).toBe(1500);
      expect(row.total_budget).toBe(1500);
      expect(row.budget_type_name).toBe('เงินสด');
      expect(row.pln_receive_detail.data).toHaveLength(2);
    });

    it('ไม่มี receiveMoneyType → budget_type_name เป็น ""', async () => {
      plnReceiveRepo.find.mockResolvedValue([
        { prId: 10, scId: 1, receiveMoneyType: 0 },
      ]);
      plnReceiveDetailRepo.find.mockResolvedValue([]);
      const [row] = await service.loadReceive(1, 3, '2569');
      expect(row.budget_type_name).toBe('');
      expect(budgetIncomeTypeRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── loadAutoAddReceive ─────────────────────────────────────────────────────────
  describe('loadAutoAddReceive', () => {
    it('ไม่มีรายการเดิม → pr_no = 1', async () => {
      plnReceiveRepo.findOne.mockResolvedValue(null);
      const result = await service.loadAutoAddReceive(1, 3);
      expect(result).toEqual({ pr_no: 1 });
    });

    it('มีรายการเดิม → pr_no = last + 1', async () => {
      plnReceiveRepo.findOne.mockResolvedValue({ prId: 9, prNo: '42' });
      const result = await service.loadAutoAddReceive(1, 3);
      expect(result).toEqual({ pr_no: 43 });
    });

    it('prNo parse ไม่ได้ → pr_no = 1', async () => {
      plnReceiveRepo.findOne.mockResolvedValue({ prId: 9, prNo: 'abc' });
      const result = await service.loadAutoAddReceive(1, 3);
      expect(result).toEqual({ pr_no: 1 });
    });

    it('filter scId/syId/del=0', async () => {
      plnReceiveRepo.findOne.mockResolvedValue(null);
      await service.loadAutoAddReceive(7, 5);
      expect(plnReceiveRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 7, syId: 5, del: 0 } }),
      );
    });
  });

  // ─── loadDirector ───────────────────────────────────────────────────────────────
  describe('loadDirector', () => {
    it('filter scId/type=8/del=0 และ map field', async () => {
      adminRepo.find.mockResolvedValue([
        {
          adminId: 1,
          name: 'หัวหน้าการเงิน',
          username: 'fin',
          email: 'a@b.com',
          type: 8,
          scId: 1,
        },
      ]);
      const result = await service.loadDirector(1);
      expect(adminRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 1, type: 8, del: 0 },
        }),
      );
      expect(result[0]).toEqual({
        admin_id: 1,
        name: 'หัวหน้าการเงิน',
        username: 'fin',
        email: 'a@b.com',
        type: 8,
        sc_id: 1,
      });
    });
  });

  // ─── loadBudgetIncomeType ─────────────────────────────────────────────────────────
  describe('loadBudgetIncomeType', () => {
    it('filter del=0 และ map field', async () => {
      budgetIncomeTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน', del: 0 },
      ]);
      const result = await service.loadBudgetIncomeType();
      expect(budgetIncomeTypeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { del: 0 } }),
      );
      expect(result[0]).toEqual({
        bg_type_id: 1,
        budget_type_id: 1,
        budget_type: 'เงินอุดหนุน',
        budget_type_name: 'เงินอุดหนุน',
        del: 0,
      });
    });
  });

  // ─── loadReceiveById ──────────────────────────────────────────────────────────────
  describe('loadReceiveById', () => {
    it('ไม่พบ receive → null', async () => {
      plnReceiveRepo.findOne.mockResolvedValue(null);
      const result = await service.loadReceiveById(99, 1);
      expect(result).toBeNull();
    });

    it('cross-tenant — filter prId/scId/del=0', async () => {
      plnReceiveRepo.findOne.mockResolvedValue(null);
      await service.loadReceiveById(5, 77);
      expect(plnReceiveRepo.findOne).toHaveBeenCalledWith({
        where: { prId: 5, scId: 77, del: 0 },
      });
    });

    it('happy path — รวม detail + total + bg_type_name + book_no', async () => {
      plnReceiveRepo.findOne.mockResolvedValue({
        prId: 10,
        prNo: '5',
        scId: 1,
        syId: 3,
        budgetYear: '2569',
        receiveForm: 'f',
        receiveMoneyType: 2,
        receiveDate: null,
        cfTransaction: 0,
        upBy: 7,
      });
      plnReceiveDetailRepo.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 2, prdDetail: 'x', prdBudget: 1000 },
        { prdId: 2, prId: 10, bgTypeId: 2, prdDetail: 'y', prdBudget: 500 },
      ]);
      budgetIncomeTypeRepo.find.mockResolvedValue([
        { bgTypeId: 2, budgetType: 'เงินสด' },
      ]);
      dataSource.query.mockResolvedValue([{ book_code: 'BOOK-1' }]);

      const result = await service.loadReceiveById(10, 1);
      expect(result!.total).toBe(1500);
      expect(result!.book_no).toBe('BOOK-1');
      expect(result!.details[0].bg_type_name).toBe('เงินสด');
    });

    it('query เล่มใบเสร็จ error → book_no = null (ไม่ throw)', async () => {
      plnReceiveRepo.findOne.mockResolvedValue({
        prId: 10,
        scId: 1,
        receiveMoneyType: 0,
      });
      plnReceiveDetailRepo.find.mockResolvedValue([]);
      dataSource.query.mockRejectedValue(new Error('no table'));
      const result = await service.loadReceiveById(10, 1);
      expect(result!.book_no).toBeNull();
    });
  });

  // ─── addReceive ───────────────────────────────────────────────────────────────────
  describe('addReceive', () => {
    const baseDto: AddReceiveDto = {
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      receive_date: '2026-05-01',
      receive_money_type: 3,
      amount: 1000,
      up_by: 7,
    };

    it('update แต่ไม่พบ receive (pr_id > 0) → flag: false', async () => {
      em.findOne.mockResolvedValue(null); // PlnReceive ไม่พบ
      const result = await service.addReceive({ ...baseDto, pr_id: 99 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการรับเงิน' });
    });

    it('สร้างใหม่ (เงินฝาก type 3) ไม่มีเล่มใบเสร็จ → flag: true ข้อความปกติ', async () => {
      // create path: em.create คืน object ว่าง, save ใส่ prId
      em.create.mockImplementation((_e: unknown, v: unknown) => ({
        ...(v as object),
      }));
      em.save.mockResolvedValue({});
      em.find.mockResolvedValue([]); // activeDetails
      em.findOne.mockResolvedValue(null); // ไม่มี ReceiptBook
      const result = await service.addReceive(baseDto);
      expect(result.flag).toBe(true);
      expect(result.ms).toBe('บันทึกเรียบร้อยแล้ว');
    });

    it('สร้าง financial_transactions ตาม activeDetails (sync ledger)', async () => {
      em.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 2, prdBudget: 1000 },
      ]);
      em.findOne.mockResolvedValue(null);
      await service.addReceive(baseDto);
      // ต้อง soft-delete FT เก่า (createQueryBuilder().update())
      expect(em.createQueryBuilder).toHaveBeenCalled();
      // และ create FinancialTransactions
      expect(em.create).toHaveBeenCalledWith(
        FinancialTransactions,
        expect.objectContaining({ type: 1, amount: 1000 }),
      );
    });

    it('รับเงินสด (type 2) → สร้าง CashKeeping (ไม่ซ้ำ)', async () => {
      const dto = { ...baseDto, receive_money_type: 2, amount: 2000 };
      em.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 2, prdBudget: 2000 },
      ]);
      em.findOne.mockResolvedValue(null);
      // ckRepo จาก manager.getRepository
      const ckQb: Record<string, jest.Mock> = {};
      ['where', 'andWhere'].forEach(
        (m) => (ckQb[m] = jest.fn().mockReturnValue(ckQb)),
      );
      ckQb['getCount'] = jest.fn().mockResolvedValue(0); // ยังไม่มี → สร้าง
      const ckRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(ckQb),
        create: jest.fn().mockImplementation((v: unknown) => v),
        save: jest.fn().mockResolvedValue({}),
      };
      em.getRepository.mockReturnValue(ckRepo);
      adminRepo.findOne.mockResolvedValue({
        adminId: 2,
        name: 'ผอ.',
        type: 1,
      });

      const result = await service.addReceive(dto);
      expect(result.flag).toBe(true);
      expect(ckRepo.save).toHaveBeenCalled();
    });

    it('สร้างใหม่ + มีเล่มใบเสร็จเปิดอยู่ → ออก บร. และเดินเลขเล่ม', async () => {
      em.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 2, prdBudget: 1000 },
      ]);
      const book = {
        rbId: 1,
        bookCode: 'B1',
        currentNo: 5,
        toNo: 50,
        status: 1,
      };
      // findOne ครั้งแรก: ใน create path ไม่เรียก (pr_id<=0); เรียก ReceiptBook
      em.findOne.mockResolvedValue(book);
      const result = await service.addReceive(baseDto);
      expect(result.flag).toBe(true);
      expect(result.ms).toContain('บร. เล่มที่ B1 เลขที่ 5');
      expect(book.currentNo).toBe(6);
    });

    it('error ภายใน transaction → flag: false พร้อมข้อความ', async () => {
      em.findOne.mockResolvedValue(null);
      em.save.mockRejectedValue(new Error('DB down'));
      const result = await service.addReceive(baseDto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('DB down');
    });
  });

  // ─── deleteReceive ──────────────────────────────────────────────────────────────
  describe('deleteReceive', () => {
    it('ไม่พบ receive → flag: false', async () => {
      em.findOne.mockResolvedValue(null);
      const result = await service.deleteReceive(99, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการรับเงิน' });
    });

    it('cross-tenant — filter prId/scId/del=0', async () => {
      em.findOne.mockResolvedValue(null);
      await service.deleteReceive(5, 77);
      expect(em.findOne).toHaveBeenCalledWith(
        PlnReceive,
        expect.objectContaining({
          where: { prId: 5, scId: 77, del: 0 },
        }),
      );
    });

    it('วันที่ถูกล็อก → flag: false ไม่ลบ', async () => {
      em.findOne.mockResolvedValue({
        prId: 5,
        scId: 1,
        del: 0,
        receiveDate: new Date('2026-04-01'),
      });
      financialAuditService.isDateLocked.mockResolvedValue(true);
      const result = await service.deleteReceive(5, 1);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ถูกลงนามแล้ว');
      expect(em.save).not.toHaveBeenCalled();
    });

    it('วันที่ไม่ถูกล็อก → soft delete (del=1) detail + FT + receive และ flag: true', async () => {
      const receive = {
        prId: 5,
        scId: 1,
        del: 0,
        upBy: 0,
        receiveDate: new Date('2026-05-01'),
      };
      em.findOne.mockResolvedValue(receive);
      financialAuditService.isDateLocked.mockResolvedValue(false);

      const result = await service.deleteReceive(5, 1, 9);
      expect(em.update).toHaveBeenCalledWith(
        PlnReceiveDetail,
        { prId: 5, del: 0 },
        { del: 1 },
      );
      expect(em.createQueryBuilder).toHaveBeenCalled(); // soft-delete FT
      expect(receive.del).toBe(1);
      expect(receive.upBy).toBe(9);
      expect(result).toEqual({
        flag: true,
        ms: 'ลบข้อมูลการรับเงินเรียบร้อยแล้ว',
      });
    });

    it('ไม่ส่ง upBy → ไม่แก้ค่า upBy เดิม', async () => {
      const receive = {
        prId: 5,
        scId: 1,
        del: 0,
        upBy: 3,
        receiveDate: new Date('2026-05-01'),
      };
      em.findOne.mockResolvedValue(receive);
      financialAuditService.isDateLocked.mockResolvedValue(false);
      await service.deleteReceive(5, 1);
      expect(receive.upBy).toBe(3);
    });
  });
});
