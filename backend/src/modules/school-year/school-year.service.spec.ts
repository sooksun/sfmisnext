import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolYearService } from './school-year.service';
import { SchoolYear } from './entities/school-year.entity';

function createMockSchoolYear(overrides: Partial<SchoolYear> = {}): SchoolYear {
  return {
    syId: 1,
    syYear: 2567,
    semester: 1,
    syDateS: new Date('2024-05-16'),
    syDateE: new Date('2024-10-10'),
    scId: 1,
    budgetYear: 2567,
    budgetDateS: new Date('2023-10-01'),
    budgetDateE: new Date('2024-09-30'),
    upBy: 1,
    del: 0,
    creDate: new Date('2024-01-01'),
    upDate: new Date('2024-01-01'),
    ...overrides,
  } as SchoolYear;
}

describe('SchoolYearService', () => {
  let service: SchoolYearService;
  let repo: any;

  // Mock query builder
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    Object.values(mockQueryBuilder).forEach((fn) => (fn as jest.Mock).mockReset().mockReturnThis());
    mockQueryBuilder.getMany.mockResolvedValue([]);
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolYearService,
        { provide: getRepositoryToken(SchoolYear), useValue: repo },
      ],
    }).compile();

    service = module.get<SchoolYearService>(SchoolYearService);
  });

  describe('getSchoolYear', () => {
    it('should return paginated results filtered by school', async () => {
      const items = [createMockSchoolYear()];
      repo.findAndCount.mockResolvedValue([items, 1]);

      const result = await service.getSchoolYear(1, 0, 10);

      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by scId and del=0', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.getSchoolYear(42, 0, 10);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 42, del: 0 },
        }),
      );
    });

    it('should apply correct pagination', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.getSchoolYear(1, 3, 5);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 15, take: 5 }),
      );
    });
  });

  describe('loadAllSchoolYears', () => {
    it('should add sy_name, sy_start, sy_end aliases', async () => {
      const item = createMockSchoolYear({ syYear: 2567 });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[item], 1]);

      const result = await service.loadAllSchoolYears(0, 10);

      expect(result.data[0]).toHaveProperty('sy_name', 'ปีการศึกษา 2567');
      expect(result.data[0]).toHaveProperty('sy_start');
      expect(result.data[0]).toHaveProperty('sy_end');
    });

    it('should handle null dates gracefully', async () => {
      const item = createMockSchoolYear({ syDateS: null, syDateE: null });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[item], 1]);

      const result = await service.loadAllSchoolYears(0, 10);

      expect(result.data[0].sy_start).toBeNull();
      expect(result.data[0].sy_end).toBeNull();
    });
  });

  describe('saveSchoolYear', () => {
    it('should create a school year with correct fields', async () => {
      const result = await service.saveSchoolYear({
        sy_year: 2567,
        sy_date_s: '2024-05-16',
        sy_date_e: '2024-10-10',
        sc_id: 1,
        budget_year: 2567,
      } as any);

      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
      expect(repo.save).toHaveBeenCalled();
    });

    it('should default semester to 1', async () => {
      await service.saveSchoolYear({ sy_year: 2567 } as any);

      const saved = repo.save.mock.calls[0][0];
      expect(saved.semester).toBe(1);
    });

    it('should set del=0 on creation', async () => {
      await service.saveSchoolYear({ sy_year: 2567 } as any);

      const saved = repo.save.mock.calls[0][0];
      expect(saved.del).toBe(0);
    });
  });

  describe('updateSchoolYear', () => {
    it('should return error if school year not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.updateSchoolYear({ sy_id: 999 } as any);

      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลปีการศึกษา' });
    });

    it('should filter by del=0 when finding school year', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.updateSchoolYear({ sy_id: 1 } as any);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { syId: 1, del: 0 },
      });
    });

    it('should only update provided fields', async () => {
      const schoolYear = createMockSchoolYear();
      repo.findOne.mockResolvedValue(schoolYear);

      await service.updateSchoolYear({ sy_id: 1, sy_year: 2568 } as any);

      expect(schoolYear.syYear).toBe(2568);
      expect(schoolYear.semester).toBe(1); // unchanged
    });

    it('should return success on update', async () => {
      repo.findOne.mockResolvedValue(createMockSchoolYear());

      const result = await service.updateSchoolYear({ sy_id: 1, sy_year: 2568 } as any);

      expect(result).toEqual({ flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' });
    });
  });

  describe('removeSchoolYear', () => {
    it('should return error if school year not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.removeSchoolYear(999);

      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลปีการศึกษา' });
    });

    it('should set del=1 (soft delete)', async () => {
      const schoolYear = createMockSchoolYear();
      repo.findOne.mockResolvedValue(schoolYear);

      await service.removeSchoolYear(1);

      expect(schoolYear.del).toBe(1);
      expect(repo.save).toHaveBeenCalledWith(schoolYear);
    });

    it('should return success message', async () => {
      repo.findOne.mockResolvedValue(createMockSchoolYear());

      const result = await service.removeSchoolYear(1);

      expect(result).toEqual({ flag: true, ms: 'ลบข้อมูลสำเร็จ' });
    });
  });

  describe('changeYear', () => {
    it('should return error if school year not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.changeYear(999, 1);

      expect(result).toEqual({ flag: false, ms: 'ไม่พบปีการศึกษาที่เลือก' });
    });

    it('should fallback to school year if budget year not found', async () => {
      const schoolYear = createMockSchoolYear();
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(schoolYear) // first call: find school year
        .mockResolvedValueOnce(null); // second call: budget year not found

      const result = await service.changeYear(1, 1);

      expect((result as any).flag).toBe(true);
      expect((result as any).budget_date.sy_id).toBe((result as any).sy_date.sy_id);
    });

    it('should use budgetSyId when provided', async () => {
      const schoolYear = createMockSchoolYear();
      const budgetYear = createMockSchoolYear({ syId: 2, budgetYear: 2566 });
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(schoolYear)
        .mockResolvedValueOnce(budgetYear);

      const result = await service.changeYear(1, 1, 2);

      expect((result as any).flag).toBe(true);
      expect((result as any).budget_date.sy_id).toBe(2);
    });
  });

  describe('checkYear', () => {
    it('should return error if no school year exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.checkYear();

      expect(result).toEqual({ flag: false, ms: 'ไม่พบปีการศึกษา' });
    });

    it('should look for global school years (scId=0 or NULL)', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await service.checkYear();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(sy.scId = 0 OR sy.scId IS NULL)',
      );
    });

    it('should return school year and budget year data', async () => {
      const schoolYear = createMockSchoolYear({ budgetYear: 2567 });
      const budgetYear = createMockSchoolYear({ syId: 2 });
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(schoolYear)
        .mockResolvedValueOnce(budgetYear);

      const result = await service.checkYear();

      expect((result as any).flag).toBe(true);
      expect((result as any).sy_date).toBeDefined();
      expect((result as any).budget_date).toBeDefined();
    });
  });

  describe('toResponse (via getSchoolYear)', () => {
    it('should map entity fields to snake_case response', async () => {
      const item = createMockSchoolYear();
      repo.findAndCount.mockResolvedValue([[item], 1]);

      const result = await service.getSchoolYear(1, 0, 10);
      const response = result.data[0];

      expect(response).toHaveProperty('sy_id', 1);
      expect(response).toHaveProperty('sy_year', 2567);
      expect(response).toHaveProperty('sc_id', 1);
      expect(response).toHaveProperty('budget_year', 2567);
      expect(response).toHaveProperty('del', 0);
    });
  });
});
