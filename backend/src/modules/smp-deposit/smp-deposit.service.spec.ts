import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SmpDepositService } from './smp-deposit.service';
import { SmpDepositEntry } from './entities/smp-deposit-entry.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';

describe('SmpDepositService', () => {
  let service: SmpDepositService;
  let repo: jest.Mocked<any>;
  let docCounter: jest.Mocked<Pick<DocCounterService, 'issue'>>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    docCounter = { issue: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmpDepositService,
        { provide: getRepositoryToken(SmpDepositEntry), useValue: repo },
        { provide: DocCounterService, useValue: docCounter },
      ],
    }).compile();

    service = module.get(SmpDepositService);
  });

  // ─── loadEntries ──────────────────────────────────────────────────────────
  describe('loadEntries', () => {
    it('filter scId, syId, budgetYear และ del=0; เรียง docDate ASC, sdeId ASC', async () => {
      repo.find.mockResolvedValue([]);
      await service.loadEntries(5, 3, '2569');
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
        order: { docDate: 'ASC', sdeId: 'ASC' },
      });
    });

    it('คืน array ว่างและ count=0 ถ้าไม่มีข้อมูล', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.loadEntries(1, 1, '2569');
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('คำนวณ running balance: ฝาก(1) บวก, ถอน(2) ลบ', async () => {
      repo.find.mockResolvedValue([
        { sdeId: 1, entryType: 1, amount: 2000 }, // +2000 → 2000
        { sdeId: 2, entryType: 1, amount: 500 }, // +500  → 2500
        { sdeId: 3, entryType: 2, amount: 700 }, // -700  → 1800
      ]);
      const result = await service.loadEntries(1, 1, '2569');
      expect(result.data.map((r) => r.balance)).toEqual([2000, 2500, 1800]);
    });

    it('set amount_in/amount_out และ entry_type_label ตามประเภท', async () => {
      repo.find.mockResolvedValue([
        { sdeId: 1, entryType: 1, amount: 2000 },
        { sdeId: 2, entryType: 2, amount: 700 },
      ]);
      const result = await service.loadEntries(1, 1, '2569');
      expect(result.data[0].entry_type_label).toBe('ฝาก');
      expect(result.data[0].amount_in).toBe(2000);
      expect(result.data[0].amount_out).toBe(0);
      expect(result.data[1].entry_type_label).toBe('ถอน');
      expect(result.data[1].amount_out).toBe(700);
    });

    it('map field → snake_case ถูกต้อง', async () => {
      repo.find.mockResolvedValue([
        {
          sdeId: 7,
          scId: 5,
          syId: 3,
          budgetYear: '2569',
          entryType: 1,
          docNo: 'BF-001',
          docDate: '2026-05-01',
          detail: 'นำฝาก',
          amount: 1000,
          moneyTypeId: 2,
          moneyTypeName: 'เงินอุดหนุน',
          note: 'n',
          upBy: 1,
          createDate: null,
        },
      ]);
      const [row] = (await service.loadEntries(5, 3, '2569')).data;
      expect(row.sde_id).toBe(7);
      expect(row.budget_year).toBe('2569');
      expect(row.doc_no).toBe('BF-001');
      expect(row.money_type_name).toBe('เงินอุดหนุน');
      expect(row.balance).toBe(1000);
    });
  });

  // ─── getSummary ───────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('คำนวณ total_in, total_out, balance และ entry_count', async () => {
      repo.find.mockResolvedValue([
        { entryType: 1, amount: 2000 },
        { entryType: 1, amount: 500 },
        { entryType: 2, amount: 700 },
      ]);
      const result = await service.getSummary(1, 3, '2569');
      expect(result).toEqual({
        total_in: 2500,
        total_out: 700,
        balance: 1800,
        entry_count: 3,
      });
    });

    it('ไม่มีรายการ → ทุกค่าเป็น 0', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.getSummary(1, 3, '2569');
      expect(result).toEqual({
        total_in: 0,
        total_out: 0,
        balance: 0,
        entry_count: 0,
      });
    });
  });

  // ─── addEntry ─────────────────────────────────────────────────────────────
  describe('addEntry', () => {
    const baseDto = {
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      entry_type: 1,
      amount: 1000,
    };

    beforeEach(() => {
      repo.create.mockImplementation((v: any) => v);
      repo.save.mockResolvedValue({});
    });

    it('happy path → flag: true', async () => {
      docCounter.issue.mockResolvedValue({ seq: 1, formatted: 'BF-001' });
      const result = await service.addEntry(baseDto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('ฝาก(entry_type=1) + ไม่ส่ง doc_no → ออกเลข BF อัตโนมัติ', async () => {
      docCounter.issue.mockResolvedValue({ seq: 1, formatted: 'BF-001' });
      await service.addEntry(baseDto);
      expect(docCounter.issue).toHaveBeenCalledWith(1, '2569', 'BF');
      expect(repo.create.mock.calls[0][0].docNo).toBe('BF-001');
    });

    it('ถอน(entry_type=2) + ไม่ส่ง doc_no → ออกเลข BT อัตโนมัติ', async () => {
      docCounter.issue.mockResolvedValue({ seq: 1, formatted: 'BT-001' });
      await service.addEntry({ ...baseDto, entry_type: 2 });
      expect(docCounter.issue).toHaveBeenCalledWith(1, '2569', 'BT');
      expect(repo.create.mock.calls[0][0].docNo).toBe('BT-001');
    });

    it('ส่ง doc_no มาเอง → ไม่ออกเลขอัตโนมัติ', async () => {
      await service.addEntry({ ...baseDto, doc_no: 'CUSTOM-9' });
      expect(docCounter.issue).not.toHaveBeenCalled();
      expect(repo.create.mock.calls[0][0].docNo).toBe('CUSTOM-9');
    });

    it('del=0; upBy default 0; optional fields null', async () => {
      docCounter.issue.mockResolvedValue({ seq: 1, formatted: 'BF-001' });
      await service.addEntry(baseDto);
      const created = repo.create.mock.calls[0][0];
      expect(created.del).toBe(0);
      expect(created.upBy).toBe(0);
      expect(created.detail).toBeNull();
      expect(created.moneyTypeId).toBeNull();
    });
  });

  // ─── updateEntry ──────────────────────────────────────────────────────────
  describe('updateEntry', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.updateEntry(99, { amount: 100 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('filter del=0 ที่ findOne', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.updateEntry(1, {});
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { sdeId: 1, del: 0 },
      });
    });

    it('อัปเดตเฉพาะ field ที่ส่งมา', async () => {
      const entry: any = {
        sdeId: 1,
        entryType: 1,
        amount: 500,
        detail: 'เดิม',
      };
      repo.findOne.mockResolvedValue(entry);
      repo.save.mockResolvedValue(entry);

      const result = await service.updateEntry(1, {
        amount: 999,
        money_type_name: 'ใหม่',
      });
      expect(entry.amount).toBe(999);
      expect(entry.moneyTypeName).toBe('ใหม่');
      expect(entry.detail).toBe('เดิม'); // ไม่เปลี่ยน
      expect(result).toEqual({ flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' });
    });
  });

  // ─── removeEntry ──────────────────────────────────────────────────────────
  describe('removeEntry', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.removeEntry(99, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('happy path → soft delete (del=1) และ flag: true', async () => {
      const entry: any = { sdeId: 1, del: 0 };
      repo.findOne.mockResolvedValue(entry);
      repo.save.mockResolvedValue(entry);

      const result = await service.removeEntry(1, 7);
      expect(entry.del).toBe(1);
      expect(entry.upBy).toBe(7);
      expect(result).toEqual({ flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' });
    });
  });
});
