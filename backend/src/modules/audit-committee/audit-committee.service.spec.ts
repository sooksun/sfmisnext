import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditCommitteeService } from './audit-committee.service';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Project } from '../project/entities/project.entity';

describe('AuditCommitteeService', () => {
  let service: AuditCommitteeService;
  let repo: jest.Mocked<any>;
  let projectRepo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    projectRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditCommitteeService,
        { provide: getRepositoryToken(ParcelOrder), useValue: repo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
      ],
    }).compile();

    service = module.get(AuditCommitteeService);
  });

  // ─── loadAuditCommitteeStatus ────────────────────────────────────────────────
  describe('loadAuditCommitteeStatus', () => {
    it('filter scId และ del=0', async () => {
      repo.find.mockResolvedValue([]);
      await service.loadAuditCommitteeStatus(5, 3);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scId: 5, del: 0 }),
        }),
      );
    });

    it('คืน { data, count } ถูกต้อง', async () => {
      repo.find.mockResolvedValue([
        {
          orderId: 1,
          projectId: 2,
          projectType: 1,
          scId: 5,
          bgTypeId: 1,
          adminId: 3,
        },
      ]);

      const result = await service.loadAuditCommitteeStatus(5, 3);
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].order_id).toBe(1);
      expect(result.data[0].sc_id).toBe(5);
    });

    it('คืน array ว่างและ count=0 ถ้าไม่มีข้อมูล', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.loadAuditCommitteeStatus(1, 1);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('map ทุก field ของ parcel_order ถูกต้อง', async () => {
      const order = {
        orderId: 7,
        projectId: 2,
        projectType: 1,
        scId: 5,
        bgTypeId: 2,
        adminId: 4,
        orderDate: null,
        orderStatus: 3,
        remark: 'test',
        remarkCfPlan: null,
        remarkCfBusiness: null,
        remarkCfSuppile: null,
        remarkCfCeo: null,
        operateDate: null,
        acadYear: 2568,
        numbers: '5',
        details: 'detail',
        pId: 10,
        resources: null,
        budgets: 5000,
        jobType: 1,
        noteNumber: null,
        buyDate: null,
        buyReason: null,
        departments: null,
        dueDate: null,
        committee1: 1,
        committee2: 2,
        committee3: 3,
        dateDeadline: null,
        dayDeadline: 30,
        bookOrderCommittee: null,
        dateOrderCommittee: null,
        bookReportNumber: null,
        dateBookReport: null,
        suppliers: 8,
        presentCost: 4500,
        dateWin: null,
        numberOrders: null,
        ordersDate: null,
        dueOrdersDate: null,
        overDueDate: null,
        proveDate: null,
        numberReportWiddraw: null,
        dateReportWiddraw: null,
        upBy: 1,
      };
      repo.find.mockResolvedValue([order]);

      const result = await service.loadAuditCommitteeStatus(5, 3);
      const row = result.data[0];
      expect(row.committee1).toBe(1);
      expect(row.committee2).toBe(2);
      expect(row.committee3).toBe(3);
      expect(row.budgets).toBe(5000);
    });

    it('เติม project_name (join pln_project) และ order_name (= details)', async () => {
      repo.find.mockResolvedValue([
        { orderId: 1, projectId: 2, scId: 5, details: 'ซื้อกระดาษ' },
      ]);
      projectRepo.find.mockResolvedValue([{ projId: 2, projName: 'โครงการพัฒนา' }]);

      const result = await service.loadAuditCommitteeStatus(5, 3);
      expect(result.data[0].project_name).toBe('โครงการพัฒนา');
      expect(result.data[0].order_name).toBe('ซื้อกระดาษ');
    });
  });

  // ─── updateSetCommittee ──────────────────────────────────────────────────────
  describe('updateSetCommittee', () => {
    const dto = {
      order_id: 10,
      committee1: 1,
      committee2: 2,
      committee3: 3,
      order_status: 6,
      p_id: 5,
      day_deadline: 30,
      date_deadline: '2026-06-30',
    };

    it('ไม่พบ order → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.updateSetCommittee(dto);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล' });
    });

    it('happy path → บันทึกสำเร็จ flag: true', async () => {
      const order = { orderId: 10, del: 0 } as any;
      repo.findOne.mockResolvedValue(order);
      repo.save.mockResolvedValue(order);

      const result = await service.updateSetCommittee(dto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('set committee1, 2, 3 จาก dto', async () => {
      const order = {} as any;
      repo.findOne.mockResolvedValue(order);
      repo.save.mockResolvedValue(order);

      await service.updateSetCommittee({
        ...dto,
        committee1: 5,
        committee2: 6,
        committee3: 7,
      });
      expect(order.committee1).toBe(5);
      expect(order.committee2).toBe(6);
      expect(order.committee3).toBe(7);
    });

    it('แปลง committee string → number', async () => {
      const order = {} as any;
      repo.findOne.mockResolvedValue(order);
      repo.save.mockResolvedValue(order);

      await service.updateSetCommittee({ ...dto, committee1: '3' as any });
      expect(order.committee1).toBe(3);
    });

    it('set dateDeadline และ dueDate จาก dto.date_deadline', async () => {
      const order = {} as any;
      repo.findOne.mockResolvedValue(order);
      repo.save.mockResolvedValue(order);

      await service.updateSetCommittee(dto);
      expect(order.dateDeadline).toBeInstanceOf(Date);
      expect(order.dueDate).toBeInstanceOf(Date);
    });

    it('DB error → flag: false พร้อมข้อความ error', async () => {
      repo.findOne.mockResolvedValue({ orderId: 10, del: 0 });
      repo.save.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.updateSetCommittee(dto);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('DB connection lost');
    });

    it('filter ด้วย del=0 ที่ findOne', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.updateSetCommittee(dto);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ del: 0 }) }),
      );
    });
  });
});
