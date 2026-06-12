import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProjectApproveService } from './project-approve.service';
import { ParcelOrder } from './entities/parcel-order.entity';
import { ParcelDetail } from './entities/parcel-detail.entity';
import { PlnProjApprove } from './entities/pln-proj-approve.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnProcurementPlanItem } from '../procurement-plan/entities/pln-procurement-plan-item.entity';
import { PlnProcurementPlan } from '../procurement-plan/entities/pln-procurement-plan.entity';
import { Supplies } from '../supplie/entities/supplies.entity';
import { Unit } from '../general-db/entities/unit.entity';
import { Project } from '../project/entities/project.entity';
import { School } from '../school/entities/school.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import { CrossDomainGuardService } from '../cross-domain-guard/cross-domain-guard.service';
import { PROCUREMENT_METHOD } from './procurement-rules.util';

// ─── QueryBuilder mock factory ───────────────────────────────────────────────
function makeQb(
  opts: {
    manyAndCount?: [unknown[], number];
    many?: unknown[];
    rawOne?: unknown;
  } = {},
) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'andWhere', 'select', 'orderBy', 'skip', 'take'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getManyAndCount'] = jest
    .fn()
    .mockResolvedValue(opts.manyAndCount ?? [[], 0]);
  qb['getMany'] = jest.fn().mockResolvedValue(opts.many ?? []);
  qb['getRawOne'] = jest.fn().mockResolvedValue(opts.rawOne ?? null);
  return qb;
}

