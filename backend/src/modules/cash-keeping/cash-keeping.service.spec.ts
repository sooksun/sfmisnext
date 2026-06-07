import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashKeepingService } from './cash-keeping.service';
import { CashKeepingRecord } from './entities/cash-keeping-record.entity';
import { Admin } from '../admin/entities/admin.entity';

describe('CashKeepingService', () => {
  let service: CashKeepingService;
  let ckrRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;

  beforeEach(async () => {
    ckrRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    adminRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashKeepingService,
        { provide: getRepositoryToken(CashKeepingRecord), useValue: ckrRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
      ],
    }).compile();

    service = module.get(CashKeepingService);
  });

  // ─── loadRecords ──────────────────────────────────────────────────────────
  describe('loadRecords', () => {
    it('filter scId, syId และ del=0', async () => {
      ckrRepo.find.mockResolvedValue([]);
      await service.loadRecords(5, 3);
      expect(ckrRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, del: 0 },
        }),
      );
    });

    it('เรียงตาม recordDate DESC, ckrId DESC', async () => {
      ckrRepo.find.mockResolvedValue([]);
      await service.loadRecords(1, 1);
      expect(ckrRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { recordDate: 'DESC', ckrId: 'DESC' },
        }),
      );
    });

    it('คืน array ว่างและ count=0 ถ้าไม่มีข้อมูล', async () => {
      ckrRepo.find.mockResolvedValue([]);
      const result = await service.loadRecords(1, 1);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('map field ของ record → snake_case ถูกต้อง', async () => {
      ckrRepo.find.mockResolvedValue([
        {
          ckrId: 7,
          scId: 5,
          syId: 3,
          recordDate: '2026-05-01',
          amount: 1200,
          moneyDetail: 'ค่าน้ำ',
          senderId: 10,
          senderName: 'ครู ก',
          senderPosition: '1',
          receiverId: 20,
          receiverName: 'ครู ข',
          receiverPosition: '2',
          note: 'หมายเหตุ',
          status: 1,
          returnedDate: null,
          returnedAmount: null,
          returnNote: null,
          createDate: null,
        },
      ]);

      const result = await service.loadRecords(5, 3);
      expect(result.count).toBe(1);
      const row = result.data[0];
      expect(row.ckr_id).toBe(7);
      expect(row.sc_id).toBe(5);
      expect(row.sy_id).toBe(3);
      expect(row.amount).toBe(1200);
      expect(row.money_detail).toBe('ค่าน้ำ');
      expect(row.sender_name).toBe('ครู ก');
      expect(row.receiver_name).toBe('ครู ข');
      expect(row.status).toBe(1);
    });
  });

  // ─── addRecord ────────────────────────────────────────────────────────────
  describe('addRecord', () => {
    const baseDto = {
      sc_id: 1,
      sy_id: 3,
      record_date: '2026-05-01',
      amount: 1500,
      sender_id: 10,
      receiver_id: 20,
    };

    beforeEach(() => {
      ckrRepo.create.mockImplementation((v: any) => v);
      ckrRepo.save.mockResolvedValue({});
    });

    it('happy path → flag: true', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      const result = await service.addRecord(baseDto);
      expect(result.flag).toBe(true);
      expect(ckrRepo.save).toHaveBeenCalled();
    });

    it('snapshot ชื่อ+ตำแหน่ง sender และ receiver จาก Admin', async () => {
      adminRepo.findOne
        .mockResolvedValueOnce({ name: 'ผู้ส่ง', position: 5 }) // sender
        .mockResolvedValueOnce({ name: 'ผู้รับ', position: 9 }); // receiver

      await service.addRecord(baseDto);
      const created = ckrRepo.create.mock.calls[0][0];
      expect(created.senderName).toBe('ผู้ส่ง');
      expect(created.senderPosition).toBe('5'); // แปลงเป็น string
      expect(created.receiverName).toBe('ผู้รับ');
      expect(created.receiverPosition).toBe('9');
    });

    it('ไม่พบ Admin → senderName/receiverName เป็น null', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      await service.addRecord(baseDto);
      const created = ckrRepo.create.mock.calls[0][0];
      expect(created.senderName).toBeNull();
      expect(created.senderPosition).toBeNull();
      expect(created.receiverName).toBeNull();
    });

    it('fallback ใช้ username เมื่อ name เป็น null', async () => {
      adminRepo.findOne
        .mockResolvedValueOnce({ name: null, username: 'sender1', position: null })
        .mockResolvedValueOnce({ name: null, username: 'receiver1', position: null });

      await service.addRecord(baseDto);
      const created = ckrRepo.create.mock.calls[0][0];
      expect(created.senderName).toBe('sender1');
      expect(created.senderPosition).toBeNull(); // position null → null
      expect(created.receiverName).toBe('receiver1');
    });

    it('สร้าง record ด้วย status=1 และ del=0', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      await service.addRecord(baseDto);
      const created = ckrRepo.create.mock.calls[0][0];
      expect(created.status).toBe(1);
      expect(created.del).toBe(0);
    });

    it('upBy default = 0 ถ้าไม่ส่ง', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      await service.addRecord(baseDto);
      expect(ckrRepo.create.mock.calls[0][0].upBy).toBe(0);
    });

    it('moneyDetail/note default เป็น null', async () => {
      adminRepo.findOne.mockResolvedValue(null);
      await service.addRecord(baseDto);
      const created = ckrRepo.create.mock.calls[0][0];
      expect(created.moneyDetail).toBeNull();
      expect(created.note).toBeNull();
    });
  });

  // ─── returnRecord ─────────────────────────────────────────────────────────
  describe('returnRecord', () => {
    const returnDto = {
      ckr_id: 1,
      returned_date: '2026-05-10',
      returned_amount: 1500,
      up_by: 7,
    };

    it('ไม่พบรายการ → flag: false', async () => {
      ckrRepo.findOne.mockResolvedValue(null);
      const result = await service.returnRecord(returnDto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('filter del=0 ที่ findOne', async () => {
      ckrRepo.findOne.mockResolvedValue(null);
      await service.returnRecord(returnDto);
      expect(ckrRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ckrId: 1, del: 0 },
        }),
      );
    });

    it('record ส่งคืนแล้ว (status=2) → flag: false', async () => {
      ckrRepo.findOne.mockResolvedValue({ ckrId: 1, status: 2 });
      const result = await service.returnRecord(returnDto);
      expect(result).toEqual({ flag: false, ms: 'บันทึกการส่งคืนแล้ว' });
      expect(ckrRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → set status=2 และบันทึกข้อมูลคืน', async () => {
      const record: any = { ckrId: 1, status: 1 };
      ckrRepo.findOne.mockResolvedValue(record);
      ckrRepo.save.mockResolvedValue(record);

      const result = await service.returnRecord(returnDto);
      expect(record.status).toBe(2);
      expect(record.returnedDate).toBe('2026-05-10');
      expect(record.returnedAmount).toBe(1500);
      expect(record.upBy).toBe(7);
      expect(result).toEqual({
        flag: true,
        ms: 'บันทึกการส่งคืนเงินเรียบร้อยแล้ว',
      });
    });

    it('return_note default เป็น null และ upBy default 0', async () => {
      const record: any = { ckrId: 1, status: 1 };
      ckrRepo.findOne.mockResolvedValue(record);
      ckrRepo.save.mockResolvedValue(record);

      await service.returnRecord({
        ckr_id: 1,
        returned_date: '2026-05-10',
        returned_amount: 1500,
      });
      expect(record.returnNote).toBeNull();
      expect(record.upBy).toBe(0);
    });
  });

  // ─── removeRecord ─────────────────────────────────────────────────────────
  describe('removeRecord', () => {
    it('ไม่พบรายการ → flag: false', async () => {
      ckrRepo.findOne.mockResolvedValue(null);
      const result = await service.removeRecord(99, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('ลบรายการที่ส่งคืนแล้ว (status=2) ไม่ได้ → flag: false', async () => {
      ckrRepo.findOne.mockResolvedValue({ ckrId: 1, status: 2 });
      const result = await service.removeRecord(1, 1);
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่สามารถลบรายการที่ส่งคืนแล้ว',
      });
      expect(ckrRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → soft delete (del=1) และ flag: true', async () => {
      const record: any = { ckrId: 1, status: 1, del: 0 };
      ckrRepo.findOne.mockResolvedValue(record);
      ckrRepo.save.mockResolvedValue(record);

      const result = await service.removeRecord(1, 7);
      expect(record.del).toBe(1);
      expect(record.upBy).toBe(7);
      expect(result).toEqual({ flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' });
    });
  });

  // ─── depositReminder (ระเบียบ 2562) ────────────────────────────────────────
  describe('depositReminder', () => {
    it('เงินสดถือไว้นานเกินกำหนด (วันรับในอดีต) → overdue', async () => {
      ckrRepo.find.mockResolvedValue([
        { ckrId: 1, recordDate: '2020-01-01', amount: 5000, moneyDetail: 'a', status: 1 },
      ]);
      const r = await service.depositReminder(1, 2);
      expect(r.count).toBe(1);
      expect(r.overdue).toBe(1);
      expect(r.data[0].status).toBe('overdue');
      expect(r.total_overdue).toBe(5000);
    });

    it('วันรับในอนาคต (ยังไม่ถึงกำหนด) → ไม่อยู่ในรายการเตือน', async () => {
      ckrRepo.find.mockResolvedValue([
        { ckrId: 2, recordDate: '2999-01-01', amount: 20000, moneyDetail: 'b', status: 1 },
      ]);
      const r = await service.depositReminder(1, 2);
      expect(r.count).toBe(0);
      expect(r.overdue).toBe(0);
    });

    it('เกิน 10,000 บาท → over_threshold = true', async () => {
      ckrRepo.find.mockResolvedValue([
        { ckrId: 3, recordDate: '2020-01-01', amount: 15000, moneyDetail: 'c', status: 1 },
      ]);
      const r = await service.depositReminder(1, 2);
      expect(r.data[0].over_threshold).toBe(true);
    });
  });

  // ─── markDepositedFifo ─────────────────────────────────────────────────────
  describe('markDepositedFifo', () => {
    it('ปิดรายการเก่าสุดก่อน (FIFO) เท่าที่ยอดฝากครอบคลุมเต็มจำนวน', async () => {
      const recs: any[] = [
        { ckrId: 1, recordDate: '2025-01-01', amount: 1000, status: 1 },
        { ckrId: 2, recordDate: '2025-01-02', amount: 2000, status: 1 },
      ];
      ckrRepo.find.mockResolvedValue(recs);
      ckrRepo.save.mockImplementation((r: any) => Promise.resolve(r));
      await service.markDepositedFifo(1, 2, 1500, '2025-01-03', 9);
      // ฝาก 1500 → ปิดรายการ 1000 (เต็ม) ; รายการ 2000 ฝากไม่พอ → ไม่ปิด
      expect(ckrRepo.save).toHaveBeenCalledTimes(1);
      expect(recs[0].status).toBe(2);
      expect(recs[1].status).toBe(1);
    });

    it('ยอดฝาก<=0 → ไม่ทำอะไร', async () => {
      await service.markDepositedFifo(1, 2, 0, null, 0);
      expect(ckrRepo.find).not.toHaveBeenCalled();
    });
  });
});
