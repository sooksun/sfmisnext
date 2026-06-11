import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetRequestService } from './budget-request.service';
import { BudgetRequest } from './entities/budget-request.entity';
import { BudgetExpenseType } from './entities/budget-expense-type.entity';

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
  let typeRepo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(() => makeQb()),
    };
    typeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(() => makeQb()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetRequestService,
        { provide: getRepositoryToken(BudgetRequest), useValue: repo },
        { provide: getRepositoryToken(BudgetExpenseType), useValue: typeRepo },
      ],
    }).compile();

    service = module.get(BudgetRequestService);
  });

  // ─── ประเภทรายจ่าย (master) ────────────────────────────────────────────────
  describe('expenseTypes', () => {
    it('loadExpenseTypes filter scId, del=0 และ map เป็น snake_case', async () => {
      typeRepo.find.mockResolvedValue([{ betId: 1, name: 'ค่ารักษาพยาบาล' }]);
      const result = await service.loadExpenseTypes(5);
      expect(typeRepo.find).toHaveBeenCalledWith({
        where: { scId: 5, del: 0 },
        order: { sortOrder: 'ASC', betId: 'ASC' },
      });
      expect(result).toEqual([{ bet_id: 1, name: 'ค่ารักษาพยาบาล' }]);
    });

    it('addExpenseType: trim ชื่อ + sortOrder = max+1 → flag:true', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      typeRepo.createQueryBuilder.mockReturnValue(makeQb({ max: 2 }));
      let saved: any;
      typeRepo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      const result = await service.addExpenseType({
        sc_id: 5,
        name: '  ค่าเดินทาง  ',
        up_by: 7,
      });
      expect(result).toEqual({ flag: true, ms: 'เพิ่มประเภทรายจ่ายสำเร็จ' });
      expect(saved.name).toBe('ค่าเดินทาง');
      expect(saved.sortOrder).toBe(3);
      expect(saved.scId).toBe(5);
    });

    it('addExpenseType: ชื่อซ้ำ → flag:false ไม่ save', async () => {
      typeRepo.findOne.mockResolvedValue({ betId: 9, name: 'ค่าเดินทาง' });
      const result = await service.addExpenseType({
        sc_id: 5,
        name: 'ค่าเดินทาง',
        up_by: 7,
      });
      expect(result).toEqual({ flag: false, ms: 'มีประเภทรายจ่ายนี้อยู่แล้ว' });
      expect(typeRepo.save).not.toHaveBeenCalled();
    });

    it('deleteExpenseType: soft delete (del=1) + upBy', async () => {
      typeRepo.update.mockResolvedValue({});
      const result = await service.deleteExpenseType({ bet_id: 9, up_by: 7 });
      expect(result).toEqual({ flag: true, ms: 'ลบประเภทรายจ่ายสำเร็จ' });
      expect(typeRepo.update).toHaveBeenCalledWith(
        { betId: 9 },
        { del: 1, upBy: 7 },
      );
    });
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

    it('คืนผลลัพธ์ map เป็น snake_case (รวม expense_type_text)', async () => {
      const rows = [
        {
          brId: 1,
          brSeq: 1,
          actionDate: '2026-01-01',
          creditorName: 'ร้าน A',
          expenseType: 3,
          expenseTypeText: 'ค่ารักษาพยาบาล',
          amount: 100,
          sendDate: null,
          remark: null,
        },
      ];
      repo.find.mockResolvedValue(rows);
      const result = await service.loadBudgetRequests(5, 3, '2569');
      expect(result).toEqual([
        {
          br_id: 1,
          br_seq: 1,
          action_date: '2026-01-01',
          creditor_name: 'ร้าน A',
          expense_type: 3,
          expense_type_text: 'ค่ารักษาพยาบาล',
          amount: 100,
          send_date: null,
          remark: null,
        },
      ]);
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

    it('remark default null และไม่แตะ status/send_date/paid_date', async () => {
      repo.update.mockResolvedValue({});
      await service.updateBudgetRequest({
        br_id: 10,
        action_date: '2026-06-02',
        creditor_name: 'ร้าน B',
        expense_type: 4,
        amount: 8000,
        up_by: 7,
      } as any);
      const patch = repo.update.mock.calls[0][1];
      expect(patch).toEqual(expect.objectContaining({ remark: null }));
      expect(patch).not.toHaveProperty('sendDate');
      expect(patch).not.toHaveProperty('status');
      expect(patch).not.toHaveProperty('paidDate');
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('ส่งเบิก (1) → ตั้ง status=1 + sendDate', async () => {
      repo.update.mockResolvedValue({});
      const result = await service.updateStatus(10, 1, '2026-06-05', 7);
      expect(result).toEqual({ flag: true, ms: 'อัปเดตสถานะสำเร็จ' });
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { status: 1, upBy: 7, sendDate: '2026-06-05' },
      );
    });

    it('โอนเงินแล้ว (2) → ตั้ง status=2 + paidDate', async () => {
      repo.update.mockResolvedValue({});
      await service.updateStatus(10, 2, '2026-06-09', 7);
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { status: 2, upBy: 7, paidDate: '2026-06-09' },
      );
    });

    it('ยกเลิก (3) → ตั้ง status=3 คงวันที่เดิม (ไม่แตะ sendDate/paidDate)', async () => {
      repo.update.mockResolvedValue({});
      await service.updateStatus(10, 3, null, 7);
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { status: 3, upBy: 7 },
      );
    });

    it('คืนสถานะ (0) → ล้าง sendDate/paidDate', async () => {
      repo.update.mockResolvedValue({});
      await service.updateStatus(10, 0, null, 7);
      expect(repo.update).toHaveBeenCalledWith(
        { brId: 10 },
        { status: 0, upBy: 7, sendDate: null, paidDate: null },
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
