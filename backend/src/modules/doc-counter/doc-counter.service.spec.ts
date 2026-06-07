import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  DocCounterService,
  toBudgetYearBE,
  DOC_TYPE_PREFIX,
} from './doc-counter.service';
import { DocumentCounter } from './entities/document-counter.entity';

describe('DocCounterService', () => {
  let service: DocCounterService;
  let dataSource: jest.Mocked<any>;
  let repo: jest.Mocked<any>;
  let qrManager: jest.Mocked<any>;
  let queryRunner: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    qrManager = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    queryRunner = {
      manager: qrManager,
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      // transaction(cb) → เรียก cb ด้วย manager mock
      transaction: jest.fn((cb: any) => cb(qrManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocCounterService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(DocCounterService);
  });

  // ─── toBudgetYearBE ───────────────────────────────────────────────────────────
  describe('toBudgetYearBE', () => {
    it('ค.ศ. (2026) → พ.ศ. (2569)', () => {
      expect(toBudgetYearBE(2026)).toBe('2569');
    });
    it('พ.ศ. (2569) → คงเดิม (idempotent)', () => {
      expect(toBudgetYearBE(2569)).toBe('2569');
    });
    it('รับ string ก็แปลงได้', () => {
      expect(toBudgetYearBE('2026')).toBe('2569');
    });
    it('ค่าว่าง/ไม่ถูกต้อง → คืน string ว่างหรือค่าเดิม', () => {
      expect(toBudgetYearBE(null)).toBe('');
      expect(toBudgetYearBE(undefined)).toBe('');
      expect(toBudgetYearBE(0)).toBe('0');
    });
  });

  // ─── format (static) ──────────────────────────────────────────────────────────
  describe('format', () => {
    it('ใช้คำนำหน้าภาษาไทยตาม docType และบังคับปีเป็น พ.ศ.', () => {
      expect(DocCounterService.format('BC', 12, '2026')).toBe('บค.12/2569');
      expect(DocCounterService.format('BJ', 5, '2569')).toBe('บจ.5/2569');
    });
    it('docType ไม่รู้จัก → ใช้ docType เป็น prefix', () => {
      expect(DocCounterService.format('XX', 1, '2569')).toBe('XX1/2569');
    });
  });

  // ─── issueWithin (atomic ภายใน transaction ที่มีอยู่) ────────────────────────
  describe('issueWithin', () => {
    it('row มีอยู่ → เพิ่ม lastNo +1 และคืน formatted', async () => {
      const row = { dcId: 1, scId: 1, budgetYear: '2569', docType: 'BC', lastNo: 11 };
      qrManager.findOne.mockResolvedValue(row);
      qrManager.save.mockResolvedValue(row);

      const result = await service.issueWithin(qrManager, 1, '2026', 'BC');
      expect(row.lastNo).toBe(12);
      expect(result).toEqual({ seq: 12, formatted: 'บค.12/2569' });
    });

    it('row ยังไม่มี → สร้างใหม่ lastNo=0 แล้ว lock อ่านใหม่ ก่อน +1', async () => {
      const newRow = { scId: 1, budgetYear: '2569', docType: 'BJ', lastNo: 0 };
      // ครั้งแรก findOne คืน null, ครั้งที่สอง (หลัง create+save) คืน row
      qrManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...newRow });
      qrManager.create.mockReturnValue(newRow);
      qrManager.save.mockResolvedValue(newRow);

      const result = await service.issueWithin(qrManager, 1, '2569', 'BJ');
      expect(qrManager.create).toHaveBeenCalled();
      expect(result.seq).toBe(1);
      expect(result.formatted).toBe('บจ.1/2569');
    });

    it('lock ด้วย pessimistic_write และคีย์ตัวนับเป็น พ.ศ.', async () => {
      const row = { lastNo: 0 };
      qrManager.findOne.mockResolvedValue(row);
      qrManager.save.mockResolvedValue(row);
      await service.issueWithin(qrManager, 5, '2026', 'BR');
      expect(qrManager.findOne).toHaveBeenCalledWith(
        DocumentCounter,
        expect.objectContaining({
          where: { scId: 5, budgetYear: '2569', docType: 'BR' },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });

  // ─── issue (เปิด transaction เอง) ────────────────────────────────────────────
  describe('issue', () => {
    it('เรียก dataSource.transaction และคืนผลจาก issueWithin', async () => {
      const row = { lastNo: 3 };
      qrManager.findOne.mockResolvedValue(row);
      qrManager.save.mockResolvedValue(row);

      const result = await service.issue(1, '2569', 'BC');
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual({ seq: 4, formatted: 'บค.4/2569' });
    });
  });

  // ─── getNextNumber ────────────────────────────────────────────────────────────
  describe('getNextNumber', () => {
    const dto = { sc_id: 1, budget_year: '2026', doc_type: 'BC' };

    it('happy path → commit, คืน next_no + formatted (พ.ศ.)', async () => {
      const row = { lastNo: 7 };
      qrManager.findOne.mockResolvedValue(row);
      qrManager.save.mockResolvedValue(row);

      const result = await service.getNextNumber(dto);
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        flag: true,
        ms: 'success',
        data: { next_no: 8, formatted: 'บค.8/2569' },
      });
    });

    it('row ยังไม่มี → สร้างใหม่แล้วออกเลข 1', async () => {
      qrManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ lastNo: 0 });
      qrManager.create.mockReturnValue({ lastNo: 0 });
      qrManager.save.mockResolvedValue({ lastNo: 0 });

      const result = await service.getNextNumber(dto);
      expect(qrManager.create).toHaveBeenCalled();
      expect(result.data?.next_no).toBe(1);
      expect(result.data?.formatted).toBe('บค.1/2569');
    });

    it('เกิด error → rollback และคืน flag:false พร้อมข้อความ', async () => {
      qrManager.findOne.mockRejectedValue(new Error('deadlock'));
      const result = await service.getNextNumber(dto);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('deadlock');
    });
  });

  // ─── loadCounters ─────────────────────────────────────────────────────────────
  describe('loadCounters', () => {
    it('คืน 4 doc types เสมอ (จริง 8 ตาม ALL_DOC_TYPES) แม้ DB ว่าง', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.loadCounters(1, '2569');
      expect(result.count).toBe(Object.keys(DOC_TYPE_PREFIX).length);
      // ทุก row last_no=0, next_no=1
      expect(result.data.every((d) => d.last_no === 0 && d.next_no === 1)).toBe(true);
    });

    it('row ที่มีใน DB → ใช้ค่า lastNo จริง, next_no=last+1', async () => {
      repo.find.mockResolvedValue([
        { docType: 'BC', lastNo: 10, budgetYear: '2569' },
      ]);
      const result = await service.loadCounters(1, '2026');
      const bc = result.data.find((d) => d.doc_type === 'BC');
      expect(bc?.last_no).toBe(10);
      expect(bc?.next_no).toBe(11);
      expect(bc?.formatted_next).toBe('บค.11/2569');
    });

    it('filter ด้วย scId และ budgetYear (พ.ศ.)', async () => {
      repo.find.mockResolvedValue([]);
      await service.loadCounters(8, '2026');
      expect(repo.find).toHaveBeenCalledWith({
        where: { scId: 8, budgetYear: '2569' },
      });
    });
  });

  // ─── resetCounter ─────────────────────────────────────────────────────────────
  describe('resetCounter', () => {
    const dto = { sc_id: 1, budget_year: '2026', doc_type: 'BC', reset_to: 5 };

    it('row มีอยู่ → ตั้ง lastNo = reset_to', async () => {
      const row = { lastNo: 99 } as any;
      repo.findOne.mockResolvedValue(row);
      repo.save.mockResolvedValue(row);
      const result = await service.resetCounter(dto);
      expect(row.lastNo).toBe(5);
      expect(result.flag).toBe(true);
      expect(result.ms).toContain('5');
    });

    it('row ยังไม่มี → create ใหม่ด้วย lastNo = reset_to (budgetYear เป็น พ.ศ.)', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = {} as any;
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);
      const result = await service.resetCounter(dto);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scId: 1,
          budgetYear: '2569',
          docType: 'BC',
          lastNo: 5,
        }),
      );
      expect(result.flag).toBe(true);
    });
  });
});
