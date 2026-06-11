import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptBookService } from './receipt-book.service';
import { ReceiptBook } from './entities/receipt-book.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  AddReceiptBookDto,
  CloseBookDto,
  VoidBookDto,
  AdvanceCurrentDto,
} from './dto/receipt-book.dto';

describe('ReceiptBookService', () => {
  let service: ReceiptBookService;
  let rbRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;

  beforeEach(async () => {
    rbRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    adminRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptBookService,
        { provide: getRepositoryToken(ReceiptBook), useValue: rbRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
      ],
    }).compile();

    service = module.get(ReceiptBookService);
  });

  // ─── loadBooks ────────────────────────────────────────────────────────────
  describe('loadBooks', () => {
    it('filter scId, syId, budgetYear และ del=0; เรียง rbId DESC', async () => {
      rbRepo.find.mockResolvedValue([]);
      await service.loadBooks(5, 3, '2569');
      expect(rbRepo.find).toHaveBeenCalledWith({
        where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
        order: { rbId: 'DESC' },
      });
    });

    it('คืน array ว่างและ count=0 ถ้าไม่มีข้อมูล', async () => {
      rbRepo.find.mockResolvedValue([]);
      const result = await service.loadBooks(1, 1, '2569');
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('คำนวณ remaining และ usage_pct ถูกต้อง', async () => {
      // from 1, to 100, current 51 → used 50 / range 100 = 50%, remaining 50
      rbRepo.find.mockResolvedValue([
        { rbId: 1, fromNo: 1, toNo: 100, currentNo: 51, status: 1 },
      ]);
      const [row] = (await service.loadBooks(1, 1, '2569')).data;
      expect(row.remaining).toBe(50);
      expect(row.usage_pct).toBe(50);
    });

    it('usage_pct ไม่เกิน 100 และ range=0 → 0%', async () => {
      rbRepo.find.mockResolvedValue([
        { rbId: 1, fromNo: 5, toNo: 5, currentNo: 5, status: 1 }, // range=1
        { rbId: 2, fromNo: 10, toNo: 5, currentNo: 10, status: 1 }, // range<=0
      ]);
      const data = (await service.loadBooks(1, 1, '2569')).data;
      expect(data[1].usage_pct).toBe(0); // range <= 0
    });
  });

  // ─── getActiveBook ────────────────────────────────────────────────────────
  describe('getActiveBook', () => {
    it('filter status=1, del=0, scId, budgetYear', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      await service.getActiveBook(5, '2569');
      expect(rbRepo.findOne).toHaveBeenCalledWith({
        where: { scId: 5, budgetYear: '2569', status: 1, del: 0 },
      });
    });

    it('ไม่มีเล่มที่ใช้งาน → คืน null', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.getActiveBook(1, '2569');
      expect(result).toBeNull();
    });

    it('มีเล่ม → คืน dto', async () => {
      rbRepo.findOne.mockResolvedValue({
        rbId: 1,
        fromNo: 1,
        toNo: 100,
        currentNo: 1,
        status: 1,
      });
      const result = await service.getActiveBook(1, '2569');
      expect(result?.rb_id).toBe(1);
    });
  });

  // ─── addBook ──────────────────────────────────────────────────────────────
  describe('addBook', () => {
    const dto: AddReceiptBookDto = {
      sc_id: 1,
      sy_id: 3,
      budget_year: '2569',
      book_code: 'A-01',
      from_no: 1,
      to_no: 100,
      up_by: 7,
    };

    beforeEach(() => {
      rbRepo.create.mockImplementation((v: any) => v);
      rbRepo.save.mockResolvedValue({});
    });

    it('มีเล่ม active อยู่แล้ว → block', async () => {
      rbRepo.findOne.mockResolvedValue({ rbId: 9, status: 1 });
      const result = await service.addBook(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('มีเล่มที่กำลังใช้อยู่แล้ว');
      expect(rbRepo.save).not.toHaveBeenCalled();
    });

    it('มีเล่มปีงบก่อนหน้ายัง active → block (ห้ามข้ามปีงบ)', async () => {
      rbRepo.findOne.mockResolvedValue(null); // ไม่มี active ปีนี้
      rbRepo.find.mockResolvedValue([
        { rbId: 8, budgetYear: '2568', status: 1 },
      ]);
      const result = await service.addBook(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('2568');
      expect(result.ms).toContain('ห้ามใช้ข้ามปีงบ');
      expect(rbRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → สร้างเล่มด้วย currentNo=from_no, status=1', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      rbRepo.find.mockResolvedValue([]);
      const result = await service.addBook(dto);
      const created = rbRepo.create.mock.calls[0][0];
      expect(created.currentNo).toBe(1); // = from_no
      expect(created.status).toBe(1);
      expect(created.del).toBe(0);
      expect(result.flag).toBe(true);
    });

    it('เล่มปีงบใหม่กว่า/เท่ากันที่ active อยู่ ไม่ถือเป็น stale → ผ่าน', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      rbRepo.find.mockResolvedValue([
        { rbId: 8, budgetYear: '2570', status: 1 },
      ]);
      const result = await service.addBook(dto);
      expect(result.flag).toBe(true);
    });
  });

  // ─── closeBook ────────────────────────────────────────────────────────────
  describe('closeBook', () => {
    const dto: CloseBookDto = {
      rb_id: 1,
      closed_date: '2026-05-31',
      up_by: 7,
    };

    it('ไม่พบเล่ม → flag: false', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.closeBook(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบเล่มใบเสร็จ' });
    });

    it('เล่มที่ไม่ได้กำลังใช้งาน (status != 1) → block', async () => {
      rbRepo.findOne.mockResolvedValue({ rbId: 1, status: 2 });
      const result = await service.closeBook(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('สถานะ 1');
      expect(rbRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → set status=2 และ closedDate', async () => {
      const book: any = { rbId: 1, status: 1, bookCode: 'A-01' };
      rbRepo.findOne.mockResolvedValue(book);
      rbRepo.save.mockResolvedValue(book);

      const result = await service.closeBook(dto);
      expect(book.status).toBe(2);
      expect(book.closedDate).toBe('2026-05-31');
      expect(book.upBy).toBe(7);
      expect(result.flag).toBe(true);
    });
  });

  // ─── voidBook ─────────────────────────────────────────────────────────────
  describe('voidBook', () => {
    const dto: VoidBookDto = {
      rb_id: 1,
      void_reason: 'พิมพ์ผิด',
      up_by: 7,
    };

    it('ไม่พบเล่ม → flag: false', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.voidBook(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบเล่มใบเสร็จ' });
    });

    it('เล่มถูกยกเลิกแล้ว (status=3) → flag: false', async () => {
      rbRepo.findOne.mockResolvedValue({ rbId: 1, status: 3 });
      const result = await service.voidBook(dto);
      expect(result).toEqual({ flag: false, ms: 'เล่มนี้ถูกยกเลิกแล้ว' });
      expect(rbRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → set status=3, snapshot voidedByName, voidReason', async () => {
      const book: any = { rbId: 1, status: 1, bookCode: 'A-01' };
      rbRepo.findOne.mockResolvedValue(book);
      adminRepo.findOne.mockResolvedValue({ name: 'ผู้ยกเลิก' });
      rbRepo.save.mockResolvedValue(book);

      const result = await service.voidBook(dto);
      expect(book.status).toBe(3);
      expect(book.voidedBy).toBe(7);
      expect(book.voidedByName).toBe('ผู้ยกเลิก');
      expect(book.voidReason).toBe('พิมพ์ผิด');
      expect(book.voidedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.flag).toBe(true);
    });

    it('ไม่พบ Admin → voidedByName เป็น null', async () => {
      const book: any = { rbId: 1, status: 1 };
      rbRepo.findOne.mockResolvedValue(book);
      adminRepo.findOne.mockResolvedValue(null);
      rbRepo.save.mockResolvedValue(book);

      await service.voidBook(dto);
      expect(book.voidedByName).toBeNull();
    });
  });

  // ─── advanceCurrent ───────────────────────────────────────────────────────
  describe('advanceCurrent', () => {
    const dto: AdvanceCurrentDto = {
      rb_id: 1,
      new_current_no: 50,
      up_by: 7,
    };

    it('ไม่พบเล่ม → flag: false', async () => {
      rbRepo.findOne.mockResolvedValue(null);
      const result = await service.advanceCurrent(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบเล่มใบเสร็จ' });
    });

    it('เล่มถูกยกเลิก (status=3) → block', async () => {
      rbRepo.findOne.mockResolvedValue({ rbId: 1, status: 3 });
      const result = await service.advanceCurrent(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ยกเลิก');
      expect(rbRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → อัปเดต currentNo (ยังไม่หมดเล่ม คงสถานะ)', async () => {
      const book: any = { rbId: 1, status: 1, toNo: 100, currentNo: 1 };
      rbRepo.findOne.mockResolvedValue(book);
      rbRepo.save.mockResolvedValue(book);

      const result = await service.advanceCurrent(dto);
      expect(book.currentNo).toBe(50);
      expect(book.status).toBe(1); // ยังไม่หมด
      expect(result.flag).toBe(true);
    });

    it('new_current_no > toNo → auto-close (status=2 + closedDate)', async () => {
      const book: any = { rbId: 1, status: 1, toNo: 100, currentNo: 1 };
      rbRepo.findOne.mockResolvedValue(book);
      rbRepo.save.mockResolvedValue(book);

      const result = await service.advanceCurrent({
        ...dto,
        new_current_no: 101,
      });
      expect(book.status).toBe(2);
      expect(book.closedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.flag).toBe(true);
    });
  });
});
