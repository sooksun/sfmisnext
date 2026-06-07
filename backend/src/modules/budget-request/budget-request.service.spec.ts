import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetRequestService } from './budget-request.service';
import { BudgetRequest } from './entities/budget-request.entity';

function makeQb(rawOne: unknown = undefined) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['select', 'where', 'andWhere', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getRawOne'] = jest.fn().mockResolvedValue(rawOne);
  return qb;
}

describe('BudgetRequestService', () => {
  let service: BudgetRequestService;
  let repo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(() => makeQb()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetRequestService,
        { provide: getRepositoryToken(BudgetRequest), useValue: repo },
      ],
    }).compile();

    service = module.get(BudgetRequestService);
  });

  // ─── loadBudgetRequests ────────────────────────────────────────────────────
  describe('loadBudgetRequests', () => {
    it('filter scId, syId, budgetYear, del=0 และเรียงตาม brSeq ASC', async () => {
      repo.find.mockResolvedValue([]);
      await service.loadBudgetRequests(5, 3, '2569');
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
        order: { brSeq: 'ASC' },
      });
    });

    it('คืนผลลัพธ์จาก repo', async () => {
      const rows = [{ brId: 1 }, { brId: 2 }];
      repo.find.mockResolvedValue(rows);
      const result = await service.loadBudgetRequests(5, 3, '2569');
      expect(result).toBe(rows);
    });
  });

  // ─── addBudgetRequest ──────────────────────────────────────────────────────
  describe('addBudgetRequest', () => {
    const dto: any = {
      sc_id: 5,
      sy_id: 3,
      budget_year: '2569',
      action_date: '2026-06-01',
      creditor_name: 'ร้าน A',
      expense_type: 3,
      amount: 5000,
      up_by: 7,
    };

    it('happy path → flag:true', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQb({ max: 4 }));
      repo.save.mockResolvedValue({});
      const result = await service.addBudgetRequest(dto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกสำเร็จ' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('คำนวณ brSeq ถัดไป = max+1', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQb({ max: 4 }));
      let saved: any;
      repo.create.mockImplementation((x: any) => x);
      repo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addBudgetRequest(dto);
      expect(saved.brSeq).toBe(5);
    });

    it('brSeq = 1 เมื่อยังไม่มีข้อมูล (max null)', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQb({ max: null }));
      let saved: any;
      repo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addBudgetRequest(dto);
      expect(saved.brSeq).toBe(1);
    });

    it('send_date/remark default เป็น null', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQb({ max: 0 }));
      let saved: any;
      repo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addBudgetRequest(dto);
      expect(saved.sendDate).toBeNull();
      expect(saved.remark).toBeNull();
      expect(saved.del).toBe(0);
    });

    it('map field snake_case → entity camelCase', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQb({ max: 0 }));
      let saved: any;
      repo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addBudgetRequest(dto);
      expect(saved.scId).toBe(5);
      expect(saved.syId).toBe(3);
      expect(saved.budgetYear).toBe('2569');
      expect(saved.creditorName).toBe('ร้าน A');
      expect(saved.expenseType).toBe(3);
      expect(saved.amount).toBe(5000);
      expect(saved.upBy).toBe(7);
    });
  });

  // ─── updateBudgetRequest ───────────────────────────────────────────────────
  describe('updateBudgetRequest', () => {
    it('happy path → flag:true และ update ตาม br_id', async () => {
      repo.update.mockResolvedValue({});
      const result = await service.updateBudgetRequest({
        br_id: 10,
        action_date: '2026-06-02',
        creditor_name: 'ร้าน B',
        expense_type: 4,
        amount: 8000,
        up_by: 7,
      } as any);
      expect(result).toEqual({ flag: true, ms: 'แก้ไขสำเร็จ' });
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        expect.objectContaining({
          creditorName: 'ร้าน B',
          expenseType: 4,
          amount: 8000,
        }),
      );
    });

    it('send_date/remark default null', async () => {
      repo.update.mockResolvedValue({});
      await service.updateBudgetRequest({
        br_id: 10,
        action_date: '2026-06-02',
        creditor_name: 'ร้าน B',
        expense_type: 4,
        amount: 8000,
        up_by: 7,
      } as any);
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        expect.objectContaining({ sendDate: null, remark: null }),
      );
    });
  });

  // ─── markSent ──────────────────────────────────────────────────────────────
  describe('markSent', () => {
    it('update sendDate และ upBy', async () => {
      repo.update.mockResolvedValue({});
      const result = await service.markSent(10, '2026-06-05', 7);
      expect(result).toEqual({ flag: true, ms: 'บันทึกวันที่ส่งสำเร็จ' });
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { sendDate: '2026-06-05', upBy: 7 },
      );
    });
  });

  // ─── deleteBudgetRequest ───────────────────────────────────────────────────
  describe('deleteBudgetRequest', () => {
    it('soft delete (del=1) + upBy', async () => {
      repo.update.mockResolvedValue({});
      const result = await service.deleteBudgetRequest(10, 7);
      expect(result).toEqual({ flag: true, ms: 'ลบสำเร็จ' });
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { del: 1, upBy: 7 },
      );
    });
  });
});
