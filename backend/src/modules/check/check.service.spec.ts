import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CheckService } from './check.service';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { CheckReceiveCommittee } from './entities/check-receive-committee.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';

// ─── QueryBuilder mock factory ─────────────────────────────────────────────────
function makeQb(result?: unknown) {
  const qb: Record<string, jest.Mock> = {};
  ['leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb as any)),
  );
  qb['getRawMany'] = jest.fn().mockResolvedValue(result ?? []);
  qb['getOne'] = jest.fn().mockResolvedValue(result ?? null);
  return qb;
}

// ─── Transaction EntityManager mock ───────────────────────────────────────────
function makeTransactionEm({
  check = null,
  committee = null,
  ftExists = 0,
}: {
  check?: any;
  committee?: any;
  ftExists?: number;
} = {}) {
  const checkRepo = {
    findOne: jest.fn().mockResolvedValue(check),
    save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
  };
  const committeeRepo = { findOne: jest.fn().mockResolvedValue(committee) };
  const ftRepo = {
    count: jest.fn().mockResolvedValue(ftExists),
    create: jest.fn().mockReturnValue({}),
    save: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };

  const em = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === RequestWithdraw) return checkRepo;
      if (entity === CheckReceiveCommittee) return committeeRepo;
      if (entity === FinancialTransactions) return ftRepo;
      return {};
    }),
  };

  return { em, checkRepo, committeeRepo, ftRepo };
}

