import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovRevenueService } from './gov-revenue.service';
import { GovRevenueEntry } from './entities/gov-revenue-entry.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { AddGovRevenueDto } from './dto/add-gov-revenue.dto';

describe('GovRevenueService', () => {
  let service: GovRevenueService;
  let entryRepo: jest.Mocked<any>;
  let regulatoryConfig: jest.Mocked<Pick<RegulatoryConfigService, 'getThreshold'>>;
  let docCounter: jest.Mocked<Pick<DocCounterService, 'issue'>>;

  beforeEach(async () => {
    entryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    regulatoryConfig = { getThreshold: jest.fn() };
    docCounter = { issue: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovRevenueService,
        { provide: getRepositoryToken(GovRevenueEntry), useValue: entryRepo },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
        { provide: DocCounterService, useValue: docCounter },
      ],
    }).compile();

    service = module.get(GovRevenueService);
  });

  function makeEntry(overrides: Record<string, unknown> = {}) {
    return {
      greId: 1,
      scId: 1,
      syId: 3,
      budgetYear: '2569',
      revenueType: 1,
      entryType: 1,
      docNo: 'BG-001',
      docDate: '2026-05-01',
      detail: 'ดอกเบี้ย',
      amount: 1000,
      note: null,
      upBy: 7,
      createDate: null,
      del: 0,
      ...overrides,
    };
  }

  // ─── loadEntries ────────────────────────────────────────────────────────────
  describe('loadEntries', () => {
    it('filter scId/syId/budgetYear/revenueType และ del=0', async () => {
      entryRepo.find.mockResolvedValue([]);
      await service.loadEntries(5, 3, '2569', 2);
      expect(entryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, budgetYear: '2569', revenueType: 2, del: 0 },
        }),
      );
    });

    it('คืน { data, count } ว่างเมื่อไม่มีข้อมูล', async () => {
      entryRepo.find.mockResolvedValue([]);
      const result = await service.loadEntries(1, 3, '2569', 1);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('คำนวณ running balance ถูกต้อง (รับ + / นำส่ง −)', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ greId: 1, entryType: 1, amount: 1000 }), // รับ → 1000
        makeEntry({ greId: 2, entryType: 2, amount: 300 }), //  นำส่ง → 700
        makeEntry({ greId: 3, entryType: 1, amount: 200 }), //  รับ → 900
      ]);
      const result = await service.loadEntries(1, 3, '2569', 1);
      expect(result.data.map((r) => r.balance)).toEqual([1000, 700, 900]);
    });

    it('แยก amount_in / amount_out ตาม entry_type', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ greId: 1, entryType: 1, amount: 500 }),
        makeEntry({ greId: 2, entryType: 2, amount: 200 }),
      ]);
      const result = await service.loadEntries(1, 3, '2569', 1);
      expect(result.data[0].amount_in).toBe(500);
      expect(result.data[0].amount_out).toBe(0);
      expect(result.data[1].amount_in).toBe(0);
      expect(result.data[1].amount_out).toBe(200);
    });

    it('แม็พชื่อประเภทเงิน และคืน "" ถ้าไม่รู้จัก', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ revenueType: 1 }),
        makeEntry({ greId: 2, revenueType: 99 }),
      ]);
      const result = await service.loadEntries(1, 3, '2569', 1);
      expect(result.data[0].revenue_type_name).toContain('ดอกเบี้ยเงินฝาก');
      expect(result.data[1].revenue_type_name).toBe('');
    });
  });

  // ─── monthlySummary ───────────────────────────────────────────────────────────
  describe('monthlySummary', () => {
    it('คืนสรุปครบ 4 ประเภท', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(10000);
      entryRepo.find.mockResolvedValue([]);
      const result = await service.monthlySummary(1, 3, '2569');
      expect(result).toHaveLength(4);
      expect(result.map((r) => r.revenue_type)).toEqual([1, 2, 3, 4]);
    });

    it('คำนวณ total_in/total_out/balance และ needs_remit ตาม threshold', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(5000);
      // ทุกประเภทคืนรายการเดียวกัน: รับ 8000, นำส่ง 1000 → balance 7000 >= 5000
      entryRepo.find.mockResolvedValue([
        makeEntry({ entryType: 1, amount: 8000 }),
        makeEntry({ greId: 2, entryType: 2, amount: 1000 }),
      ]);
      const result = await service.monthlySummary(1, 3, '2569');
      expect(result[0].total_in).toBe(8000);
      expect(result[0].total_out).toBe(1000);
      expect(result[0].balance).toBe(7000);
      expect(result[0].needs_remit).toBe(true);
    });

    it('balance < threshold → needs_remit = false', async () => {
      regulatoryConfig.getThreshold.mockResolvedValue(10000);
      entryRepo.find.mockResolvedValue([
        makeEntry({ entryType: 1, amount: 1000 }),
      ]);
      const result = await service.monthlySummary(1, 3, '2569');
      expect(result[0].needs_remit).toBe(false);
    });
  });

  // ─── interestReminder ──────────────────────────────────────────────────────────
  describe('interestReminder', () => {
    beforeEach(() => {
      // [URGENT_THRESHOLD, URGENT_DAYS]
      regulatoryConfig.getThreshold
        .mockResolvedValueOnce(10000)
        .mockResolvedValueOnce(3);
    });

    it('ไม่มีรายการ → outstanding=0 ไม่มี alert urgent', async () => {
      entryRepo.find.mockResolvedValue([]);
      const result = await service.interestReminder(1, 3, '2569');
      expect(result.total_outstanding).toBe(0);
      expect(result.is_overdue).toBe(false);
    });

    it('by_type คำนวณ received/remitted/outstanding เฉพาะประเภท 1,2', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ revenueType: 1, entryType: 1, amount: 5000, docDate: null }),
        makeEntry({ greId: 2, revenueType: 1, entryType: 2, amount: 2000, docDate: null }),
        makeEntry({ greId: 3, revenueType: 2, entryType: 1, amount: 1000, docDate: null }),
        // ประเภท 4 ไม่ควรนับ
        makeEntry({ greId: 4, revenueType: 4, entryType: 1, amount: 9999, docDate: null }),
      ]);
      const result = await service.interestReminder(1, 3, '2569');
      const t1 = result.by_type.find((t) => t.revenue_type === 1)!;
      expect(t1.received).toBe(5000);
      expect(t1.remitted).toBe(2000);
      expect(t1.outstanding).toBe(3000);
      // total = (5000-2000) + (1000-0) = 4000
      expect(result.total_outstanding).toBe(4000);
    });

    it('ยอดค้างเกิน threshold → มี alert level urgent', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ revenueType: 1, entryType: 1, amount: 50000, docDate: null }),
      ]);
      const result = await service.interestReminder(1, 3, '2569');
      expect(result.alerts.some((a) => a.level === 'urgent')).toBe(true);
      expect(result.need_action).toBe(true);
    });

    it('กรองด้วย scId/syId/del=0', async () => {
      entryRepo.find.mockResolvedValue([]);
      await service.interestReminder(8, 5, '2569');
      expect(entryRepo.find).toHaveBeenCalledWith({
        where: { scId: 8, syId: 5, del: 0 },
      });
    });
  });

  // ─── addEntry ──────────────────────────────────────────────────────────────────
  describe('addEntry', () => {
    const dto: AddGovRevenueDto = {
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      revenue_type: 1,
      entry_type: 1,
      amount: 1000,
      doc_date: '2026-05-01',
      detail: 'ดอกเบี้ย',
      up_by: 7,
    };

    beforeEach(() => {
      entryRepo.create.mockImplementation((x: any) => x);
      entryRepo.save.mockResolvedValue({});
    });

    it('happy path → flag: true', async () => {
      docCounter.issue.mockResolvedValue({ formatted: 'บง.001/2569' } as any);
      const result = await service.addEntry(dto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' });
      expect(entryRepo.save).toHaveBeenCalled();
    });

    it('ไม่ส่ง doc_no → ออกเลขอัตโนมัติด้วย docCounter.issue (BG)', async () => {
      docCounter.issue.mockResolvedValue({ formatted: 'บง.001/2569' } as any);
      await service.addEntry(dto);
      expect(docCounter.issue).toHaveBeenCalledWith(1, '2569', 'BG');
      const created = entryRepo.create.mock.calls[0][0];
      expect(created.docNo).toBe('บง.001/2569');
    });

    it('ส่ง doc_no มาเอง → ไม่เรียก docCounter', async () => {
      await service.addEntry({ ...dto, doc_no: 'MANUAL-1' });
      expect(docCounter.issue).not.toHaveBeenCalled();
      const created = entryRepo.create.mock.calls[0][0];
      expect(created.docNo).toBe('MANUAL-1');
    });

    it('แม็พ field จาก dto → entity ถูกต้อง', async () => {
      await service.addEntry({ ...dto, doc_no: 'X' });
      const created = entryRepo.create.mock.calls[0][0];
      expect(created.scId).toBe(1);
      expect(created.syId).toBe(3);
      expect(created.revenueType).toBe(1);
      expect(created.entryType).toBe(1);
      expect(created.amount).toBe(1000);
      expect(created.del).toBe(0);
    });

    it('up_by ไม่ส่ง → default 0', async () => {
      const { up_by, ...rest } = dto;
      void up_by;
      await service.addEntry({ ...rest, doc_no: 'X' } as AddGovRevenueDto);
      const created = entryRepo.create.mock.calls[0][0];
      expect(created.upBy).toBe(0);
    });
  });

  // ─── updateEntry ─────────────────────────────────────────────────────────────────
  describe('updateEntry', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      entryRepo.findOne.mockResolvedValue(null);
      const result = await service.updateEntry(99, { amount: 500 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('filter del=0 ตอน findOne', async () => {
      entryRepo.findOne.mockResolvedValue(null);
      await service.updateEntry(5, {});
      expect(entryRepo.findOne).toHaveBeenCalledWith({
        where: { greId: 5, del: 0 },
      });
    });

    it('happy path → อัปเดตเฉพาะ field ที่ส่งมา', async () => {
      const entry = makeEntry({ amount: 1000, detail: 'เดิม' });
      entryRepo.findOne.mockResolvedValue(entry);
      entryRepo.save.mockResolvedValue(entry);

      const result = await service.updateEntry(1, { amount: 2000 });
      expect(entry.amount).toBe(2000);
      expect(entry.detail).toBe('เดิม'); // ไม่เปลี่ยน
      expect(result).toEqual({ flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' });
    });

    it('detail = null ได้เมื่อส่งค่าว่าง', async () => {
      const entry = makeEntry({ detail: 'เดิม' });
      entryRepo.findOne.mockResolvedValue(entry);
      entryRepo.save.mockResolvedValue(entry);
      await service.updateEntry(1, { detail: undefined as any });
      // undefined ไม่ผ่านเงื่อนไข → ไม่เปลี่ยน
      expect(entry.detail).toBe('เดิม');
    });
  });

  // ─── removeEntry ─────────────────────────────────────────────────────────────────
  describe('removeEntry', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      entryRepo.findOne.mockResolvedValue(null);
      const result = await service.removeEntry(99, 7);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('soft delete (del=1) + set upBy และ flag: true', async () => {
      const entry = makeEntry({ del: 0, upBy: 0 });
      entryRepo.findOne.mockResolvedValue(entry);
      entryRepo.save.mockResolvedValue(entry);

      const result = await service.removeEntry(1, 7);
      expect(entry.del).toBe(1);
      expect(entry.upBy).toBe(7);
      expect(result).toEqual({ flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' });
    });
  });
});