describe('ProjectApproveService', () => {
  let service: ProjectApproveService;
  let poRepo: jest.Mocked<any>;
  let pdRepo: jest.Mocked<any>;
  let ppaRepo: jest.Mocked<any>;
  let partnerRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let planItemRepo: jest.Mocked<any>;
  let planRepo: jest.Mocked<any>;
  let suppliesRepo: jest.Mocked<any>;
  let unitRepo: jest.Mocked<any>;
  let projectRepo: jest.Mocked<any>;
  let schoolRepo: jest.Mocked<any>;
  let regulatoryConfig: jest.Mocked<
    Pick<RegulatoryConfigService, 'getThreshold'>
  >;

  beforeEach(async () => {
    poRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    pdRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    ppaRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    partnerRepo = { find: jest.fn(), findOne: jest.fn() };
    adminRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    rwRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQb()) };
    planItemRepo = { findOne: jest.fn() };
    planRepo = { findOne: jest.fn() };
    suppliesRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ suppId: 999, ...x })),
    };
    unitRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ unId: 99, ...x })),
    };
    projectRepo = { findOne: jest.fn() };
    schoolRepo = { findOne: jest.fn() };
    regulatoryConfig = { getThreshold: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectApproveService,
        { provide: getRepositoryToken(ParcelOrder), useValue: poRepo },
        { provide: getRepositoryToken(ParcelDetail), useValue: pdRepo },
        { provide: getRepositoryToken(PlnProjApprove), useValue: ppaRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        { provide: getRepositoryToken(RequestWithdraw), useValue: rwRepo },
        {
          provide: getRepositoryToken(PlnProcurementPlanItem),
          useValue: planItemRepo,
        },
        { provide: getRepositoryToken(PlnProcurementPlan), useValue: planRepo },
        { provide: getRepositoryToken(Supplies), useValue: suppliesRepo },
        { provide: getRepositoryToken(Unit), useValue: unitRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(School), useValue: schoolRepo },
        { provide: RegulatoryConfigService, useValue: regulatoryConfig },
        {
          provide: CrossDomainGuardService,
          useValue: { assertProjectNotOvercommitted: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProjectApproveService);
  });

  // ─── loadProjectApprove ───────────────────────────────────────────────────
  describe('loadProjectApprove', () => {
    it('filter scId, acad_year=syId, del=0 และ orderBy DESC', async () => {
      const qb = makeQb({ manyAndCount: [[], 0] });
      poRepo.createQueryBuilder.mockReturnValue(qb);
      await service.loadProjectApprove(5, 3);
      expect(qb.where).toHaveBeenCalledWith('po.sc_id = :scId', { scId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('po.acad_year = :syId', {
        syId: 3,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('po.del = 0');
    });

    it('ไม่มี pagination → คืน array (ไม่ห่อ { data, count })', async () => {
      const qb = makeQb({
        manyAndCount: [
          [{ orderId: 1, orderStatus: 1, details: null, budgets: null }],
          1,
        ],
      });
      poRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.loadProjectApprove(5, 3);
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[])[0].order_id).toBe(1);
      // null → defaults
      expect((result as any[])[0].details).toBe('');
      expect((result as any[])[0].budgets).toBe(0);
    });

    it('มี pagination → คืน { data, count } พร้อม skip/take', async () => {
      const qb = makeQb({ manyAndCount: [[], 7] });
      poRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.loadProjectApprove(5, 3, 2, 10);
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ data: [], count: 7 });
    });
  });

  // ─── loadBudgetBalance ────────────────────────────────────────────────────
  describe('loadBudgetBalance', () => {
    it('ไม่พบ order → คืน 0', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.loadBudgetBalance(1, 2, 5, 2569);
      expect(result).toBe(0);
    });

    it('คำนวณ remaining = allocated - withdrawn (ปัดทศนิยม)', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, budgets: 5000, del: 0 });
      const qb = makeQb({ rawOne: { totalWithdrawn: '1500.50' } });
      rwRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.loadBudgetBalance(1, 2, 5, 2569);
      expect(result).toEqual({
        allocated: 5000,
        withdrawn: 1500.5,
        remaining: 3499.5,
      });
    });

    it('ไม่นับสถานะ cancelled (101, 201) ใน SUM', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, budgets: 5000, del: 0 });
      const qb = makeQb({ rawOne: { totalWithdrawn: '0' } });
      rwRepo.createQueryBuilder.mockReturnValue(qb);
      await service.loadBudgetBalance(1, 2, 5, 2569);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'rw.status NOT IN (:...cancelled)',
        { cancelled: [101, 201] },
      );
    });
  });

  // ─── approveParcelByPlan (status 1 → 2) ───────────────────────────────────
  describe('approveParcelByPlan', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.approveParcelByPlan(
        { order_id: 1, order_status: 2 } as any,
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('สถานะปัจจุบันไม่ใช่ 1 → BadRequestException (state machine)', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 3, del: 0 });
      await expect(
        service.approveParcelByPlan({ order_id: 1, order_status: 2 } as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path: 1 → 2 บันทึก remarkCfPlan และ flag: true', async () => {
      const order = { orderId: 1, orderStatus: 1, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.approveParcelByPlan(
        { order_id: 1, order_status: 2, remark: 'ผ่านแผน' } as any,
        5,
      );
      expect(order.orderStatus).toBe(2);
      expect(order.remarkCfPlan).toBe('ผ่านแผน');
      expect(result).toEqual({ flag: true });
    });

    it('reject (target 0): เก็บ remark เดิมและ prefix [ปฏิเสธ]', async () => {
      const order = {
        orderId: 1,
        orderStatus: 1,
        del: 0,
        remark: 'เดิม',
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      await service.approveParcelByPlan(
        { order_id: 1, order_status: 0, remark_cf: 'ข้อมูลไม่ครบ' } as any,
        5,
      );
      expect(order.orderStatus).toBe(0);
      expect(order.remark).toBe('[ปฏิเสธ] ข้อมูลไม่ครบ');
    });

    it('cross-tenant: findOne ต้องใช้ scId ที่ส่งมา', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await service.approveParcelByPlan(
        { order_id: 1, order_status: 2 } as any,
        77,
      );
      expect(poRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 77, del: 0 }),
        }),
      );
    });
  });

  // ─── approveParcelByBusiness (status 2 → 3) ───────────────────────────────
  describe('approveParcelByBusiness', () => {
    it('ต้องอยู่สถานะ 2 ก่อน มิฉะนั้น throw', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 1, del: 0 });
      await expect(
        service.approveParcelByBusiness(
          { order_id: 1, order_status: 3 } as any,
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path 2 → 3 บันทึก remarkCfBusiness', async () => {
      const order = { orderId: 1, orderStatus: 2, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.approveParcelByBusiness(
        { order_id: 1, order_status: 3, remark: 'การเงินผ่าน' } as any,
        5,
      );
      expect(order.orderStatus).toBe(3);
      expect(order.remarkCfBusiness).toBe('การเงินผ่าน');
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── approveParcelBySupplie (status 3 → 4) + procurement compliance ───────
  describe('approveParcelBySupplie', () => {
    it('ต้องอยู่สถานะ 3 ก่อน มิฉะนั้น throw', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 2, del: 0 });
      await expect(
        service.approveParcelBySupplie({ order_id: 1, order_status: 4 }, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path 3 → 4: วงเงินต่ำกว่าเกณฑ์ เฉพาะเจาะจง ผ่านได้', async () => {
      const order = {
        orderId: 1,
        orderStatus: 3,
        del: 0,
        scId: 5,
        budgets: 10000,
        methodType: PROCUREMENT_METHOD.SPECIFIC,
        isUrgent: 0,
        urgentClause: null,
        ppiId: null,
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      regulatoryConfig.getThreshold
        .mockResolvedValueOnce(500000) // specific_max
        .mockResolvedValueOnce(500000); // plan_publish_min

      const result = await service.approveParcelBySupplie(
        { order_id: 1, order_status: 4, remark: 'พัสดุผ่าน' },
        5,
      );
      expect(order.orderStatus).toBe(4);
      expect(order.remarkCfSuppile).toBe('พัสดุผ่าน');
      expect(result).toEqual({ flag: true });
    });

    it('hard-block: วิธีเฉพาะเจาะจงเกินเกณฑ์ → BadRequestException', async () => {
      const order = {
        orderId: 1,
        orderStatus: 3,
        del: 0,
        scId: 5,
        budgets: 800000,
        methodType: PROCUREMENT_METHOD.SPECIFIC,
        isUrgent: 0,
        urgentClause: null,
        ppiId: 1,
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      regulatoryConfig.getThreshold
        .mockResolvedValueOnce(500000)
        .mockResolvedValueOnce(500000);
      // ppiId อ้างอิงแผนที่ประกาศแล้ว เพื่อให้ block มาจากกฎ method ไม่ใช่ plan
      planItemRepo.findOne.mockResolvedValue({ ppiId: 1, ppId: 9, del: 0 });
      planRepo.findOne.mockResolvedValue({ ppId: 9, ppStatus: 1, del: 0 });

      await expect(
        service.approveParcelBySupplie({ order_id: 1, order_status: 4 }, 5),
      ).rejects.toThrow(BadRequestException);
      expect(poRepo.save).not.toHaveBeenCalled();
    });

    it('hard-block: วงเงินถึงเกณฑ์ประกาศแผน แต่ไม่มี ppiId → throw', async () => {
      const order = {
        orderId: 1,
        orderStatus: 3,
        del: 0,
        scId: 5,
        budgets: 600000,
        methodType: PROCUREMENT_METHOD.SELECTIVE,
        isUrgent: 0,
        urgentClause: null,
        ppiId: null,
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      regulatoryConfig.getThreshold
        .mockResolvedValueOnce(500000)
        .mockResolvedValueOnce(500000);

      await expect(
        service.approveParcelBySupplie({ order_id: 1, order_status: 4 }, 5),
      ).rejects.toThrow(/ประกาศเผยแพร่/);
    });

    it('hard-block: แผนที่อ้างอิงยังไม่ประกาศ (ppStatus != 1) → throw', async () => {
      const order = {
        orderId: 1,
        orderStatus: 3,
        del: 0,
        scId: 5,
        budgets: 600000,
        methodType: PROCUREMENT_METHOD.SELECTIVE,
        isUrgent: 0,
        urgentClause: null,
        ppiId: 5,
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      regulatoryConfig.getThreshold
        .mockResolvedValueOnce(500000)
        .mockResolvedValueOnce(500000);
      planItemRepo.findOne.mockResolvedValue({ ppiId: 5, ppId: 2, del: 0 });
      planRepo.findOne.mockResolvedValue({ ppId: 2, ppStatus: 0, del: 0 });

      await expect(
        service.approveParcelBySupplie({ order_id: 1, order_status: 4 }, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('reject (target 0): ไม่ตรวจ compliance และ prefix [ปฏิเสธ]', async () => {
      const order = {
        orderId: 1,
        orderStatus: 3,
        del: 0,
        scId: 5,
        budgets: 9999999,
        remark: 'เดิม',
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);

      const result = await service.approveParcelBySupplie(
        { order_id: 1, order_status: 0, remark_cf: 'ไม่ผ่าน' },
        5,
      );
      expect(regulatoryConfig.getThreshold).not.toHaveBeenCalled();
      expect(order.remark).toBe('[ปฏิเสธ] ไม่ผ่าน');
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── approveParcelByCeo (status 4 → 5) ────────────────────────────────────
  describe('approveParcelByCeo', () => {
    it('ต้องอยู่สถานะ 4 ก่อน มิฉะนั้น throw', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 3, del: 0 });
      await expect(
        service.approveParcelByCeo({ order_id: 1, order_status: 5 } as any, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path 4 → 5 บันทึก remarkCfCeo', async () => {
      const order = { orderId: 1, orderStatus: 4, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.approveParcelByCeo(
        { order_id: 1, order_status: 5, remark: 'ผอ.อนุมัติ' } as any,
        5,
      );
      expect(order.orderStatus).toBe(5);
      expect(order.remarkCfCeo).toBe('ผอ.อนุมัติ');
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── cancelParcelOrder ────────────────────────────────────────────────────
  describe('cancelParcelOrder', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.cancelParcelOrder(
        { order_id: 1, cancel_reason: 'x' },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('สถานะ 9 (ยกเลิกแล้ว) → flag: false', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 9, del: 0 });
      const result = await service.cancelParcelOrder(
        { order_id: 1, cancel_reason: 'x' },
        5,
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('ยกเลิก');
    });

    it('สถานะ 8 (สำเร็จ) → ยกเลิกไม่ได้', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 8, del: 0 });
      const result = await service.cancelParcelOrder(
        { order_id: 1, cancel_reason: 'x' },
        5,
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เสร็จสมบูรณ์');
    });

    it('ไม่ระบุเหตุผล → flag: false', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, orderStatus: 3, del: 0 });
      const result = await service.cancelParcelOrder(
        { order_id: 1, cancel_reason: '   ' },
        5,
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เหตุผล');
    });

    it('happy path → orderStatus=9, cancelReason trim, cancelDate set', async () => {
      const order = { orderId: 1, orderStatus: 3, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.cancelParcelOrder(
        { order_id: 1, cancel_reason: '  ยกเลิกเพราะงบหมด  ', up_by: 7 },
        5,
      );
      expect(order.orderStatus).toBe(9);
      expect(order.cancelReason).toBe('ยกเลิกเพราะงบหมด');
      expect(order.cancelBy).toBe(7);
      expect(order.cancelDate).toBeInstanceOf(Date);
      expect(order.upBy).toBe(7);
      expect(result.flag).toBe(true);
    });
  });

  // ─── setParcelOrderUrgent ─────────────────────────────────────────────────
  describe('setParcelOrderUrgent', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.setParcelOrderUrgent(
        { order_id: 1, is_urgent: 1, urgent_reason: 'x' },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('urgent=1 แต่ไม่ระบุเหตุผล → flag: false', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, del: 0 });
      const result = await service.setParcelOrderUrgent(
        { order_id: 1, is_urgent: 1, urgent_reason: '  ' },
        5,
      );
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('เร่งด่วน');
    });

    it('urgent=1: set clause default 56(2)(ง) เมื่อไม่ส่ง clause', async () => {
      const order = { orderId: 1, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      await service.setParcelOrderUrgent(
        { order_id: 1, is_urgent: 1, urgent_reason: 'ด่วนมาก' },
        5,
      );
      expect(order.isUrgent).toBe(1);
      expect(order.urgentClause).toBe('56(2)(ง)');
      expect(order.urgentReason).toBe('ด่วนมาก');
    });

    it('urgent=0: ล้าง clause และ reason เป็น null', async () => {
      const order = {
        orderId: 1,
        del: 0,
        isUrgent: 1,
        urgentClause: 'x',
        urgentReason: 'y',
      } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.setParcelOrderUrgent(
        { order_id: 1, is_urgent: 0 },
        5,
      );
      expect(order.isUrgent).toBe(0);
      expect(order.urgentClause).toBeNull();
      expect(order.urgentReason).toBeNull();
      expect(result.ms).toContain('ยกเลิกสถานะเร่งด่วน');
    });
  });

  // ─── addProjectApprove ────────────────────────────────────────────────────
  describe('addProjectApprove', () => {
    it('สร้าง PlnProjApprove และคืน flag: true', async () => {
      ppaRepo.create.mockImplementation((x: any) => x);
      ppaRepo.save.mockResolvedValue({});
      const result = await service.addProjectApprove({
        sc_id: 5,
        acad_year: 2569,
        proj_id: 3,
        numbers: 1,
        details: 'รายละเอียด',
      } as any);
      expect(result).toEqual({ flag: true });
      const created = ppaRepo.create.mock.calls[0][0];
      expect(created.scId).toBe(5);
      expect(created.acadYear).toBe(2569);
      // safeDate fallback เมื่อไม่ส่งวันที่
      expect(created.operateDate).toBeInstanceOf(Date);
    });

    it('alias fields (project_name/project_code/budget_amount) ถูก map', async () => {
      ppaRepo.create.mockImplementation((x: any) => x);
      ppaRepo.save.mockResolvedValue({});
      await service.addProjectApprove({
        sc_id: 5,
        acad_year: 2569,
        proj_id: 3,
        numbers: 1,
        project_name: 'ชื่อโครงการ',
        project_code: 'CODE-1',
        budget_amount: 12345,
      } as any);
      const created = ppaRepo.create.mock.calls[0][0];
      expect(created.details).toBe('ชื่อโครงการ');
      expect(created.resources).toBe('CODE-1');
      expect(created.budgets).toBe(12345);
      expect(created.totalBudgets).toBe(12345);
    });
  });

  // ─── updateProjectApprove ─────────────────────────────────────────────────
  describe('updateProjectApprove', () => {
    it('ไม่พบข้อมูล → flag: false', async () => {
      ppaRepo.findOne.mockResolvedValue(null);
      const result = await service.updateProjectApprove(
        { ppa_id: 99 } as any,
        5,
      );
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่พบข้อมูลการอนุมัติโครงการ',
      });
    });

    it('cross-tenant: findOne ใช้ scId + del=0', async () => {
      ppaRepo.findOne.mockResolvedValue(null);
      await service.updateProjectApprove({ ppa_id: 1 } as any, 77);
      expect(ppaRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ppaId: 1, scId: 77, del: 0 }),
        }),
      );
    });

    it('update เฉพาะ field ที่ส่งมา (partial)', async () => {
      const ppa = {
        ppaId: 1,
        scId: 5,
        del: 0,
        details: 'เดิม',
        budgets: 100,
      } as any;
      ppaRepo.findOne.mockResolvedValue(ppa);
      ppaRepo.save.mockResolvedValue(ppa);
      const result = await service.updateProjectApprove(
        { ppa_id: 1, budgets: 9999 } as any,
        5,
      );
      expect(ppa.details).toBe('เดิม');
      expect(ppa.budgets).toBe(9999);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── removeParcelOrder ────────────────────────────────────────────────────
  describe('removeParcelOrder', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.removeParcelOrder(
        { order_id: 1, del: 1 },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('soft delete (set del) และ flag: true', async () => {
      const order = { orderId: 1, scId: 5, del: 0 } as any;
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.removeParcelOrder(
        { order_id: 1, del: 1 },
        5,
      );
      expect(order.del).toBe(1);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── loadParcelDetail / loadSuppilesByOrderID ─────────────────────────────
  describe('loadParcelDetail', () => {
    it('map field และ filter del=0', async () => {
      pdRepo.find.mockResolvedValue([
        { pcId: 1, orderId: 7, suppId: 2, pcTotal: 500, del: 0 },
      ]);
      const result = await service.loadParcelDetail({ order_id: 7 } as any);
      expect(pdRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderId: 7, del: 0 } }),
      );
      expect(result[0].pc_id).toBe(1);
      expect(result[0].supp_id).toBe(2);
    });
  });

  describe('loadSuppilesByOrderID', () => {
    it('ไม่พบ order → คืน array ว่าง', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.loadSuppilesByOrderID(7, 5);
      expect(result).toEqual([]);
      expect(pdRepo.find).not.toHaveBeenCalled();
    });

    it('พบ order → map detail พร้อม count = pc_total', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 7, scId: 5, del: 0 });
      pdRepo.find.mockResolvedValue([
        { pcId: 1, orderId: 7, suppId: 2, pcTotal: 800, del: 0 },
      ]);
      const result = await service.loadSuppilesByOrderID(7, 5);
      expect(result[0].count).toBe(800);
      expect(result[0].pc_total).toBe(800);
    });
  });

  // ─── loadPartner / loadProject / loadDirector ─────────────────────────────
  describe('loadPartner', () => {
    it('filter scId, del=0 และ map field', async () => {
      partnerRepo.find.mockResolvedValue([
        { pId: 3, pName: 'ผู้ค้า', payType: 1, calVat: 0, del: 0 },
      ]);
      const result = await service.loadPartner(5);
      expect(result[0]).toEqual({
        p_id: 3,
        p_name: 'ผู้ค้า',
        pay_type: 1,
        cal_vat: 0,
        del: 0,
      });
    });
  });

  describe('loadProject', () => {
    it('filter scId, del=0 และ map snake_case', async () => {
      poRepo.find.mockResolvedValue([
        {
          orderId: 1,
          projectId: 2,
          projectType: 1,
          scId: 5,
          bgTypeId: 3,
          adminId: 4,
          orderStatus: 1,
        },
      ]);
      const result = await service.loadProject(5);
      expect(result[0].order_id).toBe(1);
      expect(result[0].project_type).toBe(1);
      expect(result[0].bg_type_id).toBe(3);
    });
  });

  describe('loadDirector', () => {
    it('query type IN (8, 2), filter del=0 และ map field', async () => {
      const qb = makeQb({
        many: [
          {
            adminId: 1,
            name: 'ผอ.',
            username: 'dir',
            email: 'd@x.com',
            type: 2,
            scId: 5,
          },
        ],
      });
      adminRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.loadDirector(5);
      expect(qb.andWhere).toHaveBeenCalledWith('admin.del = :del', { del: 0 });
      expect(result[0].admin_id).toBe(1);
      expect(result[0].type).toBe(2);
    });
  });

  // ─── บริหารโครงการ: updateParcelOrder ─────────────────────────────────────
  describe('updateParcelOrder', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.updateParcelOrder({ order_id: 1 }, 5);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('สถานะเกินขั้นแก้ไข (2) → flag: false ไม่บันทึก', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 2 });
      const result = await service.updateParcelOrder(
        { order_id: 1, project_type: 2 },
        5,
      );
      expect(result.flag).toBe(false);
      expect(poRepo.save).not.toHaveBeenCalled();
    });

    it('สถานะ 1 → อัปเดต project_type/method_type/budgets และ flag: true', async () => {
      const order: any = { orderId: 1, scId: 5, orderStatus: 1 };
      poRepo.findOne.mockResolvedValue(order);
      poRepo.save.mockResolvedValue(order);
      const result = await service.updateParcelOrder(
        { order_id: 1, project_type: 2, method_type: 1, budgets: 1000 },
        5,
      );
      expect(order.projectType).toBe(2);
      expect(order.methodType).toBe(1);
      expect(order.budgets).toBe(1000);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── บริหารโครงการ: addParcelDetail / removeParcelDetail ──────────────────
  describe('addParcelDetail', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.addParcelDetail(
        { order_id: 1, supp_id: 2, pc_total: 3 },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('สถานะเกินขั้นแก้ไข → flag: false ไม่บันทึก', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 3 });
      const result = await service.addParcelDetail(
        { order_id: 1, supp_id: 2, pc_total: 3 },
        5,
      );
      expect(result.flag).toBe(false);
      expect(pdRepo.save).not.toHaveBeenCalled();
    });

    it('สถานะ 0 → สร้าง parcel_detail และ flag: true', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 0 });
      pdRepo.save.mockResolvedValue({});
      const result = await service.addParcelDetail(
        { order_id: 1, supp_id: 2, pc_total: 3 },
        5,
      );
      expect(pdRepo.create).toHaveBeenCalledWith({
        orderId: 1,
        suppId: 2,
        pcTotal: 3,
        del: 0,
      });
      expect(result).toEqual({ flag: true });
    });
  });

  describe('importParcelDetails', () => {
    it('ไม่พบคำสั่งซื้อ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.importParcelDetails(
        { order_id: 1, items: [{ supp_name: 'กระดาษ', qty: 1 }] },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบคำสั่งซื้อ' });
    });

    it('สถานะเกินขั้นแก้ไข → flag: false ไม่บันทึก', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 3 });
      const result = await service.importParcelDetails(
        { order_id: 1, items: [{ supp_name: 'กระดาษ', qty: 1 }] },
        5,
      );
      expect(result.flag).toBe(false);
      expect(pdRepo.save).not.toHaveBeenCalled();
    });

    it('ไม่มีรายการในไฟล์ → flag: false', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 0 });
      const result = await service.importParcelDetails(
        { order_id: 1, items: [] },
        5,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการในไฟล์' });
    });

    it('จับคู่พัสดุเดิมตามชื่อ → เพิ่ม detail โดยไม่สร้างพัสดุใหม่', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 0 });
      suppliesRepo.find.mockResolvedValue([
        { suppId: 7, suppNo: 'A001', suppName: 'กระดาษ A4', scId: 5, del: 0 },
      ]);
      unitRepo.find.mockResolvedValue([]);
      const result = await service.importParcelDetails(
        { order_id: 1, items: [{ supp_name: 'กระดาษ A4', qty: 5 }] },
        5,
      );
      expect(suppliesRepo.save).not.toHaveBeenCalled();
      expect(pdRepo.create).toHaveBeenCalledWith({
        orderId: 1,
        suppId: 7,
        pcTotal: 5,
        del: 0,
      });
      expect(result.flag).toBe(true);
      expect(result.added).toBe(1);
      expect(result.created_supplies).toBe(0);
    });

    it('ไม่พบพัสดุ → สร้างพัสดุ+หน่วยใหม่แล้วเพิ่ม detail', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 1 });
      suppliesRepo.find.mockResolvedValue([]);
      unitRepo.find.mockResolvedValue([]);
      const result = await service.importParcelDetails(
        {
          order_id: 1,
          up_by: 11,
          items: [{ supp_name: 'ปากกาใหม่', qty: 3, price: 15, unit: 'ด้าม' }],
        },
        5,
      );
      expect(unitRepo.save).toHaveBeenCalled();
      expect(suppliesRepo.save).toHaveBeenCalled();
      expect(pdRepo.save).toHaveBeenCalled();
      expect(result.flag).toBe(true);
      expect(result.created_supplies).toBe(1);
      expect(result.created_units).toBe(1);
    });

    it('จำนวนไม่ถูกต้อง → เก็บ error และข้ามแถว', async () => {
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 0 });
      suppliesRepo.find.mockResolvedValue([
        { suppId: 7, suppNo: 'A001', suppName: 'กระดาษ A4', scId: 5, del: 0 },
      ]);
      unitRepo.find.mockResolvedValue([]);
      const result = await service.importParcelDetails(
        { order_id: 1, items: [{ supp_name: 'กระดาษ A4', qty: 0 }] },
        5,
      );
      expect(result.flag).toBe(false);
      expect(result.added).toBe(0);
      expect(result.errors?.length).toBe(1);
      expect(pdRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeParcelDetail', () => {
    it('ไม่พบรายการพัสดุ → flag: false', async () => {
      pdRepo.findOne.mockResolvedValue(null);
      const result = await service.removeParcelDetail({ pc_id: 9 }, 5);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบรายการพัสดุ' });
    });

    it('คำสั่งซื้อข้ามโรงเรียน (ไม่พบ order) → flag: false', async () => {
      pdRepo.findOne.mockResolvedValue({ pcId: 9, orderId: 1, del: 0 });
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.removeParcelDetail({ pc_id: 9 }, 5);
      expect(result).toEqual({
        flag: false,
        ms: 'ไม่พบคำสั่งซื้อของรายการนี้',
      });
    });

    it('สถานะแก้ไขได้ → soft delete (del=1) และ flag: true', async () => {
      const detail: any = { pcId: 9, orderId: 1, del: 0 };
      pdRepo.findOne.mockResolvedValue(detail);
      poRepo.findOne.mockResolvedValue({ orderId: 1, scId: 5, orderStatus: 1 });
      pdRepo.save.mockResolvedValue(detail);
      const result = await service.removeParcelDetail({ pc_id: 9 }, 5);
      expect(detail.del).toBe(1);
      expect(result).toEqual({ flag: true });
    });
  });

  // ─── พิมพ์เอกสารจัดซื้อ: loadOrderForPrint ────────────────────────────────
  describe('loadOrderForPrint', () => {
    it('ไม่พบคำสั่งซื้อ → คืน null', async () => {
      poRepo.findOne.mockResolvedValue(null);
      const result = await service.loadOrderForPrint(1, 5);
      expect(result).toBeNull();
    });

    it('รวม order + items(ชื่อพัสดุ) + committee(ชื่อ) + partner + project + school', async () => {
      poRepo.findOne.mockResolvedValue({
        orderId: 1,
        scId: 5,
        committee1: 11,
        committee2: 12,
        committee3: 0,
        suppliers: 7,
        projectId: 3,
        details: 'โครงการ ก',
      });
      pdRepo.find.mockResolvedValue([
        { pcId: 100, suppId: 200, pcTotal: 5, del: 0 },
      ]);
      suppliesRepo.find.mockResolvedValue([
        { suppId: 200, suppName: 'กระดาษ A4' },
      ]);
      adminRepo.find.mockResolvedValue([
        { adminId: 11, name: 'ครู ก' },
        { adminId: 12, name: 'ครู ข' },
      ]);
      // director (type 2) สำหรับลงนามท้ายเอกสาร
      adminRepo.findOne.mockResolvedValue({ adminId: 99, name: 'ผอ. ทดสอบ' });
      partnerRepo.findOne.mockResolvedValue({
        pId: 7,
        pName: 'ร้านค้า ค',
        pAddress: '19 หมู่ 3',
        pTel: '0654939321',
        pIdTax: '8571584128811',
        calVat: 1,
      });
      projectRepo.findOne.mockResolvedValue({
        projId: 3,
        projName: 'โครงการจริง',
      });
      schoolRepo.findOne.mockResolvedValue({
        scId: 5,
        scName: 'โรงเรียนทดสอบ',
        add1: '111',
        tumbol: 'ทดสอบ',
        tel: '053',
      });

      const result = await service.loadOrderForPrint(1, 5);
      expect(result).not.toBeNull();
      expect(result!.items[0].supp_name).toBe('กระดาษ A4');
      expect(result!.committee).toEqual(['ครู ก', 'ครู ข']); // committee3=0 ถูกตัด
      expect(result!.partner).toEqual({
        p_id: 7,
        p_name: 'ร้านค้า ค',
        p_address: '19 หมู่ 3',
        p_tel: '0654939321',
        p_tax_id: '8571584128811',
        cal_vat: 1,
      });
      expect(result!.project_name).toBe('โครงการจริง');
      expect(result!.school_name).toBe('โรงเรียนทดสอบ');
      expect(result!.director_name).toBe('ผอ. ทดสอบ');
    });
  });
});
