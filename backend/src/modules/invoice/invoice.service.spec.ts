import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { RequestWithdraw } from './entities/request-withdraw.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialAuditService } from '../financial-audit/financial-audit.service';
import { CrossDomainGuardService } from '../cross-domain-guard/cross-domain-guard.service';
import { DeleteLogService } from '../delete-log/delete-log.service';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import { AddInvoiceDto } from './dto/add-invoice.dto';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(rawResult: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  [
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'groupBy',
  ].forEach((m) => (qb[m] = jest.fn().mockReturnValue(chain())));
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawResult);
  return qb;
}

// ─── Minimal DTO helper ───────────────────────────────────────────────────────
function baseDto(overrides: Partial<AddInvoiceDto> = {}): AddInvoiceDto {
  return {
    sc_id: 1,
    no_doc: 'D-001',
    bg_type_id: 2,
    rw_type: 0,
    p_id: 10,
    detail: 'ค่าวัสดุ',
    amount: 5000,
    date_request: '2026-05-01',
    user_request: 99,
    sy_id: 3,
    year: '2569',
    ...overrides,
  } as AddInvoiceDto;
}

describe('InvoiceService', () => {
  let service: InvoiceService;
  let rwRepo: jest.Mocked<any>;
  let poRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let financialAuditService: jest.Mocked<
    Pick<FinancialAuditService, 'isDateLocked'>
  >;
  let deleteLog: { log: jest.Mock };
  let fundBalance: { available: jest.Mock };
  let regulatoryConfig: { getThreshold: jest.Mock };

  beforeEach(async () => {
    const mockQb = makeQb([]);

    rwRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    poRepo = { find: jest.fn() };
    partnerRepo = { find: jest.fn() };
    adminRepo = { find: jest.fn() };
    budgetTypeRepo = { find: jest.fn() };
    financialAuditService = { isDateLocked: jest.fn() };
    deleteLog = { log: jest.fn().mockResolvedValue(undefined) };
    fundBalance = {
      available: jest.fn().mockResolvedValue(Number.MAX_SAFE_INTEGER),
    };
    // default: ปิด block_overspend เพื่อให้ test เดิมพฤติกรรมไม่เปลี่ยน
    regulatoryConfig = { getThreshold: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        { provide: getRepositoryToken(ParcelOrder), useValue: poRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        {
          provide: getRepositoryToken(BudgetIncomeType),
          useValue: budgetTypeRepo,
        },
        { provide: FinancialAuditService, useValue: financialAuditService },
        {
          provide: CrossDomainGuardService,
          useValue: {
            checkPayBeforeInspection: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: DeleteLogService, useValue: deleteLog },
        { provide: FundBalanceService, useValue: fundBalance },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
      ],
    }).compile();

    service = module.get(InvoiceService);
  });

  // ─── loadInvoiceOrder ───────────────────────────────────────────────────────
  describe('loadInvoiceOrder', () => {
    it('ส่ง scId และ syId เข้า query ถูกต้อง และ filter del=0', async () => {
      const qb = makeQb([
        {
          rw_id: 1,
          sc_id: 1,
          amount: '1500',
          partner_name: null,
          budget_type_name: null,
          project_name: null,
          user_request_name: null,
        },
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.loadInvoiceOrder(1, 3);

      expect(qb.where).toHaveBeenCalledWith('rw.sc_id = :scId', { scId: 1 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.sy_id = :yId', { yId: 3 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.del = 0');
    });

    it('แปลง amount null เป็น 0 และ null fields เป็น empty string', async () => {
      const qb = makeQb([
        {
          rw_id: 1,
          sc_id: 1,
          amount: null,
          partner_name: null,
          budget_type_name: null,
          project_name: null,
          user_request_name: null,
        },
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.loadInvoiceOrder(1, 3);

      expect(result[0].amount).toBe(0);
      expect(result[0].partner_name).toBe('');
      expect(result[0].budget_type_name).toBe('');
      expect(result[0].project_name).toBe('');
      expect(result[0].user_request_name).toBe('');
    });

    it('แปลง amount string เป็น number', async () => {
      const qb = makeQb([
        {
          rw_id: 1,
          sc_id: 1,
          amount: '9999.50',
          partner_name: 'P',
          budget_type_name: 'B',
          project_name: 'Proj',
          user_request_name: 'User',
        },
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadInvoiceOrder(1, 3);
      expect(row.amount).toBe(9999.5);
    });

    it('คืน array ว่างเมื่อไม่มีข้อมูล', async () => {
      rwRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.loadInvoiceOrder(1, 3);
      expect(result).toEqual([]);
    });
  });

  // ─── loadProjects ───────────────────────────────────────────────────────────
  describe('loadProjects', () => {
    it('filter del=0, scId, acadYear และ orderStatus=2 เท่านั้น', async () => {
      poRepo.find.mockResolvedValue([]);
      await service.loadProjects(1, 3);
      expect(poRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scId: 1,
            acadYear: 3,
            del: 0,
            orderStatus: 2,
          }),
        }),
      );
    });

    it('map column names ถูกต้อง', async () => {
      const fakeOrder = {
        orderId: 7,
        projectId: 5,
        details: 'รายละเอียด',
        budgets: 10000,
        suppliers: 3,
        bgTypeId: 2,
      };
      poRepo.find.mockResolvedValue([fakeOrder]);

      const [row] = await service.loadProjects(1, 3);
      expect(row).toEqual({
        order_id: 7,
        project_id: 5,
        details: 'รายละเอียด',
        budgets: 10000,
        p_id: 3,
        bg_type_id: 2,
      });
    });

    it('p_id เป็น 0 ถ้า suppliers เป็น null/undefined', async () => {
      poRepo.find.mockResolvedValue([
        {
          orderId: 1,
          projectId: 1,
          details: '',
          budgets: 0,
          suppliers: null,
          bgTypeId: 1,
        },
      ]);
      const [row] = await service.loadProjects(1, 3);
      expect(row.p_id).toBe(0);
    });
  });

  // ─── loadPartner ────────────────────────────────────────────────────────────
  describe('loadPartner', () => {
    it('filter scId และ del=0', async () => {
      partnerRepo.find.mockResolvedValue([]);
      await service.loadPartner(5);
      expect(partnerRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 5, del: 0 } }),
      );
    });

    it('take 1000 รายการ', async () => {
      partnerRepo.find.mockResolvedValue([]);
      await service.loadPartner(1);
      expect(partnerRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    it('map column names ถูกต้อง', async () => {
      partnerRepo.find.mockResolvedValue([
        {
          pId: 3,
          pName: 'ผู้ค้า',
          pType: 2,
          pAddress: '99 หมู่ 1',
          pTel: '053123456',
          pIdTax: '1234567890123',
          payType: 1,
          calVat: 0,
          del: 0,
        },
      ]);
      const [row] = await service.loadPartner(1);
      expect(row).toEqual({
        p_id: 3,
        p_name: 'ผู้ค้า',
        p_type: 2,
        p_address: '99 หมู่ 1',
        p_tel: '053123456',
        p_tax_id: '1234567890123',
        pay_type: 1,
        cal_vat: 0,
        del: 0,
      });
    });
  });

  // ─── loadBudgetType ─────────────────────────────────────────────────────────
  describe('loadBudgetType', () => {
    it('คำนวณ minWithdrawn จาก withdrawn map ถูกต้อง', async () => {
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน', del: 0 },
      ]);
      const withdrawnQb = makeQb([{ bgTypeId: '1', total: '3500.555' }]);
      rwRepo.createQueryBuilder.mockReturnValue(withdrawnQb);

      const [row] = await service.loadBudgetType(1, 3, '2569');
      // Math.round(3500.555 * 100) / 100 = 3500.56
      expect(row.minWithdrawn).toBe(3500.56);
    });

    it('minWithdrawn = 0 ถ้า budget type ไม่มีรายการเบิก', async () => {
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 9, budgetType: 'เงินอื่น', del: 0 },
      ]);
      const withdrawnQb = makeQb([]); // ไม่มีข้อมูล
      rwRepo.createQueryBuilder.mockReturnValue(withdrawnQb);

      const [row] = await service.loadBudgetType(1, 3, '2569');
      expect(row.minWithdrawn).toBe(0);
    });

    it('filter withdrawn ด้วย status >= 200 เท่านั้น', async () => {
      budgetTypeRepo.find.mockResolvedValue([]);
      const withdrawnQb = makeQb([]);
      rwRepo.createQueryBuilder.mockReturnValue(withdrawnQb);

      await service.loadBudgetType(1, 3, '2569');

      expect(withdrawnQb.where).toHaveBeenCalledWith(
        expect.stringContaining('rw.status >= 200'),
        expect.objectContaining({ scId: 1, syId: 3 }),
      );
    });
  });

  // ─── loadUserRequest ────────────────────────────────────────────────────────
  describe('loadUserRequest', () => {
    it('filter scId และ del=0', async () => {
      adminRepo.find.mockResolvedValue([]);
      await service.loadUserRequest(7);
      expect(adminRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scId: 7, del: 0 } }),
      );
    });

    it('ไม่ return password_default ใน response', async () => {
      adminRepo.find.mockResolvedValue([
        {
          adminId: 1,
          name: 'ครู ก',
          username: 'teacher1',
          email: 'a@b.com',
          type: 2,
          scId: 1,
          passwordDefault: 'secret123',
          del: 0,
        },
      ]);
      const [row] = await service.loadUserRequest(1);
      expect((row as any).passwordDefault).toBeUndefined();
      expect((row as any).password_default).toBeUndefined();
    });
  });

  // ─── addInvoice ─────────────────────────────────────────────────────────────
  describe('addInvoice', () => {
    const fakeEntity = { rwId: 1 } as RequestWithdraw;

    beforeEach(() => {
      rwRepo.create.mockReturnValue(fakeEntity);
      rwRepo.save.mockResolvedValue(fakeEntity);
      rwRepo.findOne.mockResolvedValue(null); // ไม่มีเงินยืมค้าง
    });

    it('happy path — สร้างใบเบิกสำเร็จ คืน flag: true', async () => {
      const result = await service.addInvoice(baseDto());
      expect(rwRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ flag: true });
    });

    it('rw_type=1 มีเงินยืมค้างเลยกำหนด → block พร้อม no_doc', async () => {
      const overdue = {
        loanReturnDueDate: '2026-01-01', // อดีต
        loanReturnedDate: null,
        noDoc: 'LOAN-99',
      } as unknown as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(overdue);

      const result = await service.addInvoice(
        baseDto({ rw_type: 1, user_request: 5 }),
      );

      expect(result.flag).toBe(false);
      expect(result.ms).toContain('LOAN-99');
      expect(rwRepo.save).not.toHaveBeenCalled();
    });

    it('rw_type=1 ไม่มีเงินยืมค้าง → ผ่านได้ปกติ', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.addInvoice(
        baseDto({ rw_type: 1, user_request: 5 }),
      );
      expect(result).toEqual({ flag: true });
    });

    it('rw_type=1 + loan_start_date → auto-calc loanReturnDueDate +30 วัน', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.addInvoice(
        baseDto({ rw_type: 1, user_request: 5, loan_start_date: '2026-05-01' }),
      );

      const created = rwRepo.create.mock.calls[0][0];
      expect(created.loanReturnDueDate).toBe('2026-05-31');
    });

    it('rw_type=1 + loan_return_due_date กำหนดเอง → ไม่ override', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.addInvoice(
        baseDto({
          rw_type: 1,
          user_request: 5,
          loan_start_date: '2026-05-01',
          loan_return_due_date: '2026-06-15',
        }),
      );

      const created = rwRepo.create.mock.calls[0][0];
      expect(created.loanReturnDueDate).toBe('2026-06-15');
    });

    it('rw_type != 1 → ไม่เช็คเงินยืมค้าง', async () => {
      await service.addInvoice(baseDto({ rw_type: 3 }));
      expect(rwRepo.findOne).not.toHaveBeenCalled();
      expect(rwRepo.save).toHaveBeenCalled();
    });

    // ─── BUG-06: กันตั้งเบิกรวมเกินยอดคงเหลือประเภทเงิน ───────────────────────
    describe('guard ยอดคงเหลือประเภทเงิน (block_overspend=1)', () => {
      // qb จำลองยอดเบิกค้างจ่ายสะสม (committed)
      const committedQb = (committed: number) => {
        const qb: Record<string, jest.Mock> = {};
        ['select', 'where', 'andWhere'].forEach(
          (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
        );
        qb['getRawOne'] = jest
          .fn()
          .mockResolvedValue({ committed: String(committed) });
        return qb;
      };

      beforeEach(() => regulatoryConfig.getThreshold.mockResolvedValue(1));

      it('ยอดเบิกค้าง + ขอเบิกใหม่ เกินยอดคงเหลือ → block', async () => {
        fundBalance.available.mockResolvedValue(10000);
        rwRepo.createQueryBuilder.mockReturnValue(committedQb(8000));
        const result = await service.addInvoice(baseDto({ amount: 5000 }));
        expect(result.flag).toBe(false);
        expect(result.ms).toContain('เกินยอดคงเหลือ');
        expect(rwRepo.save).not.toHaveBeenCalled();
      });

      it('ยอดรวมไม่เกินยอดคงเหลือ → ผ่าน', async () => {
        fundBalance.available.mockResolvedValue(10000);
        rwRepo.createQueryBuilder.mockReturnValue(committedQb(2000));
        const result = await service.addInvoice(baseDto({ amount: 5000 }));
        expect(result).toEqual({ flag: true });
        expect(rwRepo.save).toHaveBeenCalled();
      });

      it('ปิด block_overspend (=0) → ไม่ตรวจยอด', async () => {
        regulatoryConfig.getThreshold.mockResolvedValue(0);
        const result = await service.addInvoice(baseDto({ amount: 999999 }));
        expect(result).toEqual({ flag: true });
        expect(fundBalance.available).not.toHaveBeenCalled();
      });
    });
  });

  // ─── updateInvoice ──────────────────────────────────────────────────────────
  describe('updateInvoice', () => {
    it('ไม่มี rw_id → flag: false', async () => {
      const result = await service.updateInvoice(baseDto({ rw_id: undefined }));
      expect(result).toEqual({ flag: false, ms: 'ไม่พบ rw_id' });
      expect(rwRepo.save).not.toHaveBeenCalled();
    });

    it('ไม่พบ invoice (cross-tenant หรือไม่มีข้อมูล) → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.updateInvoice(
        baseDto({ rw_id: 999, sc_id: 2 }),
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลขอเบิก' });
    });

    it('cross-tenant isolation — query ต้องใช้ sc_id ของ dto', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.updateInvoice(baseDto({ rw_id: 1, sc_id: 99 }));
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 99, del: 0 }),
        }),
      );
    });

    it('happy path → บันทึกและคืน flag: true', async () => {
      const existing = {
        rwId: 1,
        scId: 1,
        del: 0,
        detail: 'เดิม',
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(existing);
      rwRepo.save.mockResolvedValue(existing);

      const result = await service.updateInvoice(
        baseDto({ rw_id: 1, detail: 'ใหม่' }),
      );
      expect(result).toEqual({ flag: true });
      expect(rwRepo.save).toHaveBeenCalled();
    });

    it('update amount เป็น field ที่กำหนด', async () => {
      const existing = {
        rwId: 1,
        scId: 1,
        del: 0,
        amount: 1000,
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(existing);
      rwRepo.save.mockResolvedValue(existing);

      await service.updateInvoice(baseDto({ rw_id: 1, amount: 9999 }));
      expect(existing.amount).toBe(9999);
    });
  });

  // ─── validatePayableLimit (ผ่าน addInvoice / updateInvoice) ──────────────────
  describe('ตรวจมูลหนี้ก่อนเบิก (พัสดุ/ค่าเดินทาง/เงินยืม)', () => {
    // qb ที่ผูก getRawOne สำหรับยอดเบิกสะสมของ order
    function qbWithWithdrawn(total: number) {
      const qb: Record<string, jest.Mock> = {};
      ['select', 'where', 'andWhere'].forEach(
        (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
      );
      qb['getRawOne'] = jest
        .fn()
        .mockResolvedValue({ totalWithdrawn: String(total) });
      return qb;
    }

    beforeEach(() => {
      poRepo.findOne = jest.fn();
      rwRepo.manager = { query: jest.fn().mockResolvedValue([]) };
      rwRepo.create.mockReturnValue({ rwId: 1 } as RequestWithdraw);
      rwRepo.save.mockResolvedValue({ rwId: 1 } as RequestWithdraw);
      rwRepo.findOne.mockResolvedValue(null);
    });

    it('addInvoice: เบิกพัสดุเกินงบคงเหลือ → block', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 7, budgets: 5000, del: 0 });
      rwRepo.createQueryBuilder.mockReturnValue(qbWithWithdrawn(4000)); // เบิกไปแล้ว 4000
      const result = await service.addInvoice(
        baseDto({ order_id: 7, amount: 2000 }), // คงเหลือ 1000 < 2000
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('งบคงเหลือไม่เพียงพอ');
      expect(rwRepo.save).not.toHaveBeenCalled();
    });

    it('addInvoice: เบิกพัสดุพอดีงบคงเหลือ → ผ่าน', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 7, budgets: 5000, del: 0 });
      rwRepo.createQueryBuilder.mockReturnValue(qbWithWithdrawn(4000));
      const result = await service.addInvoice(
        baseDto({ order_id: 7, amount: 1000 }), // คงเหลือ 1000 = 1000
      );
      expect(result).toEqual({ flag: true });
    });

    it('addInvoice: เบิกค่าเดินทางเกิน grand_total → block', async () => {
      rwRepo.manager.query.mockResolvedValue([{ grand_total: 1500 }]);
      const result = await service.addInvoice(
        baseDto({ tr_id: 3, amount: 2000, p_id: 0 }),
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ค่าเดินทาง');
      expect(rwRepo.save).not.toHaveBeenCalled();
    });

    it('addInvoice: เบิกเงินยืมเกินวงเงินอนุมัติ → block', async () => {
      rwRepo.manager.query.mockResolvedValue([{ amt: 10000 }]);
      const result = await service.addInvoice(
        baseDto({
          la_id: 9,
          amount: 12000,
          rw_type: 1,
          user_request: 5,
          p_id: 0,
        }),
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('วงเงินยืม');
    });

    it('updateInvoice: แก้ยอดให้เกินงบ order ภายหลัง → block (ปิดช่องโหว่เดิม)', async () => {
      const existing = {
        rwId: 1,
        scId: 1,
        del: 0,
        orderId: 7,
        amount: 500,
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(existing);
      poRepo.findOne.mockResolvedValue({ orderId: 7, budgets: 5000, del: 0 });
      rwRepo.createQueryBuilder.mockReturnValue(qbWithWithdrawn(4800)); // ไม่นับตัวเอง คงเหลือ 200
      const result = await service.updateInvoice(
        baseDto({ rw_id: 1, order_id: 7, amount: 9999 }),
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('งบคงเหลือไม่เพียงพอ');
      expect(rwRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── loadLoanStatus ─────────────────────────────────────────────────────────
  describe('loadLoanStatus', () => {
    function makeLoanRow(overrides: Record<string, unknown>) {
      return {
        rw_id: 1,
        no_doc: 'L-001',
        detail: '',
        amount: '5000',
        loan_type: 1,
        loan_start_date: '2026-04-01',
        loan_return_due_date: '2026-05-01',
        loan_returned_date: null,
        loan_return_cash: '0',
        loan_return_voucher_amount: '0',
        status: 200,
        user_request: 5,
        requester_name: 'ครู ก',
        ...overrides,
      };
    }

    beforeEach(() => {
      const qb = makeQb([]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('loan_returned_date มีค่า → loan_status = "returned"', async () => {
      const qb = makeQb([makeLoanRow({ loan_returned_date: '2026-04-30' })]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadLoanStatus(1, 3);
      expect(row.loan_status).toBe('returned');
    });

    it('due date < today และไม่มี loan_returned_date → loan_status = "overdue"', async () => {
      const qb = makeQb([
        makeLoanRow({
          loan_return_due_date: '2020-01-01',
          loan_returned_date: null,
        }),
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadLoanStatus(1, 3);
      expect(row.loan_status).toBe('overdue');
    });

    it('ยังไม่ถึงกำหนดและไม่มี loan_returned_date → loan_status = "active"', async () => {
      const futureDue = new Date();
      futureDue.setFullYear(futureDue.getFullYear() + 1);
      const qb = makeQb([
        makeLoanRow({
          loan_return_due_date: futureDue.toISOString().slice(0, 10),
          loan_returned_date: null,
        }),
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadLoanStatus(1, 3);
      expect(row.loan_status).toBe('active');
    });

    it('คำนวณ return_total ถูกต้อง (cash + voucher)', async () => {
      const qb = makeQb([
        makeLoanRow({
          loan_return_cash: '2000',
          loan_return_voucher_amount: '3000',
          loan_returned_date: '2026-04-30',
        }),
      ]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const [row] = await service.loadLoanStatus(1, 3);
      expect(row.return_total).toBe(5000);
    });

    it('filter รวมเฉพาะ rw_type=1 และ del=0 และ status >= 200', async () => {
      const qb = makeQb([]);
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      await service.loadLoanStatus(1, 3);
      expect(qb.andWhere).toHaveBeenCalledWith('rw.rw_type = 1');
      expect(qb.andWhere).toHaveBeenCalledWith('rw.del = 0');
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status >= 200');
    });
  });

  // ─── returnLoan ──────────────────────────────────────────────────────────────
  describe('returnLoan', () => {
    const returnDto = {
      rw_id: 1,
      loan_returned_date: '2026-05-01',
      loan_return_cash: 3000,
      loan_return_voucher_amount: 2000,
    };

    it('ไม่พบ loan (หรือ cross-tenant) → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.returnLoan(1, returnDto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลเงินยืม' });
    });

    it('cross-tenant isolation — query ใช้ scId ที่ส่งมา', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.returnLoan(99, returnDto);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 99 }),
        }),
      );
    });

    it('คืนแล้ว (loanReturnedDate มีค่า) → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue({
        rwId: 1,
        loanReturnedDate: '2026-04-01',
        amount: 5000,
      });
      const result = await service.returnLoan(1, returnDto);
      expect(result).toEqual({ flag: false, ms: 'บันทึกการคืนเงินแล้ว' });
    });

    it('ยอดคืน < ยอดยืม → flag: false พร้อมข้อความแจ้ง', async () => {
      rwRepo.findOne.mockResolvedValue({
        rwId: 1,
        loanReturnedDate: null,
        amount: 10000,
      });
      const result = await service.returnLoan(1, {
        ...returnDto,
        loan_return_cash: 1000,
        loan_return_voucher_amount: 1000,
      });
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('น้อยกว่า');
    });

    it('ยอดคืน >= ยอดยืม → บันทึกสำเร็จ flag: true', async () => {
      const loan = { rwId: 1, loanReturnedDate: null, amount: 5000 };
      rwRepo.findOne.mockResolvedValue(loan);
      rwRepo.save.mockResolvedValue(loan);

      const result = await service.returnLoan(1, returnDto); // 3000+2000=5000
      expect(result).toEqual({
        flag: true,
        ms: 'บันทึกการคืนเงินเรียบร้อยแล้ว',
      });
      expect(rwRepo.save).toHaveBeenCalled();
    });

    it('ยอดคืนมากกว่ายอดยืม → ผ่านได้ (คืนเกิน)', async () => {
      const loan = { rwId: 1, loanReturnedDate: null, amount: 4000 };
      rwRepo.findOne.mockResolvedValue(loan);
      rwRepo.save.mockResolvedValue(loan);

      const result = await service.returnLoan(1, returnDto); // 5000 > 4000
      expect(result.flag).toBe(true);
    });
  });

  // ─── confirmInvoice ─────────────────────────────────────────────────────────
  describe('confirmInvoice', () => {
    const confirmDto = { rw_id: 1, status: 100, up_by: 7 };

    it('ไม่พบ invoice → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.confirmInvoice(confirmDto, 1);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลขอเบิก' });
    });

    it('cross-tenant — query ต้องใช้ scId ที่ส่งเข้ามา', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.confirmInvoice(confirmDto, 55);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 55, del: 0 }),
        }),
      );
    });

    it('transition 50 → 100: บันทึก precheckBy, precheckDate, precheckNote', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        status: 50,
        del: 0,
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      rwRepo.save.mockResolvedValue(invoice);

      await service.confirmInvoice(
        { rw_id: 1, status: 100, up_by: 7, precheck_note: 'ตรวจแล้ว' },
        1,
      );
      expect(invoice.precheckBy).toBe(7);
      expect(invoice.precheckDate).toBeInstanceOf(Date);
      expect(invoice.precheckNote).toBe('ตรวจแล้ว');
    });

    it('transition 50 → 51: ก็บันทึก precheck fields ด้วย', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        status: 50,
        del: 0,
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      rwRepo.save.mockResolvedValue(invoice);

      await service.confirmInvoice({ rw_id: 1, status: 51, up_by: 8 }, 1);
      expect(invoice.precheckBy).toBe(8);
    });

    it('transition ที่ไม่ใช่จาก 50 → ไม่ set precheck fields', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        status: 100,
        del: 0,
        precheckBy: null,
      } as unknown as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      rwRepo.save.mockResolvedValue(invoice);

      await service.confirmInvoice({ rw_id: 1, status: 102, up_by: 9 }, 1);
      expect(invoice.precheckBy).toBeNull();
    });

    it('happy path → flag: true', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        status: 100,
        del: 0,
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      rwRepo.save.mockResolvedValue(invoice);

      const result = await service.confirmInvoice(confirmDto, 1);
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });
  });

  // ─── deleteInvoice ──────────────────────────────────────────────────────────
  describe('deleteInvoice', () => {
    const REASON = 'บันทึกผิดรายการ';

    it('ไม่มีเหตุผล → flag: false (บังคับ audit trail)', async () => {
      const result = await service.deleteInvoice(1, 1, 7);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เหตุผล');
      expect(rwRepo.findOne).not.toHaveBeenCalled();
    });

    it('เหตุผลเป็นช่องว่าง → flag: false', async () => {
      const result = await service.deleteInvoice(1, 1, 7, '   ');
      expect(result.flag).toBe(false);
      expect(rwRepo.findOne).not.toHaveBeenCalled();
    });

    it('ไม่พบ invoice → flag: false', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      const result = await service.deleteInvoice(999, 1, 7, REASON);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลใบเบิก' });
    });

    it('cross-tenant isolation — query ใช้ scId ที่ส่งมา', async () => {
      rwRepo.findOne.mockResolvedValue(null);
      await service.deleteInvoice(1, 77, 7, REASON);
      expect(rwRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 77, del: 0 }),
        }),
      );
    });

    it('ใบเบิกที่ออกเช็คแล้ว (202) → flag: false ให้ใช้ยกเลิกเช็คแทน', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        del: 0,
        status: 202,
        dateRequest: new Date('2026-05-01'),
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      const result = await service.deleteInvoice(1, 1, 7, REASON);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ยกเลิกเช็ค');
      expect(rwRepo.save).not.toHaveBeenCalled();
    });

    it('วันที่ถูกล็อก (financial audit) → flag: false', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        del: 0,
        dateRequest: new Date('2026-04-01'),
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      financialAuditService.isDateLocked.mockResolvedValue(true);

      const result = await service.deleteInvoice(1, 1, 7, REASON);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ถูกลงนามแล้ว');
    });

    it('วันที่ไม่ถูกล็อก → soft delete (del=1) + ลง delete-log และ flag: true', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        del: 0,
        dateRequest: new Date('2026-05-01'),
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      financialAuditService.isDateLocked.mockResolvedValue(false);
      rwRepo.save.mockResolvedValue(invoice);

      const result = await service.deleteInvoice(1, 1, 7, REASON);
      expect(invoice.del).toBe(1);
      expect(invoice.upBy).toBe(7);
      expect(rwRepo.save).toHaveBeenCalledWith(invoice);
      expect(deleteLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'request_withdraw',
          rowId: 1,
          deletedBy: 7,
          scId: 1,
          reason: expect.stringContaining(REASON),
        }),
      );
      expect(result).toEqual({ flag: true, ms: 'ลบข้อมูลใบเบิกเรียบร้อยแล้ว' });
    });

    it('ไม่แก้ upBy ถ้าไม่ส่ง parameter', async () => {
      const invoice = {
        rwId: 1,
        scId: 1,
        del: 0,
        upBy: 0,
        dateRequest: new Date('2026-05-01'),
      } as RequestWithdraw;
      rwRepo.findOne.mockResolvedValue(invoice);
      financialAuditService.isDateLocked.mockResolvedValue(false);
      rwRepo.save.mockResolvedValue(invoice);

      await service.deleteInvoice(1, 1, undefined, REASON); // ไม่ส่ง upBy
      expect(invoice.upBy).toBe(0); // ยังคงเดิม
    });
  });

  // ─── loadConfirmInvoice ─────────────────────────────────────────────────────
  describe('loadConfirmInvoice', () => {
    function setupQbForPermission(rows: unknown[] = []) {
      const qb = makeQb(rows);
      rwRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('permission=50 → filter status=50 เท่านั้น', async () => {
      const qb = setupQbForPermission();
      await service.loadConfirmInvoice(1, 50, 3);
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status = 50');
    });

    it('permission=100 → filter status=100 เท่านั้น', async () => {
      const qb = setupQbForPermission();
      await service.loadConfirmInvoice(1, 100, 3);
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status = 100');
    });

    it('permission=102 → filter status=102 เท่านั้น', async () => {
      const qb = setupQbForPermission();
      await service.loadConfirmInvoice(1, 102, 3);
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status = 102');
    });

    it('permission อื่น → filter status IN (50, 100, 102)', async () => {
      const qb = setupQbForPermission();
      await service.loadConfirmInvoice(1, 999, 3);
      expect(qb.andWhere).toHaveBeenCalledWith('rw.status IN (50, 100, 102)');
    });

    it('filter sc_id และ sy_id และ del=0 เสมอ', async () => {
      const qb = setupQbForPermission();
      await service.loadConfirmInvoice(8, 100, 5);
      expect(qb.where).toHaveBeenCalledWith('rw.sc_id = :scId', { scId: 8 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.sy_id = :syId', { syId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('rw.del = 0');
    });

    it('แปลง budgets null → 0 และ null fields → empty string', async () => {
      const qb = setupQbForPermission([
        {
          rw_id: 1,
          sc_id: 1,
          invoice_no: null,
          invoice_name: null,
          invoice_date: null,
          budgets: null,
          project_name: null,
          partner_name: null,
          bank_name: null,
          account_no: null,
          budget_type_name: null,
          status: 100,
          remark: null,
          precheck_note: null,
          up_by: null,
          up_date: null,
        },
      ]);

      const [row] = await service.loadConfirmInvoice(1, 100, 3);
      expect(row.budgets).toBe(0);
      expect(row.invoice_no).toBe('');
      expect(row.project_name).toBe('');
      expect(row.partner_name).toBe('');
    });
  });
});
