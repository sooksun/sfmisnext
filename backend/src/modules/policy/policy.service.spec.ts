import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PolicyService } from './policy.service';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from './entities/budget-income-type.entity';
import { PlnRealBudget } from './entities/pln-real-budget.entity';

function makeQb(rawMany: unknown[] = [], count = 0) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  [
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'offset',
    'limit',
  ].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['clone'] = jest.fn().mockReturnValue(chain());
  qb['getCount'] = jest.fn().mockResolvedValue(count);
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawMany);
  return qb;
}

describe('PolicyService', () => {
  let service: PolicyService;
  let syRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let bitRepo: jest.Mocked<any>;
  let rbRepo: jest.Mocked<any>;

  beforeEach(async () => {
    syRepo = { find: jest.fn() };
    partnerRepo = { find: jest.fn() };
    bitRepo = { find: jest.fn() };
    rbRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(() => makeQb()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        { provide: getRepositoryToken(SchoolYear), useValue: syRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bitRepo },
        { provide: getRepositoryToken(PlnRealBudget), useValue: rbRepo },
      ],
    }).compile();

    service = module.get(PolicyService);
  });

  // ─── getBudgetIncomeType ───────────────────────────────────────────────────
  describe('getBudgetIncomeType', () => {
    it('filter del=0 และ map field', async () => {
      bitRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'งบดำเนินงาน', budgetTypeCalc: 1, budgetBorrowType: '2' },
      ]);
      const result = await service.getBudgetIncomeType();
      expect(bitRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { del: 0 } }),
      );
      expect(result[0].bg_type_id).toBe(1);
      expect(result[0].budget_type_name).toBe('งบดำเนินงาน');
    });
  });

  // ─── getSchoolYear ─────────────────────────────────────────────────────────
  describe('getSchoolYear', () => {
    it('map sy_id/budget_year + ชื่อปี', async () => {
      syRepo.find.mockResolvedValue([
        { syId: 3, syYear: 2569, budgetYear: 2569, scId: 5, semester: 1 },
      ]);
      const result = await service.getSchoolYear();
      expect(result[0].sy_id).toBe(3);
      expect(result[0].sy_name).toBe('ปีการศึกษา 2569');
      expect(result[0].budget_year).toBe(2569);
    });
  });

  // ─── getPartner ────────────────────────────────────────────────────────────
  describe('getPartner', () => {
    it('filter scId + del=0', async () => {
      partnerRepo.find.mockResolvedValue([]);
      await service.getPartner(5);
      expect(partnerRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 5, del: 0 } }),
      );
    });

    it('map partner field', async () => {
      partnerRepo.find.mockResolvedValue([
        { pId: 1, pName: 'ร้าน A', pType: 1, pIdTax: '123', payType: 1, scId: 5 },
      ]);
      const result = await service.getPartner(5);
      expect(result[0].p_id).toBe(1);
      expect(result[0].p_name).toBe('ร้าน A');
    });
  });

  // ─── loadRealBudget ────────────────────────────────────────────────────────
  describe('loadRealBudget', () => {
    it('filter scId + del=0 ผ่าน queryBuilder', async () => {
      const qb = makeQb([], 0);
      rbRepo.createQueryBuilder.mockReturnValue(qb);
      await service.loadRealBudget(3, 5, 0, 25);
      expect(qb.where).toHaveBeenCalledWith('rb.sc_id = :scId', { scId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('rb.del = 0');
    });

    it('คืน count + page + pageSize', async () => {
      rbRepo.createQueryBuilder.mockReturnValue(makeQb([], 7));
      const result = await service.loadRealBudget(3, 5, 1, 10);
      expect(result.count).toBe(7);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('แปลง amount null → 0, budget_type_name null → ว่าง', async () => {
      rbRepo.createQueryBuilder.mockReturnValue(
        makeQb(
          [
            {
              prb_id: 1,
              sc_id: 5,
              acad_year: 2569,
              bg_type_id: 2,
              budget_type_name: null,
              receivetype: 1,
              recieve_acadyear: 2569,
              detail: null,
              amount: null,
              del: 0,
              up_by: 7,
              up_date: null,
            },
          ],
          1,
        ),
      );
      const result = await service.loadRealBudget(3, 5, 0, 25);
      expect(result.data[0].amount).toBe(0);
      expect(result.data[0].budget_type_name).toBe('');
      expect(result.data[0].detail).toBe('');
    });

    it('แปลง amount string → number', async () => {
      rbRepo.createQueryBuilder.mockReturnValue(
        makeQb(
          [
            {
              prb_id: 1,
              sc_id: 5,
              acad_year: 2569,
              bg_type_id: 2,
              budget_type_name: 'งบ',
              receivetype: 1,
              recieve_acadyear: 2569,
              detail: 'x',
              amount: '1500.50',
              del: 0,
              up_by: 7,
              up_date: null,
            },
          ],
          1,
        ),
      );
      const result = await service.loadRealBudget(3, 5, 0, 25);
      expect(result.data[0].amount).toBe(1500.5);
    });

    it('page/pageSize ไม่ถูกต้อง → ใช้ค่า default (page 0, size 25)', async () => {
      rbRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));
      const result = await service.loadRealBudget(3, 5, -1, 0);
      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(25);
    });
  });

  // ─── loadExpenses (stub) ───────────────────────────────────────────────────
  describe('loadExpenses', () => {
    it('คืนค่า data ว่าง count 0', () => {
      const result = service.loadExpenses(5, '2569', 0, 25);
      expect(result).toEqual({ data: [], count: 0, page: 0, pageSize: 25 });
    });
  });

  // ─── addRealBudget ─────────────────────────────────────────────────────────
  describe('addRealBudget', () => {
    it('happy path → flag:true', async () => {
      rbRepo.save.mockResolvedValue({});
      const result = await service.addRealBudget({
        sc_id: 5,
        acad_year: 2569,
        bg_type_id: 2,
        amount: 1000,
        up_by: 7,
      });
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
    });

    it('แปลงค่าเป็น number + del=0', async () => {
      let saved: any;
      rbRepo.save.mockImplementation((x: any) => {
        saved = x;
        return Promise.resolve(x);
      });
      await service.addRealBudget({
        sc_id: '5',
        acad_year: '2569',
        bg_type_id: '2',
        amount: '1000',
      });
      expect(saved.scId).toBe(5);
      expect(saved.amount).toBe(1000);
      expect(saved.del).toBe(0);
      expect(saved.upBy).toBeNull();
    });

    it('save error → flag:false', async () => {
      rbRepo.save.mockRejectedValue(new Error('DB'));
      const result = await service.addRealBudget({ sc_id: 5 });
      expect(result).toEqual({ flag: false, ms: 'บันทึกไม่สำเร็จ' });
    });
  });

  // ─── updateRealBudget ──────────────────────────────────────────────────────
  describe('updateRealBudget', () => {
    it('ไม่มี prb_id → flag:false', async () => {
      const result = await service.updateRealBudget({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรหัสรายการ' });
    });

    it('ไม่พบ row → flag:false', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.updateRealBudget({ prb_id: 99 });
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่พบรายการที่ต้องการแก้ไข',
      });
    });

    it('happy path → อัปเดต field + flag:true', async () => {
      const row: any = { prbId: 1, del: 0, amount: 0, detail: '' };
      rbRepo.findOne.mockResolvedValue(row);
      rbRepo.save.mockResolvedValue(row);
      const result = await service.updateRealBudget({
        prb_id: 1,
        bg_type_id: 3,
        amount: 2000,
        detail: 'แก้ไข',
      });
      expect(result).toEqual({ flag: true, ms: 'บันทึกเรียบร้อยแล้ว' });
      expect(row.bgTypeId).toBe(3);
      expect(row.amount).toBe(2000);
      expect(row.detail).toBe('แก้ไข');
    });

    it('save error → flag:false', async () => {
      rbRepo.findOne.mockResolvedValue({ prbId: 1, del: 0 });
      rbRepo.save.mockRejectedValue(new Error('DB'));
      const result = await service.updateRealBudget({ prb_id: 1 });
      expect(result).toEqual({ flag: false, ms: 'บันทึกไม่สำเร็จ' });
    });
  });

  // ─── removeRealBudget ──────────────────────────────────────────────────────
  describe('removeRealBudget', () => {
    it('ไม่มี prb_id → flag:false', async () => {
      const result = await service.removeRealBudget({});
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรหัสรายการ' });
    });

    it('ไม่พบ row → flag:false', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.removeRealBudget({ prb_id: 99 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการที่ต้องการลบ' });
    });

    it('soft delete (del=1) → flag:true', async () => {
      const row: any = { prbId: 1, del: 0 };
      rbRepo.findOne.mockResolvedValue(row);
      rbRepo.save.mockResolvedValue(row);
      const result = await service.removeRealBudget({ prb_id: 1, up_by: 7 });
      expect(result).toEqual({ flag: true, ms: 'ลบเรียบร้อยแล้ว' });
      expect(row.del).toBe(1);
      expect(row.upBy).toBe(7);
    });
  });

  // ─── Expenses stubs ────────────────────────────────────────────────────────
  describe('Expenses stubs', () => {
    it('addExpenses คืน flag:true', () => {
      expect(service.addExpenses({}).flag).toBe(true);
    });
    it('updateExpenses คืน flag:true', () => {
      expect(service.updateExpenses({}).flag).toBe(true);
    });
    it('removeExpenses คืน flag:true', () => {
      expect(service.removeExpenses({})).toEqual({
        flag: true,
        ms: 'ลบเรียบร้อยแล้ว',
      });
    });
  });
});
