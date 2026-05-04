import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeneralDbService } from './general-db.service';
import { Unit } from './entities/unit.entity';
import { TypeSupplies } from './entities/type-supplies.entity';
import { Partner } from './entities/partner.entity';
import { MainRegister } from './entities/main-register.entity';
import { Supplies } from '../supplie/entities/supplies.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';

describe('GeneralDbService', () => {
  let service: GeneralDbService;
  let unitRepo: jest.Mocked<any>;
  let tsRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let mainRegRepo: jest.Mocked<any>;
  let suppliesRepo: jest.Mocked<any>;
  let transRepo: jest.Mocked<any>;
  let deleteLog: jest.Mocked<Pick<DeleteLogService, 'log'>>;

  beforeEach(async () => {
    unitRepo = { findAndCount: jest.fn(), findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
    tsRepo = { findAndCount: jest.fn(), findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
    partnerRepo = { findAndCount: jest.fn(), findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
    mainRegRepo = { find: jest.fn() };
    suppliesRepo = { findAndCount: jest.fn(), findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
    transRepo = { findAndCount: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    deleteLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralDbService,
        { provide: getRepositoryToken(Unit), useValue: unitRepo },
        { provide: getRepositoryToken(TypeSupplies), useValue: tsRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(MainRegister), useValue: mainRegRepo },
        { provide: getRepositoryToken(Supplies), useValue: suppliesRepo },
        { provide: getRepositoryToken(TransactionSupplies), useValue: transRepo },
        { provide: DeleteLogService, useValue: deleteLog },
      ],
    }).compile();

    service = module.get(GeneralDbService);
  });

  // ─── loadUnits ────────────────────────────────────────────────────────────────
  describe('loadUnits', () => {
    it('filter scId และ uStatus=1 (active)', async () => {
      unitRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.loadUnits(5, 0, 25);
      expect(unitRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 5, uStatus: 1 } }),
      );
    });

    it('pagination: skip = page * pageSize', async () => {
      unitRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.loadUnits(1, 2, 10);
      expect(unitRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('คืน { data, count, page, pageSize }', async () => {
      unitRepo.findAndCount.mockResolvedValue([[{ unId: 1, unName: 'ชิ้น', scId: 5, uStatus: 1, upBy: 0, createDate: null, updateDate: null }], 1]);
      const result = await service.loadUnits(5, 0, 25);
      expect(result.count).toBe(1);
      expect(result.data[0].un_name).toBe('ชิ้น');
    });
  });

  // ─── addUnit ─────────────────────────────────────────────────────────────────
  describe('addUnit', () => {
    it('บันทึก unit และคืน flag: true', async () => {
      unitRepo.save.mockResolvedValue({});
      const result = await service.addUnit({ un_name: 'ชิ้น', sc_id: 1, up_by: 5 });
      expect(unitRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });
  });

  // ─── updateUnit ───────────────────────────────────────────────────────────────
  describe('updateUnit', () => {
    it('ไม่พบ unit (uStatus≠1) → flag: false', async () => {
      unitRepo.findOne.mockResolvedValue(null);
      const result = await service.updateUnit({ un_id: 999, un_name: 'test' });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('happy path → อัปเดตและคืน flag: true', async () => {
      const unit = { unId: 1, unName: 'เดิม', uStatus: 1 };
      unitRepo.findOne.mockResolvedValue(unit);
      unitRepo.save.mockResolvedValue(unit);

      const result = await service.updateUnit({ un_id: 1, un_name: 'ใหม่' });
      expect(result.flag).toBe(true);
      expect(unit.unName).toBe('ใหม่');
    });
  });

  // ─── removeUnit ───────────────────────────────────────────────────────────────
  describe('removeUnit', () => {
    it('ไม่พบ unit → flag: false', async () => {
      unitRepo.findOne.mockResolvedValue(null);
      const result = await service.removeUnit(999);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('soft delete (uStatus=0) และ log การลบ', async () => {
      const unit = { unId: 1, uStatus: 1, scId: 3 };
      unitRepo.findOne.mockResolvedValue(unit);
      unitRepo.save.mockResolvedValue(unit);
      deleteLog.log.mockResolvedValue(undefined);

      await service.removeUnit(1, 'ทดสอบ', 7);
      expect(unit.uStatus).toBe(0);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'tb_unit', rowId: 1 }),
      );
    });
  });

  // ─── loadTypeSupplies ─────────────────────────────────────────────────────────
  describe('loadTypeSupplies', () => {
    it('filter scId และ del=0', async () => {
      tsRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.loadTypeSupplies(3, 0, 25);
      expect(tsRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 3, del: 0 } }),
      );
    });
  });

  // ─── removeTypeSupplie ────────────────────────────────────────────────────────
  describe('removeTypeSupplie', () => {
    it('soft delete (del=1) และ log', async () => {
      const ts = { tsId: 1, del: 0, scId: 1 };
      tsRepo.findOne.mockResolvedValue(ts);
      tsRepo.save.mockResolvedValue(ts);
      deleteLog.log.mockResolvedValue(undefined);

      await service.removeTypeSupplie(1);
      expect(ts.del).toBe(1);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'tb_type_supplies' }),
      );
    });
  });

  // ─── loadPartners ─────────────────────────────────────────────────────────────
  describe('loadPartners', () => {
    it('filter scId และ del=0 และ paginate', async () => {
      partnerRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.loadPartners(2, 1, 10);
      expect(partnerRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 2, del: 0 }, skip: 10, take: 10 }),
      );
    });
  });

  // ─── removePartner ────────────────────────────────────────────────────────────
  describe('removePartner', () => {
    it('ไม่พบ partner → flag: false', async () => {
      partnerRepo.findOne.mockResolvedValue(null);
      const result = await service.removePartner(999);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('soft delete (del=1) และ log', async () => {
      const partner = { pId: 1, del: 0, scId: 2 };
      partnerRepo.findOne.mockResolvedValue(partner);
      partnerRepo.save.mockResolvedValue(partner);
      deleteLog.log.mockResolvedValue(undefined);

      await service.removePartner(1, 'ลบทดสอบ', 5);
      expect(partner.del).toBe(1);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'tb_partner', rowId: 1, reason: 'ลบทดสอบ' }),
      );
    });
  });

  // ─── loadSupplies ─────────────────────────────────────────────────────────────
  describe('loadSupplies', () => {
    it('filter scId และ del=0', async () => {
      suppliesRepo.findAndCount.mockResolvedValue([[], 0]);
      tsRepo.find.mockResolvedValue([]);
      unitRepo.find.mockResolvedValue([]);
      await service.loadSupplies(4, 0, 25);
      expect(suppliesRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 4, del: 0 } }),
      );
    });
  });

  // ─── fixSupplies ─────────────────────────────────────────────────────────────
  describe('fixSupplies', () => {
    it('คำนวณ balance จาก lastBalance + in - out', async () => {
      transRepo.findOne.mockResolvedValue({ transBalance: 100 });
      transRepo.save.mockResolvedValue({});

      await service.fixSupplies({ supp_id: 1, trans_in: 50, trans_out: 30 });

      const saved = transRepo.save.mock.calls[0][0];
      expect(saved.transBalance).toBe(120); // 100 + 50 - 30
      expect(saved.transIn).toBe(50);
      expect(saved.transOut).toBe(30);
    });

    it('balance = 0 ถ้าไม่มี last transaction', async () => {
      transRepo.findOne.mockResolvedValue(null);
      transRepo.save.mockResolvedValue({});

      await service.fixSupplies({ supp_id: 1, trans_in: 10, trans_out: 0 });
      const saved = transRepo.save.mock.calls[0][0];
      expect(saved.transBalance).toBe(10);
    });
  });
});
