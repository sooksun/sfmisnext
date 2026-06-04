import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankService } from './bank.service';
import { BankAccount } from './entities/bankaccount.entity';
import { BankDb } from './entities/bank-db.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';

describe('BankService', () => {
  let service: BankService;
  let bankAccountRepo: jest.Mocked<any>;
  let bankDbRepo: jest.Mocked<any>;
  let budgetSchoolRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let deleteLog: jest.Mocked<Pick<DeleteLogService, 'log'>>;

  beforeEach(async () => {
    bankAccountRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };
    bankDbRepo = { find: jest.fn() };
    budgetSchoolRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };
    budgetTypeRepo = { find: jest.fn() };
    deleteLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        { provide: getRepositoryToken(BankAccount), useValue: bankAccountRepo },
        { provide: getRepositoryToken(BankDb), useValue: bankDbRepo },
        {
          provide: getRepositoryToken(BudgetIncomeTypeSchool),
          useValue: budgetSchoolRepo,
        },
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        { provide: DeleteLogService, useValue: deleteLog },
      ],
    }).compile();

    service = module.get(BankService);
  });

  // ─── loadBankAccount ─────────────────────────────────────────────────────────
  describe('loadBankAccount', () => {
    it('filter scId และ del=0', async () => {
      bankAccountRepo.find.mockResolvedValue([]);
      await service.loadBankAccount(3);
      expect(bankAccountRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 3, del: 0 } }),
      );
    });

    it('join bank name จาก bankMap ถูกต้อง', async () => {
      bankAccountRepo.find.mockResolvedValue([
        {
          baId: 1,
          bId: 10,
          baName: 'บัญชีหลัก',
          baNo: '123-456',
          scId: 3,
          upBy: 0,
          del: 0,
          createDate: null,
          updateDate: null,
        },
      ]);
      bankDbRepo.find.mockResolvedValue([
        { bId: 10, bNameL: 'ธนาคารกรุงไทย', bNameS: 'KTB' },
      ]);

      const result = await service.loadBankAccount(3);
      expect(result[0].bank_name).toBe('ธนาคารกรุงไทย');
      expect(result[0].account_no).toBe('123-456');
    });

    it('bank_name เป็น empty string ถ้าไม่พบใน bank map', async () => {
      bankAccountRepo.find.mockResolvedValue([
        {
          baId: 1,
          bId: 99,
          baName: 'บัญชี',
          baNo: '000',
          scId: 3,
          upBy: 0,
          del: 0,
          createDate: null,
          updateDate: null,
        },
      ]);
      bankDbRepo.find.mockResolvedValue([]); // ไม่มีธนาคารในระบบ

      const [row] = await service.loadBankAccount(3);
      expect(row.bank_name).toBe('');
    });

    it('ไม่เรียก bankDbRepo ถ้าไม่มี accounts', async () => {
      bankAccountRepo.find.mockResolvedValue([]);
      await service.loadBankAccount(1);
      expect(bankDbRepo.find).not.toHaveBeenCalled();
    });

    it('ไม่ fetch bank ถ้า bId = 0 ทุก account', async () => {
      bankAccountRepo.find.mockResolvedValue([
        {
          baId: 1,
          bId: 0,
          baName: 'test',
          baNo: '000',
          scId: 1,
          upBy: 0,
          del: 0,
          createDate: null,
          updateDate: null,
        },
      ]);
      await service.loadBankAccount(1);
      expect(bankDbRepo.find).not.toHaveBeenCalled();
    });
  });

  // ─── loadBankDB ──────────────────────────────────────────────────────────────
  describe('loadBankDB', () => {
    it('คืน bank list ถูกต้อง', async () => {
      bankDbRepo.find.mockResolvedValue([
        { bId: 1, bNameL: 'กรุงไทย', bNameS: 'KTB', bImg: 'img.png' },
      ]);
      const result = await service.loadBankDB();
      expect(result[0]).toEqual({
        b_id: 1,
        b_name_l: 'กรุงไทย',
        b_name_s: 'KTB',
        b_img: 'img.png',
      });
    });
  });

  // ─── checkBindingBankAccount ─────────────────────────────────────────────────
  describe('checkBindingBankAccount', () => {
    it('นับ budget_income_type_school ของ scId ที่ไม่ del', async () => {
      budgetSchoolRepo.count.mockResolvedValue(3);
      const count = await service.checkBindingBankAccount(5);
      expect(budgetSchoolRepo.count).toHaveBeenCalledWith({
        where: { scId: 5, del: 0 },
      });
      expect(count).toBe(3);
    });
  });

  // ─── addBankAccount ──────────────────────────────────────────────────────────
  describe('addBankAccount', () => {
    it('สร้าง account และคืน flag: true', async () => {
      const dto = {
        b_id: 1,
        ba_name: 'บัญชีหลัก',
        ba_no: '111-222',
        sc_id: 3,
        up_by: 5,
      };
      const entity = {};
      bankAccountRepo.create.mockReturnValue(entity);
      bankAccountRepo.save.mockResolvedValue(entity);

      const result = await service.addBankAccount(dto);
      expect(bankAccountRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── updateBankAccount ────────────────────────────────────────────────────────
  describe('updateBankAccount', () => {
    it('ไม่มี ba_id → flag: false', async () => {
      const result = await service.updateBankAccount({
        b_id: 1,
        ba_name: 'test',
        ba_no: '000',
        sc_id: 1,
      } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ ba_id' });
    });

    it('ไม่พบ account → flag: false', async () => {
      bankAccountRepo.findOne.mockResolvedValue(null);
      const result = await service.updateBankAccount({
        ba_id: 999,
        b_id: 1,
        ba_name: 'test',
        ba_no: '000',
        sc_id: 1,
      });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลบัญชีธนาคาร' });
    });

    it('happy path → บันทึกสำเร็จ flag: true', async () => {
      const account = { baId: 1, del: 0 };
      bankAccountRepo.findOne.mockResolvedValue(account);
      bankAccountRepo.save.mockResolvedValue(account);

      const result = await service.updateBankAccount({
        ba_id: 1,
        b_id: 2,
        ba_name: 'ใหม่',
        ba_no: '999',
        sc_id: 1,
      });
      expect(result).toEqual({ flag: true });
      expect(account).toMatchObject({ bId: 2, baName: 'ใหม่', baNo: '999' });
    });
  });

  // ─── removeBankAccount ────────────────────────────────────────────────────────
  describe('removeBankAccount', () => {
    it('ไม่พบ account → flag: false', async () => {
      bankAccountRepo.findOne.mockResolvedValue(null);
      const result = await service.removeBankAccount(999);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลบัญชีธนาคาร' });
    });

    it('soft delete (del=1) และ log การลบ', async () => {
      const account = { baId: 1, scId: 3, del: 0 };
      bankAccountRepo.findOne.mockResolvedValue(account);
      bankAccountRepo.save.mockResolvedValue(account);
      deleteLog.log.mockResolvedValue(undefined);

      const result = await service.removeBankAccount(1, 'ทดสอบ', 5);
      expect(account.del).toBe(1);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'tb_bankaccount',
          rowId: 1,
          reason: 'ทดสอบ',
        }),
      );
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── addBudgetSchool ─────────────────────────────────────────────────────────
  describe('addBudgetSchool', () => {
    const dto = { sc_id: 1, ba_id: 2, bg_type_id: 3, up_by: 5 };

    it('สร้าง binding ใหม่ถ้ายังไม่มี', async () => {
      budgetSchoolRepo.findOne.mockResolvedValue(null);
      const entity = {};
      budgetSchoolRepo.create.mockReturnValue(entity);
      budgetSchoolRepo.save.mockResolvedValue(entity);

      const result = await service.addBudgetSchool(dto);
      expect(budgetSchoolRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ flag: true });
    });

    it('ถ้ามีอยู่แล้ว (duplicate) → return flag: true โดยไม่ duplicate', async () => {
      budgetSchoolRepo.findOne.mockResolvedValue({
        bgTypeSchoolId: 10,
        upBy: 0,
      });
      budgetSchoolRepo.save.mockResolvedValue({});

      const result = await service.addBudgetSchool({
        ...dto,
        bg_type_school_id: 0,
      });
      // bg_type_school_id <= 0 → ไม่อัปเดต แต่ก็ return true
      expect(result).toEqual({ flag: true });
    });

    it('ถ้ามีอยู่แล้วและ bg_type_school_id > 0 → อัปเดต upBy', async () => {
      const existing = { bgTypeSchoolId: 5, upBy: 0 };
      budgetSchoolRepo.findOne.mockResolvedValue(existing);
      budgetSchoolRepo.save.mockResolvedValue(existing);

      await service.addBudgetSchool({ ...dto, bg_type_school_id: 5 });
      expect(existing.upBy).toBe(5);
      expect(budgetSchoolRepo.save).toHaveBeenCalled();
    });
  });
});
