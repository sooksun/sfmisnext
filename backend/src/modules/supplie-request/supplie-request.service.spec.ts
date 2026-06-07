import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplieRequestService } from './supplie-request.service';
import { SupplieRequest } from './entities/supplie-request.entity';
import { SupplieRequestDetail } from './entities/supplie-request-detail.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';

// ─── QueryBuilder mock factory (getOne — latest transaction) ─────────────────
function makeTxQb(lastTx: unknown = null) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'andWhere', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getOne'] = jest.fn().mockResolvedValue(lastTx);
  return qb;
}

describe('SupplieRequestService', () => {
  let service: SupplieRequestService;
  let reqRepo: jest.Mocked<any>;
  let detRepo: jest.Mocked<any>;
  let txRepo: jest.Mocked<any>;

  beforeEach(async () => {
    reqRepo = {
      findAndCount: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    detRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
      update: jest.fn(),
    };
    txRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeTxQb(null)),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplieRequestService,
        { provide: getRepositoryToken(SupplieRequest), useValue: reqRepo },
        { provide: getRepositoryToken(SupplieRequestDetail), useValue: detRepo },
        { provide: getRepositoryToken(TransactionSupplies), useValue: txRepo },
      ],
    }).compile();

    service = module.get(SupplieRequestService);
  });

  // ─── load ────────────────────────────────────────────────────────────────
  describe('load', () => {
    it('filter scId + del=0 และคำนวณ skip/take จาก page', async () => {
      reqRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.load(5, 2, 10);
      expect(reqRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, del: 0 },
          skip: 10, // (2-1)*10
          take: 10,
        }),
      );
    });

    it('page <= 0 → ใช้ page 1 (skip=0)', async () => {
      reqRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.load(5, 0, 10);
      expect(reqRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('map status → status_name', async () => {
      reqRepo.findAndCount.mockResolvedValue([
        [{ reqId: 1, status: 2, reqNo: 'R-1' }],
        1,
      ]);
      const result = await service.load(5, 1, 10);
      expect(result.count).toBe(1);
      expect(result.data[0].status_name).toBe('อนุมัติ');
      expect(result.data[0].req_id).toBe(1);
    });

    it('status ที่ไม่รู้จัก → status_name = empty string', async () => {
      reqRepo.findAndCount.mockResolvedValue([[{ reqId: 1, status: 77 }], 1]);
      const result = await service.load(5, 1, 10);
      expect(result.data[0].status_name).toBe('');
    });
  });

  // ─── getDetail ─────────────────────────────────────────────────────────
  describe('getDetail', () => {
    it('ไม่พบใบเบิก → คืน null', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.getDetail(99);
      expect(result).toBeNull();
    });

    it('happy path → คืน header + details (filter del=0)', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 1, reqNo: 'R-1' });
      detRepo.find.mockResolvedValue([
        { rqdId: 10, suppId: 5, reqQty: 3, issuedQty: 0, note: null },
      ]);
      const result = await service.getDetail(1);
      expect(detRepo.find).toHaveBeenCalledWith({ where: { reqId: 1, del: 0 } });
      expect(result!.status_name).toBe('ส่งคำขอ');
      expect(result!.details).toHaveLength(1);
      expect(result!.details[0].rqd_id).toBe(10);
    });
  });

  // ─── add ───────────────────────────────────────────────────────────────
  describe('add', () => {
    it('สร้างใบเบิก status=0 (ร่าง) + บันทึก details', async () => {
      reqRepo.save.mockImplementation(async (x: any) => {
        x.reqId = 100;
        return x;
      });
      const result = await service.add({
        sc_id: 1,
        req_no: 'R-1',
        details: [{ supp_id: 5, req_qty: 3 }, { supp_id: 6 }],
      });
      expect(reqRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ scId: 1, status: 0, del: 0 }),
      );
      expect(detRepo.save).toHaveBeenCalledTimes(2);
      expect(result).toEqual(
        expect.objectContaining({ flag: true, req_id: 100 }),
      );
    });

    it('req_qty default = 1 เมื่อไม่ส่ง', async () => {
      reqRepo.save.mockImplementation(async (x: any) => {
        x.reqId = 100;
        return x;
      });
      await service.add({ sc_id: 1, details: [{ supp_id: 5 }] });
      expect(detRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reqQty: 1 }),
      );
    });

    it('ไม่มี details → ไม่บันทึก detail', async () => {
      reqRepo.save.mockResolvedValue({ reqId: 100 });
      await service.add({ sc_id: 1 });
      expect(detRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('ไม่พบใบเบิก → flag: false', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.update({ req_id: 1 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบใบเบิก' });
    });

    it('status > 1 (อนุมัติแล้ว) → แก้ไขไม่ได้', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      const result = await service.update({ req_id: 1 });
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('อนุมัติแล้ว');
    });

    it('happy path → อัปเดต header + แทนที่ details (del เดิม=1)', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 0, del: 0 });
      const result = await service.update({
        req_id: 1,
        req_no: 'R-NEW',
        details: [{ supp_id: 5, req_qty: 2 }],
      });
      expect(detRepo.update).toHaveBeenCalledWith({ reqId: 1 }, { del: 1 });
      expect(detRepo.save).toHaveBeenCalledTimes(1);
      expect(result.flag).toBe(true);
    });

    it('status=1 (ส่งคำขอ) ยังแก้ได้', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 1, del: 0 });
      const result = await service.update({ req_id: 1, purpose: 'x' });
      expect(result.flag).toBe(true);
    });
  });

  // ─── submit ──────────────────────────────────────────────────────────────
  describe('submit', () => {
    it('ไม่พบใบเบิก → flag: false', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.submit(1, 9);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบใบเบิก' });
    });

    it('status != 0 → ส่งแล้วหรืออนุมัติแล้ว', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 1, del: 0 });
      const result = await service.submit(1, 9);
      expect(result.flag).toBe(false);
    });

    it('happy path → status=1 flag: true', async () => {
      const req: any = { reqId: 1, status: 0, del: 0 };
      reqRepo.findOne.mockResolvedValue(req);
      const result = await service.submit(1, 9);
      expect(req.status).toBe(1);
      expect(req.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });
  });

  // ─── approve ─────────────────────────────────────────────────────────────
  describe('approve', () => {
    it('ไม่พบใบเบิก → flag: false', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.approve(1, 9);
      expect(result.flag).toBe(false);
    });

    it('status != 1 → สถานะไม่ถูกต้อง', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 0, del: 0 });
      const result = await service.approve(1, 9);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('สถานะไม่ถูกต้อง');
    });

    it('happy path → status=2 + approvedBy/approvedDate', async () => {
      const req: any = { reqId: 1, status: 1, del: 0 };
      reqRepo.findOne.mockResolvedValue(req);
      const result = await service.approve(1, 9);
      expect(req.status).toBe(2);
      expect(req.approvedBy).toBe(9);
      expect(req.approvedDate).toBeInstanceOf(Date);
      expect(result.flag).toBe(true);
    });
  });

  // ─── reject ──────────────────────────────────────────────────────────────
  describe('reject', () => {
    it('status != 1 → สถานะไม่ถูกต้อง', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      const result = await service.reject(1, 'ไม่ครบ', 9);
      expect(result.flag).toBe(false);
    });

    it('happy path → status=0 + rejectReason (ส่งกลับแก้ไข)', async () => {
      const req: any = { reqId: 1, status: 1, del: 0 };
      reqRepo.findOne.mockResolvedValue(req);
      const result = await service.reject(1, 'ไม่ครบ', 9);
      expect(req.status).toBe(0);
      expect(req.rejectReason).toBe('ไม่ครบ');
      expect(result.flag).toBe(true);
    });
  });

  // ─── issue (จ่ายพัสดุ — ลด stock) ────────────────────────────────────────
  describe('issue', () => {
    it('ไม่พบใบเบิก → flag: false', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.issue(1, 9, []);
      expect(result.flag).toBe(false);
    });

    it('status != 2 (ยังไม่อนุมัติ) → ต้องอนุมัติก่อนจ่าย', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 1, del: 0 });
      const result = await service.issue(1, 9, []);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('อนุมัติก่อน');
    });

    it('happy path → สร้าง trans_out, ลด balance, set issuedQty, status=3', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      const det: any = { rqdId: 10, suppId: 5, del: 0 };
      detRepo.findOne.mockResolvedValue(det);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 100 }));
      const result = await service.issue(1, 9, [{ rqd_id: 10, issued_qty: 30 }]);

      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          suppId: 5,
          transIn: 0,
          transOut: 30,
          transBalance: 70, // 100 - 30
        }),
      );
      expect(txRepo.save).toHaveBeenCalled();
      expect(det.issuedQty).toBe(30);
      expect(result.flag).toBe(true);
    });

    it('เบิกเกิน stock → clamp ที่ยอดคงเหลือ (ไม่ติดลบ)', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      detRepo.findOne.mockResolvedValue({ rqdId: 10, suppId: 5, del: 0 });
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 20 }));
      await service.issue(1, 9, [{ rqd_id: 10, issued_qty: 50 }]); // ขอ 50 มี 20

      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ transOut: 20, transBalance: 0 }),
      );
    });

    it('stock = 0 → ข้ามรายการ (qty <= 0 continue)', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      detRepo.findOne.mockResolvedValue({ rqdId: 10, suppId: 5, del: 0 });
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 0 }));
      const result = await service.issue(1, 9, [{ rqd_id: 10, issued_qty: 5 }]);
      expect(txRepo.save).not.toHaveBeenCalled();
      expect(result.flag).toBe(true); // ยังเปลี่ยน status เป็น 3
    });

    it('detail ไม่มี suppId → ข้าม', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      detRepo.findOne.mockResolvedValue({ rqdId: 10, suppId: null, del: 0 });
      await service.issue(1, 9, [{ rqd_id: 10, issued_qty: 5 }]);
      expect(txRepo.save).not.toHaveBeenCalled();
    });

    it('ไม่มี transaction เดิม → ใช้ยอดเริ่ม 0 → ข้าม (ไม่มี stock)', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 2, del: 0 });
      detRepo.findOne.mockResolvedValue({ rqdId: 10, suppId: 5, del: 0 });
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(null));
      await service.issue(1, 9, [{ rqd_id: 10, issued_qty: 5 }]);
      expect(txRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── cancel ──────────────────────────────────────────────────────────────
  describe('cancel', () => {
    it('ไม่พบใบเบิก → flag: false', async () => {
      reqRepo.findOne.mockResolvedValue(null);
      const result = await service.cancel(1, 9);
      expect(result.flag).toBe(false);
    });

    it('status=3 (เบิกจ่ายแล้ว) → ยกเลิกไม่ได้', async () => {
      reqRepo.findOne.mockResolvedValue({ reqId: 1, status: 3, del: 0 });
      const result = await service.cancel(1, 9);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ยกเลิกไม่ได้');
    });

    it('happy path → status=9 (ยกเลิก) flag: true', async () => {
      const req: any = { reqId: 1, status: 1, del: 0 };
      reqRepo.findOne.mockResolvedValue(req);
      const result = await service.cancel(1, 9);
      expect(req.status).toBe(9);
      expect(result.flag).toBe(true);
    });
  });
});
