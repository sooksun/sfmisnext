import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptService } from './receipt.service';
import { Receipt } from './entities/receipt.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';
import { AddReceiptDto } from './dto/add-receipt.dto';

function makeQb(rawMany: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  [
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
  ].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawMany);
  return qb;
}

describe('ReceiptService', () => {
  let service: ReceiptService;
  let receiptRepo: jest.Mocked<any>;
  let plnReceiveRepo: jest.Mocked<any>;
  let plnReceiveDetailRepo: jest.Mocked<any>;
  let financialAuditService: jest.Mocked<
    Pick<FinancialAuditService, 'isDateLocked'>
  >;
  // EntityManager mock สำหรับ transaction ใน addReceipt
  let em: jest.Mocked<any>;

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((_e: unknown, v: unknown) => v),
      save: jest.fn().mockResolvedValue({}),
    };

    receiptRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb([])),
      findOne: jest.fn(),
      save: jest.fn(),
      manager: {
        transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)),
      },
    };
    plnReceiveRepo = { find: jest.fn() };
    plnReceiveDetailRepo = { find: jest.fn() };
    financialAuditService = { isDateLocked: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(PlnReceive), useValue: plnReceiveRepo },
        {
          provide: getRepositoryToken(PlnReceiveDetail),
          useValue: plnReceiveDetailRepo,
        },
        { provide: FinancialAuditService, useValue: financialAuditService },
      ],
    }).compile();

    service = module.get(ReceiptService);
  });

  // ─── loadReceipt ──────────────────────────────────────────────────────────────
  describe('loadReceipt', () => {
    it('filter scId/syId/year และ status=1', async () => {
      const qb = makeQb([]);
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      await service.loadReceipt(5, 3, '2569');
      expect(qb.where).toHaveBeenCalledWith('r.sc_id = :scId', { scId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('r.sy_id = :yId', { yId: 3 });
      expect(qb.andWhere).toHaveBeenCalledWith('r.year = :yearStr', {
        yearStr: '2569',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('r.status = :status', {
        status: '1',
      });
    });

    it('คืน [] เมื่อไม่มีใบเสร็จ และไม่ query detail', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.loadReceipt(1, 3, '2569');
      expect(result).toEqual([]);
      expect(plnReceiveDetailRepo.find).not.toHaveBeenCalled();
    });

    it('คำนวณ total_budget จาก pln_receive_detail ตาม pr_id', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          { r_id: 1, pr_id: 10, receive_form: 'ฟอร์ม' },
          { r_id: 2, pr_id: 20, receive_form: null },
        ]),
      );
      plnReceiveDetailRepo.find.mockResolvedValue([
        { prId: 10, prdBudget: 1000 },
        { prId: 10, prdBudget: 500 },
        { prId: 20, prdBudget: 300 },
      ]);

      const result = await service.loadReceipt(1, 3, '2569');
      expect(result[0].total_budget).toBe(1500);
      expect(result[1].total_budget).toBe(300);
    });

    it('receive_form null → คืน empty string', async () => {
      receiptRepo.createQueryBuilder.mockReturnValue(
        makeQb([{ r_id: 1, pr_id: 10, receive_form: null }]),
      );
      plnReceiveDetailRepo.find.mockResolvedValue([]);
      const [row] = await service.loadReceipt(1, 3, '2569');
      expect(row.receive_form).toBe('');
      expect(row.total_budget).toBe(0);
    });
  });

  // ─── loadReceive ──────────────────────────────────────────────────────────────
  describe('loadReceive', () => {
    it('filter scId/syId/budgetYear/del=0 และ cfTransaction=1', async () => {
      plnReceiveRepo.find.mockResolvedValue([]);
      await service.loadReceive(5, 3, '2569');
      expect(plnReceiveRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scId: 5,
            syId: 3,
            budgetYear: '2569',
            del: 0,
            cfTransaction: 1,
          },
        }),
      );
    });

    it('คืน [] เมื่อไม่มี receive และไม่ query detail', async () => {
      plnReceiveRepo.find.mockResolvedValue([]);
      const result = await service.loadReceive(1, 3, '2569');
      expect(result).toEqual([]);
      expect(plnReceiveDetailRepo.find).not.toHaveBeenCalled();
    });

    it('group detail ตาม prId และคำนวณ total_budget', async () => {
      plnReceiveRepo.find.mockResolvedValue([
        { prId: 10, prNo: 'A', receiveForm: 'f', receiveDate: null },
        { prId: 20, prNo: 'B', receiveForm: 'g', receiveDate: null },
      ]);
      plnReceiveDetailRepo.find.mockResolvedValue([
        { prdId: 1, prId: 10, bgTypeId: 1, prdDetail: 'x', prdBudget: 1000 },
        { prdId: 2, prId: 10, bgTypeId: 2, prdDetail: 'y', prdBudget: 2000 },
        { prdId: 3, prId: 20, bgTypeId: 1, prdDetail: 'z', prdBudget: 500 },
      ]);

      const result = await service.loadReceive(1, 3, '2569');
      const r10 = result.find((r) => r.pr_id === 10)!;
      expect(r10.total_budget).toBe(3000);
      expect(r10.detail_data).toHaveLength(2);
      const r20 = result.find((r) => r.pr_id === 20)!;
      expect(r20.total_budget).toBe(500);
    });
  });

  // ─── addReceipt ───────────────────────────────────────────────────────────────
  describe('addReceipt', () => {
    const dto: AddReceiptDto = {
      detail: 'รับเงิน',
      pr_id: '10',
      date_generate: '2026-05-01',
      sc_id: 1,
      sy_id: 3,
      year: '2569',
      up_by: 7,
    };

    it('ไม่มีเล่มใบเสร็จที่ใช้งานอยู่ → flag: false', async () => {
      em.findOne.mockResolvedValue(null);
      const result = await service.addReceipt(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ไม่พบเล่มใบเสร็จ');
    });

    it('เล่มเต็มแล้ว (currentNo > toNo) → flag: false', async () => {
      em.findOne.mockResolvedValue({
        rbId: 1,
        bookCode: 'B1',
        currentNo: 51,
        toNo: 50,
        status: 1,
      });
      const result = await service.addReceipt(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เต็มแล้ว');
    });

    it('happy path → ออกเลขอัตโนมัติ บร. + เดินเลขเล่ม + flag: true', async () => {
      const book = {
        rbId: 1,
        bookCode: 'B1',
        currentNo: 5,
        toNo: 50,
        status: 1,
      };
      em.findOne.mockResolvedValue(book);
      const result = await service.addReceipt(dto);
      expect(result.flag).toBe(true);
      expect(result.ms).toContain('บร. เล่มที่ B1 เลขที่ 5');
      // เดินเลขถัดไป
      expect(book.currentNo).toBe(6);
      // save ทั้ง ReceiptBook และ Receipt
      expect(em.save).toHaveBeenCalledWith(ReceiptBook, book);
      expect(em.save).toHaveBeenCalledWith(Receipt, expect.any(Object));
    });

    it('เดินเลขแล้วเล่มหมดพอดี → ปิดเล่ม (status=2)', async () => {
      const book: any = {
        rbId: 1,
        bookCode: 'B1',
        currentNo: 50,
        toNo: 50,
        status: 1,
      };
      em.findOne.mockResolvedValue(book);
      await service.addReceipt(dto);
      expect(book.currentNo).toBe(51);
      expect(book.status).toBe(2);
      expect(book.closedDate).toBeDefined();
    });

    it('ส่ง r_no มาเอง → ไม่ดึงเล่ม ไม่เดินเลข', async () => {
      const result = await service.addReceipt({ ...dto, r_no: 'MANUAL-1' });
      expect(em.findOne).not.toHaveBeenCalled();
      expect(result.flag).toBe(true);
      expect(result.ms).toContain('MANUAL-1');
    });
  });

  // ─── updateReceipt ────────────────────────────────────────────────────────────
  describe('updateReceipt', () => {
    const dto: AddReceiptDto = {
      r_id: 1,
      detail: 'แก้ไข',
      pr_id: '10',
      date_generate: '2026-05-01',
      sc_id: 1,
      sy_id: 3,
      year: '2569',
    };

    it('ไม่มี r_id → flag: false', async () => {
      const result = await service.updateReceipt({ ...dto, r_id: undefined });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ r_id' });
      expect(receiptRepo.save).not.toHaveBeenCalled();
    });

    it('ไม่พบใบเสร็จ (status=1) → flag: false', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      const result = await service.updateReceipt(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลใบเสร็จ' });
    });

    it('filter status=1 ตอน findOne', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      await service.updateReceipt(dto);
      expect(receiptRepo.findOne).toHaveBeenCalledWith({
        where: { rId: 1, status: '1' },
      });
    });

    it('happy path → อัปเดต field และ flag: true', async () => {
      const receipt = { rId: 1, status: '1', detail: 'เดิม', upBy: 0 };
      receiptRepo.findOne.mockResolvedValue(receipt);
      receiptRepo.save.mockResolvedValue(receipt);

      const result = await service.updateReceipt({ ...dto, up_by: 9 });
      expect(receipt.detail).toBe('แก้ไข');
      expect(receipt.upBy).toBe(9);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── removeReceipt ────────────────────────────────────────────────────────────
  describe('removeReceipt', () => {
    it('ไม่พบใบเสร็จ → flag: false', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      const result = await service.removeReceipt(99, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลใบเสร็จ' });
    });

    it('cross-tenant — filter scId และ status=1', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      await service.removeReceipt(1, 77);
      expect(receiptRepo.findOne).toHaveBeenCalledWith({
        where: { rId: 1, scId: 77, status: '1' },
      });
    });

    it('วันที่ถูกล็อก (financial audit) → flag: false', async () => {
      receiptRepo.findOne.mockResolvedValue({
        rId: 1,
        scId: 1,
        status: '1',
        dateGenerate: new Date('2026-04-01'),
      });
      financialAuditService.isDateLocked.mockResolvedValue(true);
      const result = await service.removeReceipt(1, 1);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ถูกลงนามแล้ว');
      expect(receiptRepo.save).not.toHaveBeenCalled();
    });

    it('วันที่ไม่ถูกล็อก → set status=0 และ flag: true', async () => {
      const receipt = {
        rId: 1,
        scId: 1,
        status: '1',
        dateGenerate: new Date('2026-05-01'),
      };
      receiptRepo.findOne.mockResolvedValue(receipt);
      financialAuditService.isDateLocked.mockResolvedValue(false);
      receiptRepo.save.mockResolvedValue(receipt);

      const result = await service.removeReceipt(1, 1);
      expect(receipt.status).toBe('0');
      expect(result).toEqual({ flag: true });
    });
  });
});
