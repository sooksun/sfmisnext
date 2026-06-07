import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupplieService } from './supplie.service';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { Supplies } from './entities/supplies.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SupInspection } from './entities/sup-inspection.entity';

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

describe('SupplieService', () => {
  let service: SupplieService;
  let receiveOrderRepo: jest.Mocked<any>;
  let receiveDetailRepo: jest.Mocked<any>;
  let parcelOrderRepo: jest.Mocked<any>;
  let parcelDetailRepo: jest.Mocked<any>;
  let suppliesRepo: jest.Mocked<any>;
  let txRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let inspectionRepo: jest.Mocked<any>;
  let dataSource: { transaction: jest.Mock };

  // em mock factory ใช้ใน transaction callback
  function makeEm() {
    return {
      findOne: jest.fn(),
      create: jest.fn((_entity, x) => x ?? {}),
      save: jest.fn((_entity, x) => Promise.resolve(x)),
      createQueryBuilder: jest.fn().mockReturnValue(makeTxQb(null)),
    };
  }

  beforeEach(async () => {
    receiveOrderRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    receiveDetailRepo = { find: jest.fn() };
    parcelOrderRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    parcelDetailRepo = { find: jest.fn() };
    suppliesRepo = { find: jest.fn().mockResolvedValue([]) };
    txRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeTxQb(null)) };
    adminRepo = { find: jest.fn() };
    inspectionRepo = { findOne: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplieService,
        { provide: getRepositoryToken(ReceiveParcelOrder), useValue: receiveOrderRepo },
        { provide: getRepositoryToken(ReceiveParcelDetail), useValue: receiveDetailRepo },
        { provide: getRepositoryToken(ParcelOrder), useValue: parcelOrderRepo },
        { provide: getRepositoryToken(ParcelDetail), useValue: parcelDetailRepo },
        { provide: getRepositoryToken(Supplies), useValue: suppliesRepo },
        { provide: getRepositoryToken(TransactionSupplies), useValue: txRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(SupInspection), useValue: inspectionRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SupplieService);
  });

  // ─── loadReceive ───────────────────────────────────────────────────────────
  describe('loadReceive', () => {
    it('filter scId + syYear + del=0', async () => {
      receiveOrderRepo.find.mockResolvedValue([]);
      await service.loadReceive(5, 3);
      expect(receiveOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syYear: 3, del: 0 },
        }),
      );
    });

    it('map column names + add=false', async () => {
      receiveOrderRepo.find.mockResolvedValue([
        { receiveId: 1, scId: 5, orderId: 7, title: 'รับพัสดุ', receiveStatus: 1, del: 0 },
      ]);
      const [row] = await service.loadReceive(5, 3);
      expect(row.receive_id).toBe(1);
      expect(row.order_id).toBe(7);
      expect(row.add).toBe(false);
    });
  });

  // ─── loadSubProject ──────────────────────────────────────────────────────
  describe('loadSubProject', () => {
    it('filter order status=7 (จัดซื้อ) และ batch-load details (กัน N+1)', async () => {
      parcelOrderRepo.find.mockResolvedValue([
        { orderId: 1, projectId: 2, details: 'd', resources: null, budgets: 5000 },
      ]);
      parcelDetailRepo.find.mockResolvedValue([
        { orderId: 1, suppId: 5, pcTotal: 10, del: 0 },
      ]);
      const result = await service.loadSubProject(5, 2569);
      expect(parcelOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orderStatus: 7, del: 0, acadYear: 2569 }),
        }),
      );
      expect(result.parcel_order[0].data_detail).toEqual([
        { supp_id: 5, pc_total: 10 },
      ]);
      expect(result.parcel_order[0].resources).toBe(0); // null → 0
    });

    it('ไม่มี order → ไม่ query details', async () => {
      parcelOrderRepo.find.mockResolvedValue([]);
      const result = await service.loadSubProject(5, 2569);
      expect(parcelDetailRepo.find).not.toHaveBeenCalled();
      expect(result.parcel_order).toEqual([]);
    });

    it('คืน balance จาก transactions', async () => {
      parcelOrderRepo.find.mockResolvedValue([]);
      suppliesRepo.find.mockResolvedValue([{ suppId: 5, scId: 5, del: 0 }]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 42 }));
      const result = await service.loadSubProject(5, 2569);
      expect(result.balance).toEqual([{ suppId: 5, transBalance: 42 }]);
    });
  });

  // ─── loadGetUserTeacher ──────────────────────────────────────────────────
  describe('loadGetUserTeacher', () => {
    it('filter scId + del=0 และ map field', async () => {
      adminRepo.find.mockResolvedValue([
        { adminId: 1, name: 'ครู ก', username: 'k', email: 'a@b', type: 2, scId: 5 },
      ]);
      const [row] = await service.loadGetUserTeacher(5);
      expect(adminRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 5, del: 0 } }),
      );
      expect(row.admin_id).toBe(1);
      expect(row.sc_id).toBe(5);
    });
  });

  // ─── loadStockSupplie ──────────────────────────────────────────────────────
  describe('loadStockSupplie', () => {
    it('balance_stock = balance - received (เมื่อมี receive_id)', async () => {
      suppliesRepo.find.mockResolvedValue([
        { suppId: 5, suppNo: 'S-1', suppName: 'กระดาษ', scId: 1, del: 0 },
      ]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 100 }));
      receiveDetailRepo.find.mockResolvedValue([
        { suppId: 5, rpTotal: 30, del: 0 },
      ]);
      const result = await service.loadStockSupplie({ sc_id: 1, receive_id: 9 } as any);
      // balance 100 - received 30 = 70
      expect(result[0].balance_stock).toBe(70);
    });

    it('ไม่มี receive_id → balance_stock = balance เต็ม', async () => {
      suppliesRepo.find.mockResolvedValue([{ suppId: 5, scId: 1, del: 0 }]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 100 }));
      const result = await service.loadStockSupplie({ sc_id: 1 } as any);
      expect(receiveDetailRepo.find).not.toHaveBeenCalled();
      expect(result[0].balance_stock).toBe(100);
    });

    it('supply ไม่มี transaction → balance 0', async () => {
      suppliesRepo.find.mockResolvedValue([{ suppId: 5, scId: 1, del: 0 }]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(null));
      const result = await service.loadStockSupplie({ sc_id: 1 } as any);
      expect(result[0].balance_stock).toBe(0);
    });
  });

  // ─── loadSupplieOrder / loadGetSupplieOrder ──────────────────────────────
  describe('loadSupplieOrder', () => {
    it('filter orderStatus IN (5,6,7) — งานพัสดุที่กำลังดำเนินการ', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      parcelOrderRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      await service.loadSupplieOrder(5, 2569);
      expect(parcelOrderRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'o.order_status IN (:...statuses)',
        { statuses: [5, 6, 7] },
      );
    });
  });

  describe('loadGetSupplieOrder', () => {
    it('filter orderStatus=7 (จัดซื้อ)', async () => {
      parcelOrderRepo.find.mockResolvedValue([]);
      await service.loadGetSupplieOrder(5, 2569);
      expect(parcelOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orderStatus: 7, del: 0 }),
        }),
      );
    });
  });

  // ─── loadParcelDetailWithdraw ───────────────────────────────────────────
  describe('loadParcelDetailWithdraw', () => {
    it('จับคู่ parcel detail กับ receive detail ตาม suppId', async () => {
      parcelDetailRepo.find.mockResolvedValue([
        { pcId: 1, orderId: 7, suppId: 5, pcTotal: 10, del: 0 },
      ]);
      receiveDetailRepo.find.mockResolvedValue([
        { rpId: 11, suppId: 5, rpTotal: 4, del: 0 },
      ]);
      suppliesRepo.find.mockResolvedValue([]);
      const result = await service.loadParcelDetailWithdraw(7, 9, 1);
      expect(result.parcel_detail[0].rp_id).toBe(11);
      expect(result.parcel_detail[0].rp_total).toBe(4);
    });

    it('ไม่มี receive detail ที่ตรง → rp_id/rp_total = 0', async () => {
      parcelDetailRepo.find.mockResolvedValue([
        { pcId: 1, orderId: 7, suppId: 5, pcTotal: 10, del: 0 },
      ]);
      receiveDetailRepo.find.mockResolvedValue([]);
      suppliesRepo.find.mockResolvedValue([]);
      const result = await service.loadParcelDetailWithdraw(7, 9, 1);
      expect(result.parcel_detail[0].rp_id).toBe(0);
      expect(result.parcel_detail[0].rp_total).toBe(0);
    });
  });

  // ─── editReceiveParcel (transaction) ─────────────────────────────────────
  describe('editReceiveParcel', () => {
    it('receive_id > 0 แต่ไม่พบ → flag: false', async () => {
      const em = makeEm();
      em.findOne.mockResolvedValue(null);
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.editReceiveParcel({
        receive_id: 99,
        admin_id: 1,
        sc_id: 1,
        order_id: 7,
        sy_year: 3,
        title: 't',
        receive_date: '2026-05-01',
        cart: [],
      } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการเบิกพัสดุ' });
    });

    it('สร้างใหม่ (receive_id=0) + บันทึก cart items → flag: true', async () => {
      const em = makeEm();
      em.save.mockImplementation((_e: any, x: any) => {
        if (x && x.receiveId === undefined) x.receiveId = 100;
        return Promise.resolve(x);
      });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.editReceiveParcel({
        receive_id: 0,
        admin_id: 1,
        sc_id: 1,
        order_id: 7,
        sy_year: 3,
        title: 't',
        receive_date: '2026-05-01',
        cart: [{ supp_id: 5, receive: 10 }],
      } as any);
      expect(em.create).toHaveBeenCalledWith(ReceiveParcelOrder, expect.anything());
      expect(result).toEqual({ flag: true });
    });

    it('cart_receive_del → soft delete detail', async () => {
      const em = makeEm();
      em.save.mockImplementation((_e: any, x: any) => Promise.resolve(x));
      const delDetail: any = { rpId: 22, del: 0 };
      em.findOne.mockImplementation((_entity: any, opts: any) => {
        if (opts?.where?.rpId === 22) return Promise.resolve(delDetail);
        return Promise.resolve(null);
      });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      await service.editReceiveParcel({
        receive_id: 0,
        admin_id: 1,
        sc_id: 1,
        order_id: 7,
        sy_year: 3,
        title: 't',
        receive_date: '2026-05-01',
        cart: [],
        cart_receive_del: [{ rp_id: 22 }],
      } as any);
      expect(delDetail.del).toBe(1);
    });
  });

  // ─── removeReceiveParcel ─────────────────────────────────────────────────
  describe('removeReceiveParcel', () => {
    it('ไม่พบ → flag: false', async () => {
      receiveOrderRepo.findOne.mockResolvedValue(null);
      const result = await service.removeReceiveParcel(99);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการรับพัสดุ' });
    });

    it('inspection ลงสต็อกแล้ว (stockPosted=1) → ลบไม่ได้ (M5)', async () => {
      receiveOrderRepo.findOne.mockResolvedValue({ receiveId: 1, orderId: 7, del: 0 });
      inspectionRepo.findOne.mockResolvedValue({ orderId: 7, stockPosted: 1, del: 0 });
      const result = await service.removeReceiveParcel(1);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ลงสต็อกแล้ว');
    });

    it('happy path → soft delete (del=1) flag: true', async () => {
      const receive: any = { receiveId: 1, orderId: 7, del: 0 };
      receiveOrderRepo.findOne.mockResolvedValue(receive);
      inspectionRepo.findOne.mockResolvedValue(null);
      const result = await service.removeReceiveParcel(1);
      expect(receive.del).toBe(1);
      expect(receiveOrderRepo.save).toHaveBeenCalledWith(receive);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── updateSupplieOrder ──────────────────────────────────────────────────
  describe('updateSupplieOrder', () => {
    it('ไม่พบ order → flag: false', async () => {
      parcelOrderRepo.findOne.mockResolvedValue(null);
      const result = await service.updateSupplieOrder({ order_id: 99 } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลคำสั่งซื้อ' });
    });

    it('happy path → set order_status, remark, due_date', async () => {
      const order: any = { orderId: 7, del: 0 };
      parcelOrderRepo.findOne.mockResolvedValue(order);
      const result = await service.updateSupplieOrder({
        order_id: 7,
        order_status: 7,
        remark: 'ok',
        due_date: '2026-06-30',
      } as any);
      expect(order.orderStatus).toBe(7);
      expect(order.remark).toBe('ok');
      expect(order.dueDate).toBeInstanceOf(Date);
      expect(result).toEqual({ flag: true });
    });

    it('ไม่ส่งฟิลด์ → ไม่แตะ field เดิม', async () => {
      const order: any = { orderId: 7, del: 0, orderStatus: 4, remark: 'เดิม' };
      parcelOrderRepo.findOne.mockResolvedValue(order);
      await service.updateSupplieOrder({ order_id: 7 } as any);
      expect(order.orderStatus).toBe(4);
      expect(order.remark).toBe('เดิม');
    });
  });

  // ─── confirmReceiveParcel (ยืนยันรับ = trans_in / เพิ่ม stock) ───────────
  describe('confirmReceiveParcel', () => {
    it('ไม่พบ receive → flag: false', async () => {
      const em = makeEm();
      em.findOne.mockResolvedValue(null);
      dataSource.transaction.mockImplementation((cb: any) => cb(em));
      const result = await service.confirmReceiveParcel({
        order: { receive_id: 99, receive_status: 2 },
        detail: [],
      } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการรับพัสดุ' });
    });

    it('รับเข้า (+) เพิ่ม balance: lastBalance + trans_in', async () => {
      const em = makeEm();
      const receive: any = { receiveId: 1, del: 0 };
      em.findOne.mockResolvedValue(receive);
      em.createQueryBuilder.mockReturnValue(makeTxQb({ transBalance: 50 }));
      em.save.mockImplementation((_e: any, x: any) => Promise.resolve(x));
      const created: any[] = [];
      em.create.mockImplementation((_e: any, x: any) => {
        created.push(x);
        return x;
      });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.confirmReceiveParcel({
        order: { receive_id: 1, receive_status: 2 },
        detail: [{ supp_id: 5, trans_in: 30 }],
      } as any);

      const tx = created.find((c) => c.transBalance !== undefined);
      expect(tx.transIn).toBe(30);
      expect(tx.transOut).toBe(0);
      expect(tx.transBalance).toBe(80); // 50 + 30
      expect(result).toEqual({ flag: true });
    });

    it('ไม่มี transaction เดิม → เริ่มจาก 0', async () => {
      const em = makeEm();
      em.findOne.mockResolvedValue({ receiveId: 1, del: 0 });
      em.createQueryBuilder.mockReturnValue(makeTxQb(null));
      const created: any[] = [];
      em.create.mockImplementation((_e: any, x: any) => {
        created.push(x);
        return x;
      });
      em.save.mockImplementation((_e: any, x: any) => Promise.resolve(x));
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      await service.confirmReceiveParcel({
        order: { receive_id: 1, receive_status: 2 },
        detail: [{ supp_id: 5, trans_in: 25 }],
      } as any);
      const tx = created.find((c) => c.transBalance !== undefined);
      expect(tx.transBalance).toBe(25);
    });

    it('confirmWithDrawParcel (alias) → เรียก confirmReceiveParcel', async () => {
      const spy = jest.spyOn(service, 'confirmReceiveParcel').mockResolvedValue({ flag: true } as any);
      await service.confirmWithDrawParcel({ order: { receive_id: 1 }, detail: [] } as any);
      expect(spy).toHaveBeenCalled();
    });
  });
});
