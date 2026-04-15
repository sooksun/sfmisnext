import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolService } from './school.service';
import { School } from './entities/school.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';

function createMockSchool(overrides: Partial<School> = {}): School {
  return {
    scId: 1,
    scName: 'โรง��รียนทดสอบ',
    add1: 'ที่อยู่ทดสอบ',
    tel: '0812345678',
    del: 0,
    creDate: new Date('2024-01-01'),
    upDate: new Date('2024-01-01'),
    ...overrides,
  } as School;
}

describe('SchoolService', () => {
  let service: SchoolService;
  let schoolRepo: any;
  let budgetTypeRepo: any;

  beforeEach(async () => {
    schoolRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    budgetTypeRepo = {
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        { provide: getRepositoryToken(School), useValue: schoolRepo },
        { provide: getRepositoryToken(BudgetIncomeTypeSchool), useValue: budgetTypeRepo },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
  });

  describe('loadSchools', () => {
    it('should return paginated schools with correct structure', async () => {
      const schools = [createMockSchool()];
      schoolRepo.findAndCount.mockResolvedValue([schools, 1]);

      const result = await service.loadSchools(0, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count', 1);
      expect(result).toHaveProperty('page', 0);
      expect(result).toHaveProperty('pageSize', 10);
    });

    it('should only return non-deleted schools', async () => {
      schoolRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.loadSchools(0, 10);

      expect(schoolRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { del: 0 } }),
      );
    });
  });

  describe('addSchool', () => {
    it('should create school and return success', async () => {
      const result = await service.addSchool({
        sc_name: 'โรงเรียนใหม่',
        sc_address: 'ที่อยู่ใหม่',
        sc_phone: '099',
      });

      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
      expect(schoolRepo.save).toHaveBeenCalled();
    });

    it('should handle null address and phone', async () => {
      await service.addSchool({ sc_name: 'โรงเรียน' });

      const saved = schoolRepo.create.mock.calls[0][0];
      expect(saved.tel).toBeNull();
      expect(saved.add1).toBeNull();
    });

    it('should set del=0 on creation', async () => {
      await service.addSchool({ sc_name: 'โรงเรียน' });

      const saved = schoolRepo.create.mock.calls[0][0];
      expect(saved.del).toBe(0);
    });
  });

  describe('updateSchool', () => {
    it('should return error if school not found', async () => {
      schoolRepo.findOne.mockResolvedValue(null);

      const result = await service.updateSchool({ sc_id: 999 });

      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลโรงเรียน' });
    });

    it('should filter by del=0 when finding', async () => {
      schoolRepo.findOne.mockResolvedValue(null);

      await service.updateSchool({ sc_id: 1 });

      expect(schoolRepo.findOne).toHaveBeenCalledWith({
        where: { scId: 1, del: 0 },
      });
    });

    it('should only update provided fields', async () => {
      const school = createMockSchool();
      schoolRepo.findOne.mockResolvedValue(school);

      await service.updateSchool({ sc_id: 1, sc_name: 'ชื่อใหม่' });

      expect(school.scName).toBe('ชื่อใหม่');
      expect(school.tel).toBe('0812345678'); // unchanged
    });
  });

  describe('removeSchool', () => {
    it('should soft-delete school (set del=1)', async () => {
      const school = createMockSchool();
      schoolRepo.findOne.mockResolvedValue(school);

      await service.removeSchool({ sc_id: 1 });

      expect(school.del).toBe(1);
      expect(schoolRepo.save).toHaveBeenCalledWith(school);
    });

    it('should return error if school not found', async () => {
      schoolRepo.findOne.mockResolvedValue(null);

      const result = await service.removeSchool({ sc_id: 999 });

      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลโรงเรียน' });
    });

    it('should filter by del=0 (cannot re-delete)', async () => {
      schoolRepo.findOne.mockResolvedValue(null);

      await service.removeSchool({ sc_id: 1 });

      expect(schoolRepo.findOne).toHaveBeenCalledWith({
        where: { scId: 1, del: 0 },
      });
    });
  });

  describe('loadProvince', () => {
    it('should return empty array (stub)', () => {
      const result = service.loadProvince();
      expect(result).toEqual([]);
    });
  });
});
