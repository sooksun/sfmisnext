import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { BankReconciliationItem } from './entities/bank-reconciliation-item.entity';
import { Admin } from '../admin/entities/admin.entity';

describe('BankReconciliationService', () => {
  let service: BankReconciliationService;
  let reconRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;

  beforeEach(async () => {
    reconRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    adminRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankReconciliationService,
        {
          provide: getRepositoryToken(BankReconciliation),
          useValue: reconRepo,
        },
        {
          provide: getRepositoryToken(BankReconciliationItem),
          useValue: itemRepo,
        },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
      ],
    }).compile();

    service = module.get(BankReconciliationService);
  });

  // ─── loadReconciliations ────────────────────────────────────────────────────
  describe('loadReconciliations', () => {
    it('filter scId, baId, del=0 + order reconMonth DESC', async () => {
      reconRepo.find.mockResolvedValue([]);
      await service.loadReconciliations(5, 2);
      expect(reconRepo.find).toHaveBeenCalledWith({
        where: { scId: 5, baId: 2, del: 0 },
        order: { reconMonth: 'DESC' },
      });
    });

    it('map field + แปลง is_balanced เป็น boolean', async () => {
      reconRepo.find.mockResolvedValue([
        {
          brId: 1,
          scId: 5,
          baId: 2,
          reconMonth: '2026-05',
          bookBalance: 1000,
          bankStatementBalance: 1000,
          adjustmentTotal: 0,
          adjustedBookBalance: 1000,
          difference: 0,
          isBalanced: 1,
          note: null,
          signedBy: null,
          signedName: null,
          signedAt: null,
          createDate: null,
        },
      ]);
      const [row] = await service.loadReconciliations(5, 2);
      expect(row.br_id).toBe(1);
      expect(row.is_balanced).toBe(true);
    });
  });

  // ─── loadDetail ─────────────────────────────────────────────────────────────
  describe('loadDetail', () => {
    it('ไม่พบ recon → คืน null', async () => {
      reconRepo.findOne.mockResolvedValue(null);
      const result = await service.loadDetail(99);
      expect(result).toBeNull();
    });

    it('happy path — map recon + items + item_type_name', async () => {
      reconRepo.findOne.mockResolvedValue({
        brId: 1,
        scId: 5,
        baId: 2,
        reconMonth: '2026-05',
        bookBalance: 1000,
        bankStatementBalance: 900,
        adjustmentTotal: -100,
        adjustedBookBalance: 900,
        difference: 0,
        isBalanced: 1,
        note: 'ok',
        signedName: null,
        signedAt: null,
      });
      itemRepo.find.mockResolvedValue([
        {
          briId: 1,
          brId: 1,
          itemType: 1,
          docRef: 'CHK-001',
          detail: 'เช็คค้าง',
          amount: -100,
        },
      ]);
      const result = await service.loadDetail(1);
      expect(result?.is_balanced).toBe(true);
      expect(result?.items[0].item_type_name).toBe('เช็คค้างขึ้น');
      expect(result?.items[0].amount).toBe(-100);
    });

    it('item_type ที่ไม่รู้จัก → item_type_name เป็น empty string', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 1, isBalanced: 0 });
      itemRepo.find.mockResolvedValue([
        {
          briId: 1,
          brId: 1,
          itemType: 99,
          docRef: null,
          detail: null,
          amount: 0,
        },
      ]);
      const result = await service.loadDetail(1);
      expect(result?.items[0].item_type_name).toBe('');
    });
  });

  // ─── createOrUpdate ─────────────────────────────────────────────────────────
  describe('createOrUpdate', () => {
    const dto = {
      sc_id: 1,
      ba_id: 2,
      recon_month: '2026-05',
      book_balance: 1000,
      bank_statement_balance: 1000,
      note: 'ทดสอบ',
      up_by: 7,
    };

    it('ไม่มี recon เดิม → สร้างใหม่ (create ถูกเรียก)', async () => {
      reconRepo.findOne.mockResolvedValue(null);
      itemRepo.find.mockResolvedValue([]);
      const result = await service.createOrUpdate(dto);
      expect(reconRepo.create).toHaveBeenCalled();
      expect(result.flag).toBe(true);
    });

    it('มี recon เดิม → ไม่ create ใหม่ ใช้ของเดิม', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5, scId: 1, baId: 2 });
      itemRepo.find.mockResolvedValue([]);
      const result = await service.createOrUpdate(dto);
      expect(reconRepo.create).not.toHaveBeenCalled();
      expect(result.br_id).toBe(5);
    });

    it('recompute: ยอดสมุด=bank, ไม่มี item → balanced (difference=0)', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([]);
      await service.createOrUpdate(dto);
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.adjustmentTotal).toBe(0);
      expect(saved.adjustedBookBalance).toBe(1000);
      expect(saved.difference).toBe(0);
      expect(saved.isBalanced).toBe(1);
    });

    it('เช็คค้างขึ้น (type 1) → หักยอดธนาคาร: bank 1100 − เช็ค 100 = book 1000 → balanced', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([{ itemType: 1, amount: 100, del: 0 }]);
      await service.createOrUpdate({
        ...dto,
        book_balance: 1000,
        bank_statement_balance: 1100,
      });
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.adjustmentTotal).toBe(-100);
      expect(saved.adjustedBookBalance).toBe(1000);
      expect(saved.difference).toBe(0);
      expect(saved.isBalanced).toBe(1);
    });

    it('เงินฝากระหว่างทาง (type 2) → บวกยอดธนาคาร: bank 900 + 100 = book 1000 → balanced', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([{ itemType: 2, amount: 100, del: 0 }]);
      await service.createOrUpdate({
        ...dto,
        book_balance: 1000,
        bank_statement_balance: 900,
      });
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.adjustmentTotal).toBe(100);
      expect(saved.adjustedBookBalance).toBe(1000);
      expect(saved.isBalanced).toBe(1);
    });

    it('กรอกค่าติดลบไว้ (ข้อมูลเดิม) → ใช้ Math.abs ผลเท่ากับค่าบวก', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([{ itemType: 1, amount: -100, del: 0 }]);
      await service.createOrUpdate({
        ...dto,
        book_balance: 1000,
        bank_statement_balance: 1100,
      });
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.adjustmentTotal).toBe(-100);
      expect(saved.isBalanced).toBe(1);
    });

    it('recompute: ยอดไม่ตรง → isBalanced=0 + difference != 0', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([]);
      await service.createOrUpdate({
        ...dto,
        book_balance: 1000,
        bank_statement_balance: 800,
      });
      const saved = reconRepo.save.mock.calls[0][0];
      // difference = ยอดธนาคารหลังปรับ (800) − book (1000) = −200
      expect(saved.difference).toBe(-200);
      expect(saved.isBalanced).toBe(0);
    });

    it('item ที่ del=1 ไม่ถูกนำมาคำนวณ adjustmentTotal', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([
        { itemType: 1, amount: 100, del: 0 },
        { itemType: 1, amount: 500, del: 1 }, // ถูกลบ — ต้องไม่นับ
      ]);
      await service.createOrUpdate({
        ...dto,
        book_balance: 1000,
        bank_statement_balance: 1100,
      });
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.adjustmentTotal).toBe(-100);
    });

    it('งบที่ลงนามแล้ว → ปฏิเสธการแก้ไข (flag:false, ไม่ save)', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5, signedAt: new Date() });
      const result = await service.createOrUpdate(dto);
      expect(result.flag).toBe(false);
      expect(reconRepo.save).not.toHaveBeenCalled();
    });

    it('note เป็น optional → null ได้', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5 });
      itemRepo.find.mockResolvedValue([]);
      const { note, ...noNote } = dto;
      await service.createOrUpdate(noNote);
      const saved = reconRepo.save.mock.calls[0][0];
      expect(saved.note).toBeNull();
    });
  });

  // ─── addItem ────────────────────────────────────────────────────────────────
  describe('addItem', () => {
    const dto = {
      br_id: 5,
      item_type: 1,
      doc_ref: 'CHK-1',
      detail: 'เช็คค้าง',
      amount: 100,
      up_by: 7,
    };

    it('ไม่พบ recon → flag: false', async () => {
      reconRepo.findOne.mockResolvedValue(null);
      const result = await service.addItem(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการงบเทียบยอด' });
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('งบที่ลงนามแล้ว → flag:false ไม่บันทึก item', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5, signedAt: new Date() });
      const result = await service.addItem(dto);
      expect(result.flag).toBe(false);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → บันทึก item + recompute recon', async () => {
      const recon = { brId: 5, bookBalance: 1000, bankStatementBalance: 1100 };
      reconRepo.findOne.mockResolvedValue(recon);
      itemRepo.find.mockResolvedValue([{ itemType: 1, amount: 100, del: 0 }]);
      const result = await service.addItem(dto);
      expect(itemRepo.save).toHaveBeenCalled();
      expect(result.flag).toBe(true);
      // recon ถูก recompute (เช็คค้าง หักจากธนาคาร)
      const savedRecon = reconRepo.save.mock.calls[0][0];
      expect(savedRecon.adjustmentTotal).toBe(-100);
      expect(savedRecon.isBalanced).toBe(1);
    });

    it('เก็บ amount เป็นค่าบวกเสมอ (Math.abs) แม้ส่งค่าติดลบมา', async () => {
      reconRepo.findOne.mockResolvedValue({
        brId: 5,
        bookBalance: 0,
        bankStatementBalance: 0,
      });
      itemRepo.find.mockResolvedValue([]);
      await service.addItem({ ...dto, amount: -100 });
      const createdItem = itemRepo.create.mock.calls[0][0];
      expect(createdItem.brId).toBe(5);
      expect(createdItem.itemType).toBe(1);
      expect(createdItem.docRef).toBe('CHK-1');
      expect(createdItem.amount).toBe(100);
      expect(createdItem.del).toBe(0);
    });
  });

  // ─── removeItem ─────────────────────────────────────────────────────────────
  describe('removeItem', () => {
    it('ไม่พบ item → flag: false', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      const result = await service.removeItem(99, 7);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('soft delete item (del=1) + set upBy', async () => {
      const item = { briId: 1, brId: 5, del: 0, upBy: 0 };
      itemRepo.findOne.mockResolvedValue(item);
      reconRepo.findOne.mockResolvedValue({
        brId: 5,
        bookBalance: 1000,
        bankStatementBalance: 1000,
      });
      itemRepo.find.mockResolvedValue([]);
      const result = await service.removeItem(1, 7);
      expect(item.del).toBe(1);
      expect(item.upBy).toBe(7);
      expect(result.flag).toBe(true);
    });

    it('recompute recon หลังลบ item', async () => {
      itemRepo.findOne.mockResolvedValue({ briId: 1, brId: 5, del: 0 });
      const recon = { brId: 5, bookBalance: 1000, bankStatementBalance: 1000 };
      reconRepo.findOne.mockResolvedValue(recon);
      itemRepo.find.mockResolvedValue([]); // หลังลบ ไม่มี item เหลือ
      await service.removeItem(1, 7);
      const savedRecon = reconRepo.save.mock.calls[0][0];
      expect(savedRecon.adjustmentTotal).toBe(0);
      expect(savedRecon.difference).toBe(0);
    });

    it('ไม่พบ recon ของ item → ยัง flag: true (แค่ไม่ recompute)', async () => {
      itemRepo.findOne.mockResolvedValue({ briId: 1, brId: 5, del: 0 });
      reconRepo.findOne.mockResolvedValue(null);
      const result = await service.removeItem(1, 7);
      expect(result.flag).toBe(true);
      expect(reconRepo.save).not.toHaveBeenCalled();
    });

    it('งบที่ลงนามแล้ว → flag:false ไม่ลบ item', async () => {
      const item = { briId: 1, brId: 5, del: 0, upBy: 0 };
      itemRepo.findOne.mockResolvedValue(item);
      reconRepo.findOne.mockResolvedValue({ brId: 5, signedAt: new Date() });
      const result = await service.removeItem(1, 7);
      expect(result.flag).toBe(false);
      expect(item.del).toBe(0);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── signOff ────────────────────────────────────────────────────────────────
  describe('signOff', () => {
    const dto = { br_id: 5, signed_by: 7, note: 'ตรวจแล้ว' };

    it('ไม่พบ recon → flag: false', async () => {
      reconRepo.findOne.mockResolvedValue(null);
      const result = await service.signOff(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการ' });
    });

    it('ลงนามแล้ว (signedAt มีค่า) → flag: false', async () => {
      reconRepo.findOne.mockResolvedValue({ brId: 5, signedAt: new Date() });
      const result = await service.signOff(dto);
      expect(result).toEqual({
        flag: false,
        ms: 'ลงนามแล้ว ไม่สามารถแก้ไขได้',
      });
      expect(reconRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → set signedBy, signedName, signedAt + flag: true', async () => {
      const recon: any = { brId: 5, signedAt: null };
      reconRepo.findOne.mockResolvedValue(recon);
      adminRepo.findOne.mockResolvedValue({ adminId: 7, name: 'นาย ก' });
      const result = await service.signOff(dto);
      expect(recon.signedBy).toBe(7);
      expect(recon.signedName).toBe('นาย ก');
      expect(recon.signedAt).toBeInstanceOf(Date);
      expect(result.flag).toBe(true);
    });

    it('admin ไม่พบ → signedName เป็น null', async () => {
      const recon: any = { brId: 5, signedAt: null };
      reconRepo.findOne.mockResolvedValue(recon);
      adminRepo.findOne.mockResolvedValue(null);
      await service.signOff(dto);
      expect(recon.signedName).toBeNull();
    });

    it('admin มี username แต่ไม่มี name → ใช้ username', async () => {
      const recon: any = { brId: 5, signedAt: null };
      reconRepo.findOne.mockResolvedValue(recon);
      adminRepo.findOne.mockResolvedValue({
        adminId: 7,
        name: null,
        username: 'user7',
      });
      await service.signOff(dto);
      expect(recon.signedName).toBe('user7');
    });
  });
});
