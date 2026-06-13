import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { type JwtUser } from '../../common/utils/tenant-guard';

const superAdmin: JwtUser = { type: 1, sc_id: 1 } as JwtUser;
const schoolAdmin: JwtUser = { type: 2, sc_id: 1 } as JwtUser;

describe('ProjectService', () => {
  let service: ProjectService;
  let repo: jest.Mocked<any>;
  let parcelRepo: jest.Mocked<any>;
  let syRepo: jest.Mocked<any>;

  beforeEach(async () => {
    repo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((p) => ({ projId: 1, ...p })),
    };
    parcelRepo = {
      create: jest.fn().mockImplementation((p) => p),
      save: jest.fn(),
      update: jest.fn(),
      // updateProject sync ใช้ find → save (ใบเดียว sync, หลายใบไม่ sync)
      find: jest.fn().mockResolvedValue([]),
    };
    syRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ syId: 1, syYear: 2569, budgetYear: 2569 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: repo },
        { provide: getRepositoryToken(ParcelOrder), useValue: parcelRepo },
        { provide: getRepositoryToken(SchoolYear), useValue: syRepo },
      ],
    }).compile();

    service = module.get(ProjectService);
  });

  // ─── loadProject ──────────────────────────────────────────────────────────
  describe('loadProject', () => {
    it('filter scId, syId และ del=0 พร้อม pagination', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.loadProject(5, 9, 2, 10, 3);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, del: 0 },
          order: { projId: 'DESC' },
          skip: 20,
          take: 10,
        }),
      );
    });

    it('คืน { data, count, page, pageSize } ครบ', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.loadProject(1, 1, 0, 25, 1);
      expect(result).toEqual({ data: [], count: 0, page: 0, pageSize: 25 });
    });

    it('map field + แปลง budget เป็น number และสร้าง project_code', async () => {
      repo.findAndCount.mockResolvedValue([
        [
          {
            projId: 7,
            projName: 'โครงการ ก',
            projDetail: 'รายละเอียด',
            projBudget: '5000.50',
            projStatus: 1,
            pbcId: 3,
            scId: 1,
            syId: 2,
            upBy: 9,
            updateDate: new Date('2026-05-01T00:00:00Z'),
            createDate: new Date('2026-04-01T00:00:00Z'),
            del: 0,
          },
        ],
        1,
      ]);

      const { data } = await service.loadProject(1, 2, 0, 10, 2);
      const row = data[0];
      expect(row.project_id).toBe(7);
      expect(row.proj_id).toBe(7);
      expect(row.project_code).toBe('PROJ-000007');
      expect(row.budget).toBe(5000.5);
      expect(row.proj_budget).toBe(5000.5);
      expect(row.project_name).toBe('โครงการ ก');
      expect(row.create_date).toBe('2026-04-01');
      expect(row.update_date).toBe('2026-05-01');
    });

    it('cre_by ใช้ upBy ถ้ามี มิฉะนั้น fallback เป็น userId', async () => {
      repo.findAndCount.mockResolvedValue([
        [
          {
            projId: 1,
            projName: 'p',
            projDetail: null,
            projBudget: 0,
            projStatus: 0,
            pbcId: null,
            scId: 1,
            syId: 1,
            upBy: null,
            updateDate: null,
            createDate: null,
            del: 0,
          },
        ],
        1,
      ]);
      const { data } = await service.loadProject(1, 99, 0, 10, 1);
      expect(data[0].cre_by).toBe(99);
      expect(data[0].update_date).toBeNull();
      expect(data[0].create_date).toBeNull();
    });
  });

  // ─── addProject ───────────────────────────────────────────────────────────
  describe('addProject', () => {
    it('ชื่อโครงการซ้ำในปีเดียวกัน → flag: false', async () => {
      repo.findOne.mockResolvedValue({ projId: 1 });
      const result = await service.addProject({
        proj_name: 'ซ้ำ',
        sc_id: 1,
        sy_id: 2,
      });
      expect(result).toEqual({
        flag: false,
        ms: 'ชื่อโครงการนี้มีอยู่แล้วในปีการศึกษานี้',
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('happy path → save และ flag: true', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({});
      const result = await service.addProject({
        proj_name: 'ใหม่',
        proj_detail: 'รายละเอียด',
        proj_budget: 10000,
        pbc_id: 2,
        sc_id: 1,
        sy_id: 3,
        up_by: 9,
      });
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });

      const saved = repo.save.mock.calls[0][0];
      expect(saved.projName).toBe('ใหม่');
      expect(saved.projBudget).toBe(10000);
      expect(saved.projStatus).toBe(0);
      expect(saved.del).toBe(0);
    });

    it('ค่า default เมื่อไม่ส่ง optional fields (budget=0, null fields)', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({});
      await service.addProject({ proj_name: 'x' });

      const saved = repo.save.mock.calls[0][0];
      expect(saved.projBudget).toBe(0);
      expect(saved.projDetail).toBeNull();
      expect(saved.pbcId).toBeNull();
      expect(saved.scId).toBeNull();
      expect(saved.syId).toBeNull();
      expect(saved.upBy).toBeNull();
    });

    it('ไม่ตรวจ duplicate ถ้าไม่ครบ proj_name + sc_id + sy_id', async () => {
      repo.save.mockResolvedValue({});
      await service.addProject({ proj_name: 'x', sc_id: 1 }); // ไม่มี sy_id
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ─── updateProject ────────────────────────────────────────────────────────
  describe('updateProject', () => {
    it('ไม่พบโครงการ → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.updateProject(
        { proj_id: 99 } as any,
        superAdmin,
      );
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลโครงการ' });
    });

    it('filter del=0 ใน findOne', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.updateProject({ proj_id: 5 } as any, superAdmin);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projId: 5, del: 0 }),
        }),
      );
    });

    it('non-super admin แก้ของโรงเรียนอื่น → ForbiddenException', async () => {
      repo.findOne.mockResolvedValue({ projId: 1, scId: 999, del: 0 });
      await expect(
        service.updateProject({ proj_id: 1 } as any, schoolAdmin),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('super admin (type=1) แก้ของโรงเรียนอื่นได้', async () => {
      const project = { projId: 1, scId: 999, del: 0 } as any;
      repo.findOne.mockResolvedValue(project);
      repo.save.mockResolvedValue(project);
      const result = await service.updateProject(
        { proj_id: 1, proj_name: 'แก้' } as any,
        superAdmin,
      );
      expect(result).toEqual({ flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' });
    });

    it('update เฉพาะ field ที่ส่งมา (partial)', async () => {
      const project = {
        projId: 1,
        scId: 1,
        del: 0,
        projName: 'เดิม',
        projBudget: 100,
        projStatus: 0,
      } as any;
      repo.findOne.mockResolvedValue(project);
      repo.save.mockResolvedValue(project);

      await service.updateProject(
        { proj_id: 1, proj_budget: 8888, proj_status: 2 } as any,
        schoolAdmin,
      );
      expect(project.projName).toBe('เดิม'); // ไม่ส่ง → ไม่แก้
      expect(project.projBudget).toBe(8888);
      expect(project.projStatus).toBe(2);
      expect(project.updateDate).toBeInstanceOf(Date);
    });
  });

  // ─── removeProject ────────────────────────────────────────────────────────
  describe('removeProject', () => {
    it('ไม่พบโครงการ → flag: false', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.removeProject(99, superAdmin);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลโครงการ' });
    });

    it('non-super admin ลบของโรงเรียนอื่น → ForbiddenException', async () => {
      repo.findOne.mockResolvedValue({ projId: 1, scId: 999, del: 0 });
      await expect(service.removeProject(1, schoolAdmin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('soft delete (del=1) และ flag: true', async () => {
      const project = { projId: 1, scId: 1, del: 0 } as any;
      repo.findOne.mockResolvedValue(project);
      repo.save.mockResolvedValue(project);
      const result = await service.removeProject(1, schoolAdmin);
      expect(project.del).toBe(1);
      expect(project.updateDate).toBeInstanceOf(Date);
      expect(result).toEqual({ flag: true, ms: 'ลบข้อมูลสำเร็จ' });
    });
  });

  // ─── master/placeholder methods ───────────────────────────────────────────
  describe('placeholder master loaders', () => {
    it('คืน { data: [], count: 0 } ทุกตัว', () => {
      expect(service.loadPLNBudgetCategory(1, 1, '2569')).toEqual({
        data: [],
        count: 0,
      });
      expect(service.loadPLNBudgetCategoryRp()).toEqual({ data: [], count: 0 });
      expect(service.masterSaoPolicy()).toEqual({ data: [], count: 0 });
      expect(service.masterMoePolicy()).toEqual({ data: [], count: 0 });
      expect(service.masterObecPolicy()).toEqual({ data: [], count: 0 });
      expect(service.masterQuickWin()).toEqual({ data: [], count: 0 });
      expect(service.masterScPolicy(1)).toEqual({ data: [], count: 0 });
    });
  });
});
