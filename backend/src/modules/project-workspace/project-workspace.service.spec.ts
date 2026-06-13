import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectWorkspaceService } from './project-workspace.service';
import { Project } from '../project/entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { ProjectFollowup } from '../project-followup/entities/project-followup.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { AttachmentService } from '../attachment/attachment.service';
import type { JwtUser } from '../../common/utils/tenant-guard';

const superUser: JwtUser = {
  admin_id: 1,
  username: 'super',
  sc_id: 1,
  type: 1,
};
const schoolUser: JwtUser = {
  admin_id: 10,
  username: 'plan',
  sc_id: 5,
  type: 3,
};

/** QueryBuilder mock — คืน rawOne/getCount/getRawMany ตามที่กำหนด */
function makeQb(opts: {
  rawOne?: unknown;
  count?: number;
  rawMany?: unknown[];
}) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as unknown;
  ['select', 'where', 'andWhere'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(chain())),
  );
  qb.getRawOne = jest.fn().mockResolvedValue(opts.rawOne ?? null);
  qb.getCount = jest.fn().mockResolvedValue(opts.count ?? 0);
  qb.getRawMany = jest.fn().mockResolvedValue(opts.rawMany ?? []);
  return qb;
}

describe('ProjectWorkspaceService', () => {
  let service: ProjectWorkspaceService;
  let projectRepo: jest.Mocked<any>;
  let memberRepo: jest.Mocked<any>;
  let taskRepo: jest.Mocked<any>;
  let parcelOrderRepo: jest.Mocked<any>;
  let rwRepo: jest.Mocked<any>;
  let followupRepo: jest.Mocked<any>;
  let adminRepo: jest.Mocked<any>;
  let attachment: jest.Mocked<Pick<AttachmentService, 'list'>>;

  beforeEach(async () => {
    const repoFactory = () => ({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      create: jest.fn().mockImplementation((x) => x),
      createQueryBuilder: jest.fn().mockReturnValue(makeQb({})),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectWorkspaceService,
        { provide: getRepositoryToken(Project), useFactory: repoFactory },
        { provide: getRepositoryToken(ProjectMember), useFactory: repoFactory },
        { provide: getRepositoryToken(ProjectTask), useFactory: repoFactory },
        { provide: getRepositoryToken(ParcelOrder), useFactory: repoFactory },
        { provide: getRepositoryToken(RequestWithdraw), useFactory: repoFactory },
        { provide: getRepositoryToken(ProjectFollowup), useFactory: repoFactory },
        { provide: getRepositoryToken(Admin), useFactory: repoFactory },
        { provide: getRepositoryToken(SchoolYear), useFactory: repoFactory },
        {
          provide: AttachmentService,
          useValue: { list: jest.fn().mockResolvedValue({ data: [], count: 0 }) },
        },
      ],
    }).compile();

    service = module.get(ProjectWorkspaceService);
    projectRepo = module.get(getRepositoryToken(Project));
    memberRepo = module.get(getRepositoryToken(ProjectMember));
    taskRepo = module.get(getRepositoryToken(ProjectTask));
    parcelOrderRepo = module.get(getRepositoryToken(ParcelOrder));
    rwRepo = module.get(getRepositoryToken(RequestWithdraw));
    followupRepo = module.get(getRepositoryToken(ProjectFollowup));
    adminRepo = module.get(getRepositoryToken(Admin));
    attachment = module.get(AttachmentService);
  });

  // ─────────────── recalcProgress ───────────────
  describe('recalcProgress', () => {
    it('คำนวณตามน้ำหนัก: เสร็จ 2/(2+3) → 40%', async () => {
      taskRepo.find.mockResolvedValue([
        { status: 4, weight: 2 },
        { status: 2, weight: 3 },
      ]);
      const p = await service.recalcProgress(1);
      expect(p).toBe(40);
      expect(projectRepo.update).toHaveBeenCalledWith(
        { projId: 1 },
        expect.objectContaining({ progressPercent: 40 }),
      );
    });

    it('ไม่ระบุน้ำหนัก → กระจายเท่ากัน (เสร็จ 1/2 → 50%)', async () => {
      taskRepo.find.mockResolvedValue([
        { status: 4, weight: 0 },
        { status: 1, weight: 0 },
      ]);
      expect(await service.recalcProgress(1)).toBe(50);
    });

    it('ข้ามงานที่ยกเลิก (status=9) ออกจากตัวหาร', async () => {
      taskRepo.find.mockResolvedValue([
        { status: 4, weight: 1 },
        { status: 9, weight: 5 },
      ]);
      expect(await service.recalcProgress(1)).toBe(100);
    });

    it('ไม่มีงาน → 0%', async () => {
      taskRepo.find.mockResolvedValue([]);
      expect(await service.recalcProgress(1)).toBe(0);
    });
  });

  // ─────────────── tenant guard ───────────────
  describe('tenant', () => {
    it('user โรงเรียนอื่นเข้าถึง workspace → Forbidden', async () => {
      projectRepo.findOne.mockResolvedValue({ projId: 9, scId: 999, del: 0 });
      await expect(service.getWorkspace(9, schoolUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('super admin ข้ามโรงเรียนได้', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 9,
        scId: 999,
        del: 0,
        projBudget: 0,
        progressPercent: 0,
        executionStatus: 1,
      });
      await expect(service.getWorkspace(9, superUser)).resolves.toBeDefined();
    });
  });

  // ─────────────── task evidence guard ───────────────
  describe('updateTask evidence guard', () => {
    beforeEach(() => {
      projectRepo.findOne.mockResolvedValue({ projId: 1, scId: 5, del: 0 });
    });

    it('ปิดงานที่บังคับหลักฐานแต่ไม่มีไฟล์ → BadRequest', async () => {
      taskRepo.findOne.mockResolvedValue({
        taskId: 7,
        projectId: 1,
        status: 2,
        evidenceRequired: 1,
      });
      attachment.list.mockResolvedValue({ data: [], count: 0 } as any);
      await expect(
        service.updateTask(1, 7, { status: 4 }, schoolUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ปิดงานที่บังคับหลักฐาน + มีไฟล์ → ผ่าน + set completed', async () => {
      taskRepo.findOne.mockResolvedValue({
        taskId: 7,
        projectId: 1,
        status: 2,
        evidenceRequired: 1,
      });
      attachment.list.mockResolvedValue({
        data: [{ att_id: 1 }],
        count: 1,
      } as any);
      taskRepo.find.mockResolvedValue([{ status: 4, weight: 1 }]);
      const res = await service.updateTask(1, 7, { status: 4 }, schoolUser);
      expect(res.flag).toBe(true);
      const saved = taskRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(4);
      expect(saved.completedBy).toBe(schoolUser.admin_id);
    });
  });

  // ─────────────── budget mapping ───────────────
  describe('getBudgetSummary', () => {
    it('แยกใช้จริง/ผูกพัน/คงเหลือ และ flag เกิน 80%', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 1,
        scId: 5,
        del: 0,
        projBudget: 1000,
      });
      parcelOrderRepo.find.mockResolvedValue([
        { orderId: 100, budgets: 800, orderStatus: 7 },
      ]);
      // เรียก 2 ครั้ง: paid แล้ว committed
      rwRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb({ rawOne: { sum: '500' } })) // paid
        .mockReturnValueOnce(makeQb({ rawOne: { sum: '300' } })); // committed
      const b = await service.getBudgetSummary(1, schoolUser);
      expect(b.allocated).toBe(1000);
      expect(b.actual).toBe(500);
      expect(b.committed).toBe(300);
      expect(b.remaining).toBe(200);
      expect(b.used_percent).toBe(80);
      expect(b.over_threshold).toBe(true);
    });

    it('ไม่มีคำสั่งซื้อ → ใช้จริง/ผูกพัน = 0', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 1,
        scId: 5,
        del: 0,
        projBudget: 1000,
      });
      parcelOrderRepo.find.mockResolvedValue([]);
      const b = await service.getBudgetSummary(1, schoolUser);
      expect(b.actual).toBe(0);
      expect(b.committed).toBe(0);
      expect(b.remaining).toBe(1000);
    });
  });

  // ─────────────── close guard ───────────────
  describe('closeProject', () => {
    beforeEach(() => {
      projectRepo.findOne.mockResolvedValue({ projId: 1, scId: 5, del: 0 });
    });

    it('progress < 100 หรือมีงานค้าง → block', async () => {
      taskRepo.find.mockResolvedValue([
        { status: 2, weight: 1 },
        { status: 4, weight: 1 },
      ]);
      taskRepo.count.mockResolvedValue(1);
      await expect(
        service.closeProject(1, {}, schoolUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ครบเงื่อนไข (100%, ไม่มีงานค้าง, หลักฐานครบ, มีรายงานปลายปี) → ปิดได้', async () => {
      taskRepo.find
        .mockResolvedValueOnce([{ status: 4, weight: 1 }]) // recalcProgress
        .mockResolvedValueOnce([]); // evidenceTasks (evidence_required=1) — ไม่มี
      taskRepo.count.mockResolvedValue(0); // ไม่มีงานค้าง
      followupRepo.createQueryBuilder.mockReturnValue(makeQb({ count: 1 })); // มีรายงานปลายปี
      const res = await service.closeProject(1, { reason: 'จบ' }, schoolUser);
      expect(res.flag).toBe(true);
      expect(projectRepo.update).toHaveBeenCalledWith(
        { projId: 1 },
        expect.objectContaining({ executionStatus: 5 }),
      );
    });
  });

  // ─────────────── execution transition ───────────────
  describe('updateExecution transitions', () => {
    it('เริ่มดำเนินงานโดยยังไม่อนุมัติ → block', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 1,
        scId: 5,
        del: 0,
        projStatus: 0,
        ownerAdminId: 10,
        endDate: '2026-09-30',
      });
      await expect(
        service.updateExecution(1, { execution_status: 3 }, schoolUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ยกเลิกโดยไม่ระบุเหตุผล → block', async () => {
      projectRepo.findOne.mockResolvedValue({ projId: 1, scId: 5, del: 0 });
      await expect(
        service.updateExecution(1, { execution_status: 9 }, schoolUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─────────────── createProcurement (จัดซื้อหลายครั้ง) ───────────────
  describe('createProcurement', () => {
    it('สร้าง parcel_order ใบใหม่ผูกโครงการ + acad_year = budget_year', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 1, scId: 5, del: 0, syId: 3, projName: 'โครงการ A', executionStatus: 3,
      });
      const schoolYearRepo = (service as unknown as { schoolYearRepo: jest.Mocked<any> }).schoolYearRepo;
      schoolYearRepo.findOne.mockResolvedValue({ syId: 3, budgetYear: 2569, syYear: 1 });
      parcelOrderRepo.save.mockResolvedValue({ orderId: 77 });
      const res = await service.createProcurement(1, { project_type: 2, budgets: 5000 }, schoolUser);
      expect(res.flag).toBe(true);
      expect(res.order_id).toBe(77);
      const created = parcelOrderRepo.create.mock.calls[0][0];
      expect(created.projectId).toBe(1);
      expect(created.projectType).toBe(2);
      expect(created.acadYear).toBe(2569);
      expect(created.orderStatus).toBe(1);
    });

    it('โครงการปิดแล้ว → block', async () => {
      projectRepo.findOne.mockResolvedValue({
        projId: 1, scId: 5, del: 0, executionStatus: 5,
      });
      await expect(
        service.createProcurement(1, {}, schoolUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