describe('CheckService', () => {
  let service: CheckService;
  let rwRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let bgTypeRepo: jest.Mocked<any>;
  let committeeRepo: jest.Mocked<any>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction' | 'getRepository'>>;
  let financialAuditService: jest.Mocked<Pick<FinancialAuditService, 'isDateLocked'>>;

  beforeEach(async () => {
    rwRepo = { createQueryBuilder: jest.fn(), find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    partnerRepo = { find: jest.fn(), findOne: jest.fn() };
    adminRepo = { find: jest.fn() };
    bgTypeRepo = { find: jest.fn() };
    committeeRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(5000) };
    dataSource = {
      transaction: jest.fn(),
      getRepository: jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue({}) }),
    };
    financialAuditService = { isDateLocked: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckService,
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: bgTypeRepo },
        { provide: getRepositoryToken(CheckReceiveCommittee), useValue: committeeRepo },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
        { provide: FinancialAuditService, useValue: financialAuditService },
      ],
    }).compile();

    service = module.get(CheckService);
  });

  // ─── loadCheck ───────────────────────────────────────────────────────────────
  describe('loadCheck', () => {
    it('filter scId, syId, del=0 และ status IN (200,201,202)', async () => {
      const qb = makeQb([]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      await service.loadCheck(1, 3);

      expect(qb.where).toHaveBeenCalledWith('rw.sc_id = :scId', { scId: 1 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.sy_id = :syId', { syId: 3 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.del = 0');
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status IN (:...statuses)', { statuses: [200, 201, 202] });
    });

    it('แปลง amount null → 0 และ null fields → empty string', async () => {
      const qb = makeQb([{ rw_id: 1, amount: null, partner_name: null, budget_type_name: null }]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadCheck(1, 3);
      expect(row.amount).toBe(0);
      expect(row.partner_name).toBe('');
      expect(row.budget_type_name).toBe('');
    });
  });

  // ─── loadUser ────────────────────────────────────────────────────────────────
  describe('loadUser', () => {
    it('filter scId และ del=0', async () => {
      adminRepo.find.mockResolvedValue([]);
      await service.loadUser(7);
      expect(adminRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 7, del: 0 } }),
      );
    });

    it('ไม่ return password ใน response', async () => {
      adminRepo.find.mockResolvedValue([{ adminId: 1, name: 'test', username: 'u', email: 'e', type: 2, scId: 1, passwordDefault: 'secret' }]);
      const [row] = await service.loadUser(1);
      expect((row as any).password).toBeUndefined();
      expect((row as any).passwordDefault).toBeUndefined();
    });
  });

  // ─── loadCheckById ────────────────────────────────────────────────────────────
  describe('loadCheckById', () => {
    it('ไม่พบ check → คืน []', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.loadCheckById(1, 3, 999);
      expect(result).toEqual([]);
    });

    it('cross-tenant isolation — query ใช้ scId และ syId ที่ส่งมา', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.loadCheckById(55, 7, 1);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ scId: 55, syId: 7, del: 0 }) }),
      );
    });

    it('happy path — คำนวณ WHT และคืน 1 record', async () => {
      const check = { rwId: 1, scId: 1, syId: 3, pId: 10, amount: 10000, del: 0, paymentType: 1, bgTypeId: 2, rwType: 3, orderId: 0, noDoc: 'D-001', certificatePayment: 1, dateRequest: null, userRequestHead: 0, userRequest: 1, userOfferCheck: 0, receiptNumber: null, receiptPicture: null, offerCheckDate: null, checkNoDoc: null, typeOfferCheck: 0, status: 200, remark: null, syId2: 3, year: '2569', upBy: 0, createDate: null, updateDate: null };
      rwRepo.findOne.mockResolvedValue(check);
      partnerRepo.findOne.mockResolvedValue({ pId: 10, calVat: 2, del: 0 });

      const result = await service.loadCheckById(1, 3, 1);
      expect(result).toHaveLength(1);
      expect(result[0].rw_id).toBe(1);
      expect(result[0].amount).toBeDefined();
    });
  });

  // ─── cancelCheck ─────────────────────────────────────────────────────────────
  describe('cancelCheck', () => {
    it('ไม่พบ check → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.cancelCheck(999, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลเช็ค' });
    });

    it('cross-tenant isolation — findOne ใช้ scId', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.cancelCheck(1, 77);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ scId: 77, del: 0 }) }),
      );
    });

    it('วันที่ถูกล็อก → flag: false', async () => {
      const check = { rwId: 1, scId: 1, del: 0, offerCheckDate: new Date('2026-04-01'), dateRequest: null };
      rwRepo.findOne.mockResolvedValue(check);
      financialAuditService.isDateLocked.mockResolvedValue(true);

      const result = await service.cancelCheck(1, 1);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ถูกลงนามแล้ว');
    });

    it('happy path → status=201, del=1, flag: true', async () => {
      const check = { rwId: 1, scId: 1, del: 0, status: 202, offerCheckDate: null, dateRequest: new Date('2026-05-01') };
      rwRepo.findOne.mockResolvedValue(check);
      rwRepo.save.mockResolvedValue(check);
      dataSource.getRepository = jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue({}) });
      financialAuditService.isDateLocked.mockResolvedValue(false);

      const result = await service.cancelCheck(1, 1);
      expect(check.status).toBe(201);
      expect(check.del).toBe(1);
      expect(result).toEqual({ flag: true, ms: 'ยกเลิกเช็คเรียบร้อยแล้ว' });
    });
  });

  // ─── updateCheck ─────────────────────────────────────────────────────────────
  describe('updateCheck', () => {
    const baseDto = { rw_id: 1, status: 200 };

    it('ไม่พบ check ใน transaction → flag: false', async () => {
      const { em } = makeTransactionEm({ check: null });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.updateCheck(baseDto as any, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลเช็ค' });
    });

    it('status=202 + amount >= threshold (5000) + ไม่มี committee → block', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 10000, status: 200 };
      const { em } = makeTransactionEm({ check, committee: null });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.updateCheck({ rw_id: 1, status: 202 } as any, 1);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('คณะกรรมการตรวจรับ');
    });

    it('status=202 + amount >= threshold + มี committee (member1Name) → ผ่าน', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 10000, status: 200, bgTypeId: 1, syId: 1, typeOfferCheck: 1, offerCheckDate: null };
      const committee = { member1Name: 'นาย ก', del: 0 };
      const { em, checkRepo, ftRepo } = makeTransactionEm({ check, committee, ftExists: 0 });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.updateCheck({ rw_id: 1, status: 202, offer_check_date: '2026-05-01' } as any, 1);
      expect(result).toEqual({ flag: true });
    });

    it('status=202 + amount < threshold → ผ่านโดยไม่ต้องเช็ค committee', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 1000, status: 200, bgTypeId: 1, syId: 1, typeOfferCheck: 1, offerCheckDate: null };
      const { em, ftRepo } = makeTransactionEm({ check, ftExists: 0 });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      const result = await service.updateCheck({ rw_id: 1, status: 202 } as any, 1);
      expect(result).toEqual({ flag: true });
    });

    it('สร้าง financial_transaction เมื่อ status เปลี่ยนเป็น 202', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 1000, status: 200, bgTypeId: 1, syId: 1, typeOfferCheck: 1, offerCheckDate: null };
      const { em, ftRepo } = makeTransactionEm({ check, ftExists: 0 });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      await service.updateCheck({ rw_id: 1, status: 202 } as any, 1);
      expect(ftRepo.save).toHaveBeenCalled();
    });

    it('ไม่ duplicate FT ถ้ามีอยู่แล้ว (ftExists > 0)', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 1000, status: 200, bgTypeId: 1, syId: 1, typeOfferCheck: 1, offerCheckDate: null };
      const { em, ftRepo } = makeTransactionEm({ check, ftExists: 1 });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      await service.updateCheck({ rw_id: 1, status: 202 } as any, 1);
      expect(ftRepo.save).not.toHaveBeenCalled(); // ไม่สร้างซ้ำ
    });

    it('ยกเลิกออกเช็ค (prevStatus=202 → status≠202) → soft-delete FT', async () => {
      const check = { rwId: 1, scId: 1, del: 0, amount: 1000, status: 202, bgTypeId: 1, syId: 1, typeOfferCheck: 1, offerCheckDate: null };
      const { em, ftRepo } = makeTransactionEm({ check });
      dataSource.transaction.mockImplementation((cb: any) => cb(em));

      await service.updateCheck({ rw_id: 1, status: 200 } as any, 1);
      expect(ftRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ rwId: 1, type: -1, del: 0 }),
        expect.objectContaining({ del: 1 }),
      );
    });
  });

  // ─── saveCommittee ────────────────────────────────────────────────────────────
  describe('saveCommittee', () => {
    const dto = { rw_id: 1, sc_id: 1, member1_name: 'นาย ก', member1_position: 'ครู' };

    it('ไม่พบ rw ของ sc_id นี้ → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.saveCommittee(dto as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลการเบิกจ่าย' });
    });

    it('cross-tenant — findOne ใช้ sc_id จาก dto', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.saveCommittee({ ...dto, sc_id: 99 } as any);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ scId: 99, del: 0 }) }),
      );
    });

    it('upsert — สร้างใหม่ถ้าไม่มีแล้ว save', async () => {
      rwRepo.findOne.mockResolvedValue({ rwId: 1 });
      committeeRepo.findOne.mockResolvedValue(null);
      const newC = { rwId: 1, scId: 1 };
      committeeRepo.create.mockReturnValue(newC);
      committeeRepo.save.mockResolvedValue(newC);

      const result = await service.saveCommittee(dto as any);
      expect(result).toEqual({ flag: true, ms: 'บันทึกคณะกรรมการเรียบร้อยแล้ว' });
      expect(committeeRepo.save).toHaveBeenCalled();
    });

    it('upsert — อัปเดตถ้ามีอยู่แล้ว', async () => {
      rwRepo.findOne.mockResolvedValue({ rwId: 1 });
      const existing = { rwId: 1, member1Name: 'เดิม' };
      committeeRepo.findOne.mockResolvedValue(existing);
      committeeRepo.save.mockResolvedValue(existing);

      await service.saveCommittee(dto as any);
      expect(existing.member1Name).toBe('นาย ก');
    });
  });
});
