import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProcurementPlanService } from './procurement-plan.service';
import { PlnProcurementPlan } from './entities/pln-procurement-plan.entity';
import { PlnProcurementPlanItem } from './entities/pln-procurement-plan-item.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { type JwtUser } from '../../common/utils/tenant-guard';

// ─── QueryBuilder mock factory (getMany) ─────────────────────────────────────
function makeQb(many: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as any;
  ['where', 'andWhere', 'orderBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb['getMany'] = jest.fn().mockResolvedValue(many);
  return qb;
}

const ownerUser: JwtUser = { type: 2, sc_id: 1 } as JwtUser;
const adminUser: JwtUser = { type: 1, sc_id: 99 } as JwtUser;
const otherUser: JwtUser = { type: 2, sc_id: 2 } as JwtUser;

describe('ProcurementPlanService', () => {
  let service: ProcurementPlanService;
  let planRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let orderRepo: jest.Mocked<any>;

  beforeEach(async () => {
    planRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb([])),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    itemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb([])),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    orderRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb([])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementPlanService,
        { provide: getRepositoryToken(PlnProcurementPlan), useValue: planRepo },
        {
          provide: getRepositoryToken(PlnProcurementPlanItem),
          useValue: itemRepo,
        },
        { provide: getRepositoryToken(ParcelOrder), useValue: orderRepo },
      ],
    }).compile();

    service = module.get(ProcurementPlanService);
  });

  // ─── loadPlan ──────────────────────────────────────────────────────────────
  describe('loadPlan', () => {
    it('filter del=0 + scId + acadYear และคืนรูปแบบ list', async () => {
      const qb = makeQb([{ ppId: 1 }]);
      planRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.loadPlan(1, 2569);
      expect(qb.where).toHaveBeenCalledWith('p.del = 0');
      expect(qb.andWhere).toHaveBeenCalledWith('p.sc_id = :scId', { scId: 1 });
      expect(qb.andWhere).toHaveBeenCalledWith('p.acad_year = :acadYear', {
        acadYear: 2569,
      });
      expect(result).toEqual({
        data: [{ ppId: 1 }],
        count: 1,
        page: 1,
        pageSize: 1,
      });
    });
  });

  // ─── loadPlanDetail ─────────────────────────────────────────────────────────
  describe('loadPlanDetail', () => {
    it('ไม่พบแผน → NotFoundException', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(service.loadPlanDetail(1, ownerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('โรงเรียนอื่น (type != 1, scId ไม่ตรง) → ForbiddenException', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, del: 0 });
      await expect(service.loadPlanDetail(1, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('admin (type=1) เข้าดูข้ามโรงเรียนได้', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, del: 0 });
      itemRepo.createQueryBuilder.mockReturnValue(makeQb([{ ppiId: 5 }]));
      const result = await service.loadPlanDetail(1, adminUser);
      expect(result.data.items).toHaveLength(1);
    });

    it('เจ้าของโรงเรียน → คืน plan + items', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, del: 0 });
      itemRepo.createQueryBuilder.mockReturnValue(makeQb([{ ppiId: 5 }]));
      const result = await service.loadPlanDetail(1, ownerUser);
      expect(result.data.plan.ppId).toBe(1);
      expect(result.count).toBe(1);
    });
  });

  // ─── addPlan ────────────────────────────────────────────────────────────────
  describe('addPlan', () => {
    it('สร้างแผน status=0 (ร่าง) flag: true', async () => {
      planRepo.save.mockImplementation(async (x: any) => {
        x.ppId = 10;
        return x;
      });
      const result = await service.addPlan({
        sc_id: 1,
        acad_year: 2569,
        pp_title: 'แผนจัดซื้อ',
        pp_total_budget: 100000,
        up_by: 9,
      });
      expect(planRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scId: 1,
          ppStatus: 0,
          ppTotalBudget: 100000,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ flag: true, pp_id: 10 }),
      );
    });
  });

  // ─── updatePlan ──────────────────────────────────────────────────────────────
  describe('updatePlan', () => {
    it('ไม่พบแผน → NotFoundException', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updatePlan({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('โรงเรียนอื่น → ForbiddenException', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 0 });
      await expect(
        service.updatePlan({ pp_id: 1 } as any, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('แผนประกาศแล้ว (ppStatus=1) → BadRequestException', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 1 });
      await expect(
        service.updatePlan({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path → อัปเดต flag: true', async () => {
      const plan: any = { ppId: 1, scId: 1, ppStatus: 0, ppTitle: 'เดิม' };
      planRepo.findOne.mockResolvedValue(plan);
      const result = await service.updatePlan(
        { pp_id: 1, pp_title: 'ใหม่' } as any,
        ownerUser,
      );
      expect(plan.ppTitle).toBe('ใหม่');
      expect(result.flag).toBe(true);
    });

    it('remark undefined → คง remark เดิม (M7)', async () => {
      const plan: any = { ppId: 1, scId: 1, ppStatus: 0, remark: 'เดิม' };
      planRepo.findOne.mockResolvedValue(plan);
      await service.updatePlan({ pp_id: 1 } as any, ownerUser);
      expect(plan.remark).toBe('เดิม');
    });

    it('remark = "" (ตั้งใจล้าง) → อัปเดตเป็นค่าว่าง', async () => {
      const plan: any = { ppId: 1, scId: 1, ppStatus: 0, remark: 'เดิม' };
      planRepo.findOne.mockResolvedValue(plan);
      await service.updatePlan({ pp_id: 1, remark: '' } as any, ownerUser);
      expect(plan.remark).toBe('');
    });

    it('ลดวงเงินแผนต่ำกว่ายอดรวมรายการ → BadRequestException (ดักต้นทาง)', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 0 });
      itemRepo.find.mockResolvedValue([
        { itemBudget: 20000 },
        { itemBudget: 10000 }, // รวม 30000
      ]);
      await expect(
        service.updatePlan(
          { pp_id: 1, pp_total_budget: 1000 } as any,
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ลดวงเงินแผนแต่ยังคลุมยอดรวมรายการ → อัปเดตได้', async () => {
      const plan: any = { ppId: 1, scId: 1, ppStatus: 0, ppTotalBudget: 50000 };
      planRepo.findOne.mockResolvedValue(plan);
      itemRepo.find.mockResolvedValue([{ itemBudget: 30000 }]);
      const result = await service.updatePlan(
        { pp_id: 1, pp_total_budget: 40000 } as any,
        ownerUser,
      );
      expect(plan.ppTotalBudget).toBe(40000);
      expect(result.flag).toBe(true);
    });
  });

  // ─── removePlan ─────────────────────────────────────────────────────────────
  describe('removePlan', () => {
    it('ไม่พบแผน → NotFoundException', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(service.removePlan(1, 9, ownerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('แผนประกาศแล้ว → BadRequestException (ลบไม่ได้)', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 1 });
      await expect(service.removePlan(1, 9, ownerUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('happy path → soft delete (del=1)', async () => {
      const plan: any = { ppId: 1, scId: 1, ppStatus: 0, del: 0 };
      planRepo.findOne.mockResolvedValue(plan);
      const result = await service.removePlan(1, 9, ownerUser);
      expect(plan.del).toBe(1);
      expect(plan.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });
  });

  // ─── announcePlan ───────────────────────────────────────────────────────────
  describe('announcePlan', () => {
    it('ไม่พบแผน → NotFoundException', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(
        service.announcePlan({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('โรงเรียนอื่น → ForbiddenException', async () => {
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppTotalBudget: 100000,
      });
      await expect(
        service.announcePlan({ pp_id: 1 } as any, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ยอดรวมรายการเกินวงเงินแผน → BadRequestException', async () => {
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppTotalBudget: 1000,
      });
      itemRepo.find.mockResolvedValue([
        { itemBudget: 800 },
        { itemBudget: 500 }, // รวม 1300 > 1000
      ]);
      await expect(
        service.announcePlan({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path → ppStatus=1 + announceDate flag: true', async () => {
      const plan: any = { ppId: 1, scId: 1, ppTotalBudget: 100000 };
      planRepo.findOne.mockResolvedValue(plan);
      itemRepo.find.mockResolvedValue([{ itemBudget: 5000 }]);
      const result = await service.announcePlan(
        { pp_id: 1, announce_date: '2026-05-01', up_by: 9 } as any,
        ownerUser,
      );
      expect(plan.ppStatus).toBe(1);
      expect(plan.announceDate).toBeInstanceOf(Date);
      expect(result.flag).toBe(true);
    });
  });

  // ─── loadAvailablePlan ──────────────────────────────────────────────────────
  describe('loadAvailablePlan', () => {
    it('filter เฉพาะแผนที่ประกาศแล้ว (pp_status=1)', async () => {
      const qb = makeQb([]);
      planRepo.createQueryBuilder.mockReturnValue(qb);
      await service.loadAvailablePlan(1, 2569);
      expect(qb.andWhere).toHaveBeenCalledWith('p.pp_status = 1');
    });
  });

  // ─── addPlanItem ────────────────────────────────────────────────────────────
  describe('addPlanItem', () => {
    it('ไม่พบแผน → NotFoundException', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addPlanItem({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('แผนประกาศแล้ว → BadRequestException', async () => {
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 1 });
      await expect(
        service.addPlanItem({ pp_id: 1 } as any, ownerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('item_budget ทำให้รวมเกินวงเงินแผน → BadRequestException (M8)', async () => {
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppStatus: 0,
        ppTotalBudget: 1000,
      });
      itemRepo.find.mockResolvedValue([{ itemBudget: 800 }]);
      await expect(
        service.addPlanItem(
          { pp_id: 1, item_budget: 500 } as any, // 800+500 > 1000
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path → เพิ่มรายการ flag: true', async () => {
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppStatus: 0,
        ppTotalBudget: 100000,
      });
      itemRepo.find.mockResolvedValue([]);
      itemRepo.save.mockImplementation(async (x: any) => {
        x.ppiId = 20;
        return x;
      });
      const result = await service.addPlanItem(
        { pp_id: 1, item_title: 'รายการ', item_budget: 5000 } as any,
        ownerUser,
      );
      expect(result).toEqual(
        expect.objectContaining({ flag: true, ppi_id: 20 }),
      );
    });

    it('method_type default = 3 (เฉพาะเจาะจง) เมื่อไม่ส่ง', async () => {
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppStatus: 0,
        ppTotalBudget: 100000,
      });
      itemRepo.find.mockResolvedValue([]);
      await service.addPlanItem({ pp_id: 1, item_budget: 0 } as any, ownerUser);
      expect(itemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ methodType: 3 }),
      );
    });
  });

  // ─── updatePlanItem ─────────────────────────────────────────────────────────
  describe('updatePlanItem', () => {
    it('ไม่พบรายการ → NotFoundException', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updatePlanItem({ ppi_id: 1 } as any, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('แผนประกาศแล้ว → BadRequestException', async () => {
      itemRepo.findOne.mockResolvedValue({ ppiId: 1, ppId: 1, del: 0 });
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 1 });
      await expect(
        service.updatePlanItem({ ppi_id: 1 } as any, ownerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path → อัปเดตรายการ flag: true', async () => {
      const item: any = { ppiId: 1, ppId: 1, del: 0, itemTitle: 'เดิม' };
      itemRepo.findOne.mockResolvedValue(item);
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 0 });
      const result = await service.updatePlanItem(
        { ppi_id: 1, item_title: 'ใหม่' } as any,
        ownerUser,
      );
      expect(item.itemTitle).toBe('ใหม่');
      expect(result.flag).toBe(true);
    });

    it('แก้วงเงินรายการจนรวมเกินวงเงินแผน → BadRequestException (ดักต้นทาง)', async () => {
      const item: any = { ppiId: 1, ppId: 1, del: 0, itemBudget: 500 };
      itemRepo.findOne.mockResolvedValue(item);
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppStatus: 0,
        ppTotalBudget: 1000,
      });
      itemRepo.find.mockResolvedValue([
        { ppiId: 1, itemBudget: 500 },
        { ppiId: 2, itemBudget: 400 }, // อื่น ๆ รวม 400
      ]);
      // 400 + 700 = 1100 > 1000
      await expect(
        service.updatePlanItem(
          { ppi_id: 1, item_budget: 700 } as any,
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('แก้วงเงินรายการแต่ยังไม่เกินวงเงินแผน → อัปเดตได้', async () => {
      const item: any = { ppiId: 1, ppId: 1, del: 0, itemBudget: 500 };
      itemRepo.findOne.mockResolvedValue(item);
      planRepo.findOne.mockResolvedValue({
        ppId: 1,
        scId: 1,
        ppStatus: 0,
        ppTotalBudget: 1000,
      });
      itemRepo.find.mockResolvedValue([
        { ppiId: 1, itemBudget: 500 },
        { ppiId: 2, itemBudget: 400 },
      ]);
      // 400 + 600 = 1000 ≤ 1000
      const result = await service.updatePlanItem(
        { ppi_id: 1, item_budget: 600 } as any,
        ownerUser,
      );
      expect(item.itemBudget).toBe(600);
      expect(result.flag).toBe(true);
    });
  });

  // ─── removePlanItem ─────────────────────────────────────────────────────────
  describe('removePlanItem', () => {
    it('ไม่พบรายการ → NotFoundException', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.removePlanItem(1, 9, ownerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('แผนประกาศแล้ว → BadRequestException', async () => {
      itemRepo.findOne.mockResolvedValue({ ppiId: 1, ppId: 1, del: 0 });
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 1 });
      await expect(service.removePlanItem(1, 9, ownerUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('happy path → soft delete (del=1)', async () => {
      const item: any = { ppiId: 1, ppId: 1, del: 0 };
      itemRepo.findOne.mockResolvedValue(item);
      planRepo.findOne.mockResolvedValue({ ppId: 1, scId: 1, ppStatus: 0 });
      const result = await service.removePlanItem(1, 9, ownerUser);
      expect(item.del).toBe(1);
      expect(result.flag).toBe(true);
    });
  });

  // ─── progressReport ─────────────────────────────────────────────────────────
  describe('progressReport', () => {
    it('ไม่มีแผน → summary เป็น 0 ทั้งหมด', async () => {
      planRepo.find.mockResolvedValue([]);
      const result = await service.progressReport(1, 2569);
      expect(result.data).toEqual([]);
      expect(result.summary.grand_plan).toBe(0);
      expect(result.summary.total_items).toBe(0);
    });

    it('คำนวณ variance (plan - actual) และ completion_rate ถูกต้อง', async () => {
      planRepo.find.mockResolvedValue([
        {
          ppId: 1,
          ppNo: 'P-1',
          ppTitle: 'แผน',
          ppTotalBudget: 100000,
          ppStatus: 1,
        },
      ]);
      itemRepo.find.mockResolvedValue([
        { ppiId: 10, itemTitle: 'รายการ1', itemBudget: 5000, methodType: 3 },
        { ppiId: 11, itemTitle: 'รายการ2', itemBudget: 3000, methodType: 1 },
      ]);
      // item 10 → order สำเร็จ (status 8, budgets 4500); item 11 → ไม่มี order
      orderRepo.createQueryBuilder.mockImplementation(() => {
        const qb = makeQb([]);
        qb.getMany = jest.fn().mockImplementation(() => {
          const calls = (orderRepo.createQueryBuilder as jest.Mock).mock.calls
            .length;
          if (calls === 1) {
            return Promise.resolve([
              { orderId: 1, orderStatus: 8, budgets: 4500, isUrgent: 0 },
            ]);
          }
          return Promise.resolve([]);
        });
        return qb;
      });

      const result = await service.progressReport(1, 2569);
      const plan = result.data[0];
      expect(plan.plan_subtotal).toBe(8000); // 5000+3000
      expect(plan.actual_subtotal).toBe(4500);
      expect(plan.variance).toBe(3500);
      // 1 จาก 2 รายการสำเร็จ → 50%
      expect(plan.completion_rate).toBe(50);
      expect(result.summary.completed_items).toBe(1);
    });

    it('order ที่ยกเลิก (status=9) ถูกข้ามเลือก latest ที่ไม่ใช่ 9', async () => {
      planRepo.find.mockResolvedValue([
        {
          ppId: 1,
          ppNo: 'P-1',
          ppTitle: 'แผน',
          ppTotalBudget: 100000,
          ppStatus: 1,
        },
      ]);
      itemRepo.find.mockResolvedValue([
        { ppiId: 10, itemTitle: 'ร', itemBudget: 5000, methodType: 3 },
      ]);
      orderRepo.createQueryBuilder.mockReturnValue(
        makeQb([
          { orderId: 1, orderStatus: 9, budgets: 9999, isUrgent: 0 }, // ยกเลิก
          { orderId: 2, orderStatus: 7, budgets: 4800, isUrgent: 0 }, // จัดซื้อ
        ]),
      );
      const result = await service.progressReport(1, 2569);
      // latestOrder = ตัวที่ไม่ใช่ 9 → budgets 4800
      expect(result.data[0].actual_subtotal).toBe(4800);
    });
  });
});
