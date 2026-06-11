import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankLedgerService } from './bank-ledger.service';
import { BankLedgerEntry } from './entities/bank-ledger-entry.entity';
import { Admin } from '../admin/entities/admin.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(raw: { getRawOne?: unknown; getRawMany?: unknown[] }) {
  const qb: Record<string, jest.Mock> = {};
  ['select', 'addSelect', 'where', 'groupBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb['getRawOne'] = jest.fn().mockResolvedValue(raw.getRawOne ?? null);
  qb['getRawMany'] = jest.fn().mockResolvedValue(raw.getRawMany ?? []);
  return qb;
}

describe('BankLedgerService', () => {
  let service: BankLedgerService;
  let repo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let deleteLog: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    adminRepo = { findOne: jest.fn() };
    deleteLog = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankLedgerService,
        { provide: getRepositoryToken(BankLedgerEntry), useValue: repo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: DeleteLogService, useValue: deleteLog },
      ],
    }).compile();

    service = module.get(BankLedgerService);
  });

  // ─── loadLedger ───────────────────────────────────────────────────────────
  describe('loadLedger', () => {
    it('filter scId, syId, baId และ del=0; เรียง entryDate ASC, bleId ASC', async () => {
      repo.find.mockResolvedValue([]);
      await service.loadLedger(5, 3, 2);
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, baId: 2, del: 0 },
        order: { entryDate: 'ASC', bleId: 'ASC' },
      });
    });

    it('คืน array ว่างและ count=0 ถ้าไม่มีข้อมูล', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.loadLedger(1, 1, 1);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('คำนวณ running balance: ฝาก(1) บวก, ถอน(2) ลบ', async () => {
      repo.find.mockResolvedValue([
        { bleId: 1, entryType: 1, amount: 1000 }, // +1000 → 1000
        { bleId: 2, entryType: 2, amount: 400 }, // -400  → 600
        { bleId: 3, entryType: 1, amount: 250 }, // +250  → 850
      ]);
      const result = await service.loadLedger(1, 1, 1);
      expect(result.data.map((r) => r.balance)).toEqual([1000, 600, 850]);
    });

    it('set amount_in/amount_out และ entry_type_label ตามประเภท', async () => {
      repo.find.mockResolvedValue([
        { bleId: 1, entryType: 1, amount: 1000 },
        { bleId: 2, entryType: 2, amount: 400 },
      ]);
      const result = await service.loadLedger(1, 1, 1);

      expect(result.data[0].entry_type_label).toBe('ฝาก');
      expect(result.data[0].amount_in).toBe(1000);
      expect(result.data[0].amount_out).toBe(0);

      expect(result.data[1].entry_type_label).toBe('ถอน');
      expect(result.data[1].amount_in).toBe(0);
      expect(result.data[1].amount_out).toBe(400);
    });

    it('map field → snake_case ถูกต้อง', async () => {
      repo.find.mockResolvedValue([
        {
          bleId: 9,
          scId: 5,
          syId: 3,
          baId: 2,
          entryType: 1,
          docNo: 'D-1',
          entryDate: '2026-05-01',
          detail: 'รับโอน',
          amount: 500,
          refType: 'manual',
          refId: 7,
          signerId: 1,
          signerName: 'ผู้ลงนาม',
          note: 'n',
          upBy: 1,
          createDate: null,
        },
      ]);
      const [row] = (await service.loadLedger(5, 3, 2)).data;
      expect(row.ble_id).toBe(9);
      expect(row.ba_id).toBe(2);
      expect(row.doc_no).toBe('D-1');
      expect(row.signer_name).toBe('ผู้ลงนาม');
      expect(row.balance).toBe(500);
    });
  });

  // ─── getAccountBalance ────────────────────────────────────────────────────
  describe('getAccountBalance', () => {
    it('คำนวณ balance = total_in - total_out', async () => {
      const qb = makeQb({ getRawOne: { total_in: '5000', total_out: '1800' } });
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAccountBalance(1, 3, 2);
      expect(result).toEqual({
        ba_id: 2,
        total_in: 5000,
        total_out: 1800,
        balance: 3200,
      });
    });

    it('null aggregation → ทุกค่าเป็น 0', async () => {
      const qb = makeQb({ getRawOne: { total_in: null, total_out: null } });
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAccountBalance(1, 3, 2);
      expect(result).toEqual({
        ba_id: 2,
        total_in: 0,
        total_out: 0,
        balance: 0,
      });
    });

    it('getRawOne คืน null → ทุกค่าเป็น 0', async () => {
      const qb = makeQb({ getRawOne: null });
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAccountBalance(1, 3, 2);
      expect(result.balance).toBe(0);
    });

    it('ส่ง scId/syId/baId เข้า where', async () => {
      const qb = makeQb({ getRawOne: { total_in: '0', total_out: '0' } });
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.getAccountBalance(7, 8, 9);
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('e.del = 0'),
        { scId: 7, syId: 8, baId: 9 },
      );
    });
  });

  // ─── getAllAccountBalances ──────────────────────────────────────────────────
  describe('getAllAccountBalances', () => {
    it('คืน balance ต่อบัญชี (group by ba_id)', async () => {
      const qb = makeQb({
        getRawMany: [
          { ba_id: 1, total_in: '1000', total_out: '300' },
          { ba_id: 2, total_in: '5000', total_out: null },
        ],
      });
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAllAccountBalances(1, 3);
      expect(result).toEqual([
        { ba_id: 1, total_in: 1000, total_out: 300, balance: 700 },
        { ba_id: 2, total_in: 5000, total_out: 0, balance: 5000 },
      ]);
    });

    it('คืน array ว่างถ้าไม่มีบัญชี', async () => {
      const qb = makeQb({ getRawMany: [] });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.getAllAccountBalances(1, 3);
      expect(result).toEqual([]);
    });
  });

  // ─── addEntry ─────────────────────────────────────────────────────────────
  describe('addEntry', () => {
    const baseDto = {
      sc_id: 1,
      sy_id: 3,
      ba_id: 2,
      entry_type: 1,
      amount: 1000,
    };

    beforeEach(() => {
      repo.create.mockImplementation((v: any) => v);
      repo.save.mockResolvedValue({});
    });

    it('happy path → flag: true', async () => {
      const result = await service.addEntry(baseDto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('snapshot signerName จาก Admin เมื่อมี signer_id', async () => {
      adminRepo.findOne.mockResolvedValue({ name: 'ผู้ลงนาม' });
      await service.addEntry({ ...baseDto, signer_id: 5 });
      const created = repo.create.mock.calls[0][0];
      expect(created.signerName).toBe('ผู้ลงนาม');
      expect(adminRepo.findOne).toHaveBeenCalled();
    });

    it('ไม่มี signer_id → ไม่เรียก adminRepo, signerName null', async () => {
      await service.addEntry(baseDto);
      expect(adminRepo.findOne).not.toHaveBeenCalled();
      expect(repo.create.mock.calls[0][0].signerName).toBeNull();
    });

    it('refType default = manual; del=0; upBy default 0', async () => {
      await service.addEntry(baseDto);
      const created = repo.create.mock.calls[0][0];
      expect(created.refType).toBe('manual');
      expect(created.del).toBe(0);
      expect(created.upBy).toBe(0);
    });

    it('optional fields default เป็น null', async () => {
      await service.addEntry(baseDto);
      const created = repo.create.mock.calls[0][0];
      expect(created.docNo).toBeNull();
      expect(created.entryDate).toBeNull();
      expect(created.detail).toBeNull();
      expect(created.refId).toBeNull();
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
        where: { bleId: 1, del: 0 },
      });
    });

    it('อัปเดตเฉพาะ field ที่ส่งมา', async () => {
      const entry: any = {
        bleId: 1,
        entryType: 1,
        amount: 500,
        detail: 'เดิม',
      };
      repo.findOne.mockResolvedValue(entry);
      repo.save.mockResolvedValue(entry);

      const result = await service.updateEntry(1, {
        amount: 999,
        entry_type: 2,
      });
      expect(entry.amount).toBe(999);
      expect(entry.entryType).toBe(2);
      expect(entry.detail).toBe('เดิม'); // ไม่เปลี่ยน
      expect(result).toEqual({ flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' });
    });
  });

  // ─── removeEntry ──────────────────────────────────────────────────────────
  describe('removeEntry', () => {
    it('ไม่มีเหตุผล → flag: false (บังคับ audit trail)', async () => {
      const result = await service.removeEntry(1, 7);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เหตุผล');
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('เหตุผลเป็นช่องว่าง → flag: false', async () => {
      const result = await service.removeEntry(1, 7, '   ');
      expect(result.flag).toBe(false);
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('ไม่พบรายการ → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.removeEntry(99, 1, 'บันทึกซ้ำ');
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('happy path → soft delete (del=1) + ลง delete-log และ flag: true', async () => {
      const entry: any = { bleId: 1, scId: 5, del: 0 };
      repo.findOne.mockResolvedValue(entry);
      repo.save.mockResolvedValue(entry);

      const result = await service.removeEntry(1, 7, 'บันทึกซ้ำ');
      expect(entry.del).toBe(1);
      expect(entry.upBy).toBe(7);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'bank_ledger_entry',
          rowId: 1,
          reason: 'บันทึกซ้ำ',
          deletedBy: 7,
          scId: 5,
        }),
      );
      expect(result).toEqual({ flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' });
    });
  });
});
