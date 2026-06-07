import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentService } from './student.service';
import { Student } from './entities/student.entity';
import { SubmittingStudentRecords } from './entities/submitting-student-records.entity';
import { MasterClassroom } from './entities/master-classroom.entity';
import { MasterClassroomBudget } from './entities/master-classroom-budget.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { SchoolClassroom } from './entities/school-classroom.entity';

describe('StudentService', () => {
  let service: StudentService;
  let studentRepo: jest.Mocked<any>;
  let submitRepo: jest.Mocked<any>;
  let classroomRepo: jest.Mocked<any>;
  let classroomBudgetRepo: jest.Mocked<any>;
  let budgetTypeRepo: jest.Mocked<any>;
  let budgetTypeSchoolRepo: jest.Mocked<any>;
  let schoolClassroomRepo: jest.Mocked<any>;

  beforeEach(async () => {
    studentRepo = {
      findAndCount: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };
    submitRepo = { findOne: jest.fn(), save: jest.fn() };
    classroomRepo = { find: jest.fn() };
    classroomBudgetRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    budgetTypeRepo = { find: jest.fn() };
    budgetTypeSchoolRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    schoolClassroomRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getRepositoryToken(Student), useValue: studentRepo },
        {
          provide: getRepositoryToken(SubmittingStudentRecords),
          useValue: submitRepo,
        },
        { provide: getRepositoryToken(MasterClassroom), useValue: classroomRepo },
        {
          provide: getRepositoryToken(MasterClassroomBudget),
          useValue: classroomBudgetRepo,
        },
        { provide: getRepositoryToken(BudgetIncomeType), useValue: budgetTypeRepo },
        {
          provide: getRepositoryToken(BudgetIncomeTypeSchool),
          useValue: budgetTypeSchoolRepo,
        },
        {
          provide: getRepositoryToken(SchoolClassroom),
          useValue: schoolClassroomRepo,
        },
      ],
    }).compile();

    service = module.get(StudentService);
  });

  // ─── loadStudent ──────────────────────────────────────────────────────────
  describe('loadStudent', () => {
    it('filter syId, budgetYear, scId, del=0 พร้อม pagination', async () => {
      studentRepo.findAndCount.mockResolvedValue([[], 0]);
      classroomRepo.find.mockResolvedValue([]);
      submitRepo.findOne.mockResolvedValue(null);

      await service.loadStudent(3, '2569', 5, 2, 10);
      expect(studentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { syId: 3, budgetYear: '2569', scId: 5, del: 0 },
          skip: 20,
          take: 10,
        }),
      );
    });

    it('edit=true เมื่อยังไม่ส่ง (status != 100), edit=false เมื่อ status=100', async () => {
      studentRepo.findAndCount.mockResolvedValue([[], 0]);
      classroomRepo.find.mockResolvedValue([]);

      submitRepo.findOne.mockResolvedValue(null);
      let result = await service.loadStudent(3, '2569', 5, 0, 10);
      expect(result.edit).toBe(true);

      submitRepo.findOne.mockResolvedValue({ status: 100 });
      result = await service.loadStudent(3, '2569', 5, 0, 10);
      expect(result.edit).toBe(false);
    });

    it('คำนวณ totalstudent และ map class_lev จาก classroom', async () => {
      studentRepo.findAndCount.mockResolvedValue([
        [
          {
            stId: 1,
            scId: 5,
            syId: 3,
            budgetYear: '2569',
            classId: 10,
            stCount: 20,
            upBy: 1,
            createDate: null,
            updateDate: null,
            del: 0,
          },
          {
            stId: 2,
            scId: 5,
            syId: 3,
            budgetYear: '2569',
            classId: 11,
            stCount: 15,
            upBy: 1,
            createDate: null,
            updateDate: null,
            del: 0,
          },
        ],
        2,
      ]);
      classroomRepo.find.mockResolvedValue([
        { classId: 10, classLev: 'ป.1' },
        { classId: 11, classLev: 'ป.2' },
      ]);
      submitRepo.findOne.mockResolvedValue(null);

      const result = await service.loadStudent(3, '2569', 5, 0, 10);
      expect(result.totalstudent).toBe(35);
      expect(result.count).toBe(2);
      expect(result.data[0].class_lev).toBe('ป.1');
      expect(result.data[0].st_id).toBe(1);
    });

    it('class_lev เป็น empty string ถ้าไม่พบ classroom ที่ตรงกัน', async () => {
      studentRepo.findAndCount.mockResolvedValue([
        [
          {
            stId: 1,
            scId: 5,
            syId: 3,
            budgetYear: '2569',
            classId: 99,
            stCount: 0,
            upBy: 1,
            del: 0,
          },
        ],
        1,
      ]);
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      submitRepo.findOne.mockResolvedValue(null);

      const result = await service.loadStudent(3, '2569', 5, 0, 10);
      expect(result.data[0].class_lev).toBe('');
    });
  });

  // ─── addStudent ───────────────────────────────────────────────────────────
  describe('addStudent', () => {
    const dto = {
      sc_id: 5,
      sy_id: 3,
      budget_year: '2569',
      class_id: 10,
      st_count: 25,
      up_by: 9,
    };

    it('มีนักเรียนชั้นนี้อยู่แล้ว → flag: false', async () => {
      studentRepo.findOne.mockResolvedValue({ stId: 1 });
      const result = await service.addStudent(dto);
      expect(result).toEqual({
        flag: false,
        ms: 'ข้อมูลนักเรียนสำหรับชั้นเรียนนี้มีอยู่แล้ว',
      });
      expect(studentRepo.save).not.toHaveBeenCalled();
    });

    it('filter del=0 + ครบ scId/syId/budgetYear/classId ตอนเช็คซ้ำ', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      studentRepo.save.mockResolvedValue({});
      await service.addStudent(dto);
      expect(studentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scId: 5,
            syId: 3,
            budgetYear: '2569',
            classId: 10,
            del: 0,
          },
        }),
      );
    });

    it('happy path → save พร้อมค่าถูกต้อง flag: true', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      studentRepo.save.mockResolvedValue({});
      const result = await service.addStudent(dto);
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
      const saved = studentRepo.save.mock.calls[0][0];
      expect(saved.scId).toBe(5);
      expect(saved.stCount).toBe(25);
      expect(saved.upBy).toBe(9);
      expect(saved.del).toBe(0);
    });

    it('upBy default 0 ถ้าไม่ส่ง', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      studentRepo.save.mockResolvedValue({});
      await service.addStudent({ ...dto, up_by: undefined } as any);
      expect(studentRepo.save.mock.calls[0][0].upBy).toBe(0);
    });

    it('save error → flag: false', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      studentRepo.save.mockRejectedValue(new Error('DB error'));
      const result = await service.addStudent(dto);
      expect(result).toEqual({
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    });
  });

  // ─── loadClassroom ────────────────────────────────────────────────────────
  describe('loadClassroom', () => {
    it('map class_id และ class_lev', async () => {
      classroomRepo.find.mockResolvedValue([
        { classId: 1, classLev: 'อนุบาล 1' },
      ]);
      const result = await service.loadClassroom();
      expect(result).toEqual([{ class_id: 1, class_lev: 'อนุบาล 1' }]);
    });
  });

  // ─── updateStudent ────────────────────────────────────────────────────────
  describe('updateStudent', () => {
    it('ไม่พบนักเรียน → flag: false', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      const result = await service.updateStudent({ st_id: 99 } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลนักเรียน' });
    });

    it('filter del=0 ใน findOne', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      await service.updateStudent({ st_id: 5 } as any);
      expect(studentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stId: 5, del: 0 } }),
      );
    });

    it('update st_count + up_by และ updateDate', async () => {
      const student = { stId: 1, del: 0, stCount: 10, upBy: 1 } as any;
      studentRepo.findOne.mockResolvedValue(student);
      studentRepo.save.mockResolvedValue(student);
      const result = await service.updateStudent({
        st_id: 1,
        st_count: 30,
        up_by: 7,
      } as any);
      expect(student.stCount).toBe(30);
      expect(student.upBy).toBe(7);
      expect(student.updateDate).toBeInstanceOf(Date);
      expect(result).toEqual({ flag: true, ms: 'บันทึกข้อมูลสำเร็จ' });
    });

    it('save error → flag: false', async () => {
      studentRepo.findOne.mockResolvedValue({ stId: 1, del: 0 });
      studentRepo.save.mockRejectedValue(new Error('x'));
      const result = await service.updateStudent({ st_id: 1 } as any);
      expect(result.flag).toBe(false);
    });
  });

  // ─── checkSendRecord ──────────────────────────────────────────────────────
  describe('checkSendRecord', () => {
    it('ไม่มี record → ssr_id=0, status=0', async () => {
      submitRepo.findOne.mockResolvedValue(null);
      const result = await service.checkSendRecord({
        sc_id: 5,
        sy_id: 3,
        year: 2569,
      } as any);
      expect(result).toEqual({ ssr_id: 0, status: 0 });
    });

    it('มี record → คืน ssr_id และ status', async () => {
      submitRepo.findOne.mockResolvedValue({ ssrId: 7, status: 100 });
      const result = await service.checkSendRecord({
        sc_id: 5,
        sy_id: 3,
        year: 2569,
      } as any);
      expect(result).toEqual({ ssr_id: 7, status: 100 });
    });
  });

  // ─── confirmSendRecord ────────────────────────────────────────────────────
  describe('confirmSendRecord', () => {
    const dto = { sc_id: 5, sy_id: 3, year: 2569, up_by: 9 };

    it('สร้าง record ใหม่ถ้ายังไม่มี และตั้ง status=100', async () => {
      submitRepo.findOne.mockResolvedValue(null);
      submitRepo.save.mockResolvedValue({});
      const result = await service.confirmSendRecord(dto as any);
      const saved = submitRepo.save.mock.calls[0][0];
      expect(saved.scId).toBe(5);
      expect(saved.status).toBe(100);
      expect(saved.del).toBe(0);
      expect(result).toEqual({ flag: true, ms: 'ยืนยันการส่งข้อมูลสำเร็จ' });
    });

    it('ใช้ record เดิมถ้ามี และตั้ง status=100', async () => {
      const existing = { ssrId: 1, status: 0 } as any;
      submitRepo.findOne.mockResolvedValue(existing);
      submitRepo.save.mockResolvedValue(existing);
      await service.confirmSendRecord(dto as any);
      expect(existing.status).toBe(100);
      expect(existing.updateDate).toBeInstanceOf(Date);
    });

    it('save error → flag: false', async () => {
      submitRepo.findOne.mockResolvedValue(null);
      submitRepo.save.mockRejectedValue(new Error('x'));
      const result = await service.confirmSendRecord(dto as any);
      expect(result).toEqual({
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการยืนยัน',
      });
    });
  });

  // ─── checkClassOnYear ─────────────────────────────────────────────────────
  describe('checkClassOnYear', () => {
    const dto = { sc_id: 5, sy_id: 3, budget_date: '2569', up_by: 9 };

    it('มีนักเรียนแล้ว → ไม่ init row ใหม่', async () => {
      studentRepo.count.mockResolvedValue(5);
      const result = await service.checkClassOnYear(dto as any);
      expect(studentRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: true });
    });

    it('ยังไม่มีนักเรียน → สร้าง row ทุก class level (stCount=0)', async () => {
      studentRepo.count.mockResolvedValue(0);
      classroomRepo.find.mockResolvedValue([
        { classId: 1, classLev: 'ป.1' },
        { classId: 2, classLev: 'ป.2' },
      ]);
      studentRepo.save.mockResolvedValue([]);
      const result = await service.checkClassOnYear(dto as any);

      const saved = studentRepo.save.mock.calls[0][0];
      expect(saved).toHaveLength(2);
      expect(saved[0].classId).toBe(1);
      expect(saved[0].stCount).toBe(0);
      expect(saved[0].scId).toBe(5);
      expect(result).toEqual({ valid: true });
    });

    it('filter del=0 ตอน count', async () => {
      studentRepo.count.mockResolvedValue(1);
      await service.checkClassOnYear(dto as any);
      expect(studentRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scId: 5, syId: 3, budgetYear: '2569', del: 0 },
        }),
      );
    });
  });

  // ─── loadCalculatePerhead ─────────────────────────────────────────────────
  describe('loadCalculatePerhead', () => {
    it('คำนวณ total = stCount * amount และ totalprice รวม', async () => {
      studentRepo.find.mockResolvedValue([
        { stId: 1, classId: 10, stCount: 20, scId: 5, syId: 3, budgetYear: '2569' },
      ]);
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomBudgetRepo.find.mockResolvedValue([
        { classId: 10, bgTypeId: 1, amount: '100', crbId: 7 },
      ]);

      const result = await service.loadCalculatePerhead(5, 3);
      expect(result.count).toBe(1);
      expect(result.data[0].total).toBe(2000); // 20 * 100
      expect(result.data[0].crb_id).toBe(7);
      expect(result.totalprice).toBe(2000);
    });

    it('ข้ามนักเรียนที่ stCount=0', async () => {
      studentRepo.find.mockResolvedValue([
        { stId: 1, classId: 10, stCount: 0, scId: 5, syId: 3 },
      ]);
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomBudgetRepo.find.mockResolvedValue([]);

      const result = await service.loadCalculatePerhead(5, 3);
      expect(result.count).toBe(0);
    });

    it('ไม่พบนักเรียนด้วย syId → fallback ลองด้วย budget_year (พ.ศ.)', async () => {
      studentRepo.find
        .mockResolvedValueOnce([]) // ครั้งแรกด้วย syId
        .mockResolvedValueOnce([
          { stId: 5, classId: 10, stCount: 10, scId: 5, budgetYear: '2569' },
        ]); // fallback budget_year
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomBudgetRepo.find.mockResolvedValue([
        { classId: 10, bgTypeId: 1, amount: '50', crbId: 1 },
      ]);

      // year=2026 → budget_year 2569
      const result = await service.loadCalculatePerhead(5, 2026);
      expect(studentRepo.find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({ budgetYear: '2569' }),
        }),
      );
      expect(result.count).toBe(1);
      expect(result.data[0].total).toBe(500);
    });

    it('ข้ามนักเรียนของชั้นที่ตั้ง "ไม่เปิดสอน" (is_open=0) ไม่ให้แสดง/รวมยอด', async () => {
      studentRepo.find.mockResolvedValue([
        { stId: 1, classId: 1, stCount: 8, scId: 5, syId: 3 }, // ชั้นที่ปิด
        { stId: 2, classId: 10, stCount: 20, scId: 5, syId: 3 }, // ชั้นที่เปิด
      ]);
      classroomRepo.find.mockResolvedValue([
        { classId: 1, classLev: 'อนุบาล 1' },
        { classId: 10, classLev: 'ป.1' },
      ]);
      // อนุบาล 1 (classId=1) ถูกตั้งปิด
      schoolClassroomRepo.find.mockResolvedValue([{ classId: 1, isOpen: 0 }]);
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomBudgetRepo.find.mockResolvedValue([
        { classId: 1, bgTypeId: 1, amount: '100', crbId: 1 },
        { classId: 10, bgTypeId: 1, amount: '100', crbId: 2 },
      ]);

      const result = await service.loadCalculatePerhead(5, 3);
      // เหลือเฉพาะ ป.1 (classId=10) — อนุบาล 1 ที่ปิดถูกตัดทิ้ง
      expect(result.count).toBe(1);
      expect(result.data[0].class_lev).toBe('ป.1');
      expect(result.data.some((d: any) => d.class_lev === '')).toBe(false);
      expect(result.totalprice).toBe(2000); // เฉพาะ 20 * 100 ของ ป.1
    });

    it('ไม่มีประเภทเงินที่ตั้ง perhead → ไม่คำนวณ (data ว่าง, ไม่โหลด type ทั้งหมด)', async () => {
      studentRepo.find.mockResolvedValue([
        { stId: 1, classId: 10, stCount: 5, scId: 5, syId: 3 },
      ]);
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      budgetTypeSchoolRepo.find.mockResolvedValue([]); // ยังไม่ได้ตั้งค่า perhead
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomBudgetRepo.find.mockResolvedValue([]);

      const result = await service.loadCalculatePerhead(5, 3);
      // คำนวณเฉพาะที่กำหนด → ไม่มีการตั้งค่า = ไม่มีผลลัพธ์
      expect(result.count).toBe(0);
      expect(result.totalprice).toBe(0);
      // ต้องไม่ fallback ไปโหลดประเภทเงินทั้งหมด
      expect(budgetTypeRepo.find).not.toHaveBeenCalled();
    });
  });

  // ─── addClassroomBudget ───────────────────────────────────────────────────
  describe('addClassroomBudget', () => {
    it('มีอัตรารายหัวซ้ำ → flag: false', async () => {
      classroomBudgetRepo.findOne.mockResolvedValue({ crbId: 1 });
      const result = await service.addClassroomBudget({
        class_id: 1,
        bg_type_id: 1,
      });
      expect(result.flag).toBe(false);
      expect(classroomBudgetRepo.save).not.toHaveBeenCalled();
    });

    it('happy path → save flag: true, amount default 0', async () => {
      classroomBudgetRepo.findOne.mockResolvedValue(null);
      classroomBudgetRepo.save.mockResolvedValue({});
      const result = await service.addClassroomBudget({
        class_id: 1,
        bg_type_id: 1,
      });
      expect(result).toEqual({ flag: true, ms: 'บันทึกอัตรารายหัวสำเร็จ' });
      expect(classroomBudgetRepo.save.mock.calls[0][0].amount).toBe(0);
    });
  });

  // ─── updateClassroomBudget ────────────────────────────────────────────────
  describe('updateClassroomBudget', () => {
    it('crb_id null/0 + ครบ class+bg_type → สร้างใหม่ผ่าน addClassroomBudget', async () => {
      classroomBudgetRepo.findOne.mockResolvedValue(null);
      classroomBudgetRepo.save.mockResolvedValue({});
      const result = await service.updateClassroomBudget({
        crb_id: 0,
        class_id: 1,
        bg_type_id: 2,
        amount: 100,
      });
      expect(result.flag).toBe(true);
      expect(classroomBudgetRepo.save).toHaveBeenCalled();
    });

    it('crb_id null + ไม่มี class_id/bg_type_id → flag: false', async () => {
      const result = await service.updateClassroomBudget({ crb_id: null });
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('class_id');
    });

    it('crb_id มีค่า แต่ไม่พบ record และไม่มี class/bg → flag: false', async () => {
      classroomBudgetRepo.findOne.mockResolvedValue(null);
      const result = await service.updateClassroomBudget({ crb_id: 99 });
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูลอัตรารายหัว' });
    });

    it('crb_id มีค่า พบ record → update amount และ flag: true', async () => {
      const existing = { crbId: 5, del: 0, amount: 0, upBy: 1 } as any;
      classroomBudgetRepo.findOne.mockResolvedValue(existing);
      classroomBudgetRepo.save.mockResolvedValue(existing);
      const result = await service.updateClassroomBudget({
        crb_id: 5,
        amount: 250,
        up_by: 8,
      });
      expect(existing.amount).toBe(250);
      expect(existing.upBy).toBe(8);
      expect(result.flag).toBe(true);
    });
  });

  // ─── loadBudgetAllocation ─────────────────────────────────────────────────
  describe('loadBudgetAllocation', () => {
    it('mark selected=1 สำหรับ budget type ที่โรงเรียนเลือกไว้', async () => {
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
        { bgTypeId: 2, budgetType: 'เงินอื่น' },
      ]);
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);

      const result = await service.loadBudgetAllocation(5, 3);
      expect(result.count).toBe(2);
      expect(result.data[0]).toEqual({
        bg_type_id: 1,
        budget_type: 'เงินอุดหนุน',
        selected: 1,
      });
      expect(result.data[1].selected).toBe(0);
    });
  });

  // ─── setBudgetAllocation ──────────────────────────────────────────────────
  describe('setBudgetAllocation', () => {
    it('ไม่มี sc_id → flag: false', async () => {
      const result = await service.setBudgetAllocation({
        sc_id: 0,
        budget_types: [],
      } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล sc_id' });
    });

    it('budget_types ไม่ใช่ array → flag: false', async () => {
      const result = await service.setBudgetAllocation({
        sc_id: 5,
        budget_types: null,
      } as any);
      expect(result).toEqual({ flag: false, ms: 'ไม่พบข้อมูล budget_types' });
    });

    it('soft delete ของเดิม + สร้างใหม่เฉพาะ selected=1', async () => {
      const old = { bisId: 1, del: 0 } as any;
      budgetTypeSchoolRepo.find.mockResolvedValue([old]);
      budgetTypeSchoolRepo.create.mockImplementation((x: any) => x);
      budgetTypeSchoolRepo.save.mockResolvedValue({});

      const result = await service.setBudgetAllocation({
        sc_id: 5,
        up_by: 9,
        budget_types: [
          { bg_type_id: 1, selected: 1 },
          { bg_type_id: 2, selected: 0 },
        ],
      } as any);

      expect(old.del).toBe(1); // soft delete เดิม
      // batch save ของใหม่ มีแค่ selected=1
      const batchCall = budgetTypeSchoolRepo.save.mock.calls.find((c: any) =>
        Array.isArray(c[0]),
      );
      expect(batchCall[0]).toHaveLength(1);
      expect(batchCall[0][0].bgTypeId).toBe(1);
      expect(result.flag).toBe(true);
    });

    it('คงค่า perhead เดิมไว้ตอนสร้างใหม่ (ไม่รีเซ็ตเป็น 1)', async () => {
      // bg_type 1 เคยตั้ง perhead=0, bg_type 3 เป็นประเภทใหม่ (ไม่เคยมี)
      budgetTypeSchoolRepo.find.mockResolvedValue([
        { bgTypeSchoolId: 1, bgTypeId: 1, perhead: 0, del: 0 },
        { bgTypeSchoolId: 2, bgTypeId: 2, perhead: 1, del: 0 },
      ]);
      budgetTypeSchoolRepo.create.mockImplementation((x: any) => x);
      budgetTypeSchoolRepo.save.mockResolvedValue({});

      await service.setBudgetAllocation({
        sc_id: 5,
        up_by: 9,
        budget_types: [
          { bg_type_id: 1, selected: 1 }, // เคย perhead=0 → ต้องคงเป็น 0
          { bg_type_id: 3, selected: 1 }, // ใหม่ → default 1
        ],
      } as any);

      const batchCall = budgetTypeSchoolRepo.save.mock.calls.find((c: any) =>
        Array.isArray(c[0]),
      );
      const created = batchCall[0] as any[];
      const t1 = created.find((x) => x.bgTypeId === 1);
      const t3 = created.find((x) => x.bgTypeId === 3);
      expect(t1.perhead).toBe(0); // คงค่าเดิม ไม่ถูกรีเซ็ต
      expect(t3.perhead).toBe(1); // ประเภทใหม่ = default
    });

    it('error ระหว่างทำงาน → flag: false พร้อมข้อความ error', async () => {
      budgetTypeSchoolRepo.find.mockRejectedValue(new Error('boom'));
      const result = await service.setBudgetAllocation({
        sc_id: 5,
        budget_types: [],
      } as any);
      expect(result.flag).toBe(false);
      expect(result.ms).toContain('boom');
    });
  });

  // ─── loadPerheadRateSetting ───────────────────────────────────────────────
  describe('loadPerheadRateSetting', () => {
    it('ไม่มี selected budget type → คืน { data: [], count: 0 }', async () => {
      budgetTypeSchoolRepo.find.mockResolvedValue([]);
      const result = await service.loadPerheadRateSetting(5, 3);
      expect(result).toEqual({ data: [], count: 0 });
    });

    it('สร้าง matrix classroom x budgetType พร้อม amount จาก existing rate', async () => {
      budgetTypeSchoolRepo.find.mockResolvedValue([{ bgTypeId: 1 }]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 1, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomRepo.find.mockResolvedValue([{ classId: 10, classLev: 'ป.1' }]);
      classroomBudgetRepo.find.mockResolvedValue([
        { classId: 10, bgTypeId: 1, amount: '300', crbId: 4 },
      ]);

      const result = await service.loadPerheadRateSetting(5, 3);
      expect(result.count).toBe(1);
      expect(result.data[0]).toEqual({
        class_id: 10,
        class_lev: 'ป.1',
        bg_type_id: 1,
        budget_type: 'เงินอุดหนุน',
        amount: 300,
        crb_id: 4,
      });
    });
  });

  // ─── setPerheadRate ───────────────────────────────────────────────────────
  describe('setPerheadRate', () => {
    it('amount > 0 + มี record → update', async () => {
      const existing = { crbId: 1, del: 0, amount: 0, upBy: 1 } as any;
      classroomBudgetRepo.findOne.mockResolvedValue(existing);
      classroomBudgetRepo.save.mockResolvedValue(existing);
      const result = await service.setPerheadRate({
        up_by: 9,
        rates: [{ class_id: 10, bg_type_id: 1, amount: 500 }],
      } as any);
      expect(existing.amount).toBe(500);
      expect(existing.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });

    it('amount > 0 + ไม่มี record → create ใหม่', async () => {
      classroomBudgetRepo.findOne.mockResolvedValue(null);
      classroomBudgetRepo.create.mockImplementation((x: any) => x);
      classroomBudgetRepo.save.mockResolvedValue({});
      await service.setPerheadRate({
        up_by: 9,
        rates: [{ class_id: 10, bg_type_id: 1, amount: 500 }],
      } as any);
      const created = classroomBudgetRepo.save.mock.calls[0][0];
      expect(created.amount).toBe(500);
      expect(created.classId).toBe(10);
    });

    it('amount = 0 + มี record → soft delete (del=1)', async () => {
      const existing = { crbId: 1, del: 0 } as any;
      classroomBudgetRepo.findOne.mockResolvedValue(existing);
      classroomBudgetRepo.save.mockResolvedValue(existing);
      await service.setPerheadRate({
        rates: [{ class_id: 10, bg_type_id: 1, amount: 0 }],
      } as any);
      expect(existing.del).toBe(1);
    });

    it('error → flag: false', async () => {
      classroomBudgetRepo.findOne.mockRejectedValue(new Error('x'));
      const result = await service.setPerheadRate({
        rates: [{ class_id: 1, bg_type_id: 1, amount: 5 }],
      } as any);
      expect(result.flag).toBe(false);
    });
  });

  // ─── loadPerheadBudgetTypes / setPerheadBudgetTypes ───────────────────────
  describe('loadPerheadBudgetTypes', () => {
    it('คืนประเภทเงินของโรงเรียน + ชื่อ + flag perhead', async () => {
      budgetTypeSchoolRepo.find.mockResolvedValue([
        { bgTypeSchoolId: 1, bgTypeId: 10, perhead: 1 },
        { bgTypeSchoolId: 2, bgTypeId: 20, perhead: 0 },
      ]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 10, budgetType: 'เงินอุดหนุนรายหัว' },
        { bgTypeId: 20, budgetType: 'เงินรายได้สถานศึกษา' },
      ]);
      const result = await service.loadPerheadBudgetTypes(5);
      expect(result).toEqual([
        { bg_type_school_id: 1, bg_type_id: 10, budget_type: 'เงินอุดหนุนรายหัว', perhead: 1 },
        { bg_type_school_id: 2, bg_type_id: 20, budget_type: 'เงินรายได้สถานศึกษา', perhead: 0 },
      ]);
    });

    it('โรงเรียนไม่มีประเภทเงิน → คืน []', async () => {
      budgetTypeSchoolRepo.find.mockResolvedValue([]);
      const result = await service.loadPerheadBudgetTypes(5);
      expect(result).toEqual([]);
    });
  });

  describe('setPerheadBudgetTypes', () => {
    it('อัปเดต perhead (truthy→1, falsy→0) เฉพาะแถวของโรงเรียน', async () => {
      const row: any = { bgTypeSchoolId: 1, scId: 5, perhead: 1, del: 0 };
      budgetTypeSchoolRepo.findOne.mockResolvedValue(row);
      budgetTypeSchoolRepo.save.mockResolvedValue(row);
      const result = await service.setPerheadBudgetTypes({
        sc_id: 5,
        up_by: 9,
        items: [{ bg_type_school_id: 1, perhead: 0 }],
      });
      expect(row.perhead).toBe(0);
      expect(row.upBy).toBe(9);
      expect(result.flag).toBe(true);
    });

    it('ไม่พบแถว → ข้ามไป (ยังคืน flag: true)', async () => {
      budgetTypeSchoolRepo.findOne.mockResolvedValue(null);
      const result = await service.setPerheadBudgetTypes({
        sc_id: 5,
        items: [{ bg_type_school_id: 99, perhead: 1 }],
      });
      expect(budgetTypeSchoolRepo.save).not.toHaveBeenCalled();
      expect(result.flag).toBe(true);
    });
  });

  // ─── ชั้นที่เปิดสอน: loadSchoolClassrooms / setSchoolClassrooms ────────────
  describe('loadSchoolClassrooms', () => {
    it('ชั้นไม่มี row = เปิด (is_open=1); ชั้นที่ตั้ง 0 = ปิด', async () => {
      classroomRepo.find.mockResolvedValue([
        { classId: 1, classLev: 'ป.1' },
        { classId: 2, classLev: 'ป.2' },
        { classId: 3, classLev: 'ป.3' },
      ]);
      schoolClassroomRepo.find.mockResolvedValue([
        { classId: 2, isOpen: 0 },
      ]);
      const result = await service.loadSchoolClassrooms(5);
      expect(result).toEqual([
        { class_id: 1, class_lev: 'ป.1', is_open: 1 },
        { class_id: 2, class_lev: 'ป.2', is_open: 0 },
        { class_id: 3, class_lev: 'ป.3', is_open: 1 },
      ]);
    });
  });

  describe('setSchoolClassrooms', () => {
    it('มี row → update is_open', async () => {
      const row: any = { scId: 5, classId: 1, isOpen: 1, del: 0 };
      schoolClassroomRepo.findOne.mockResolvedValue(row);
      schoolClassroomRepo.save.mockResolvedValue(row);
      const result = await service.setSchoolClassrooms({
        sc_id: 5,
        items: [{ class_id: 1, is_open: 0 }],
      });
      expect(row.isOpen).toBe(0);
      expect(result.flag).toBe(true);
    });

    it('ไม่มี row → create ใหม่', async () => {
      schoolClassroomRepo.findOne.mockResolvedValue(null);
      schoolClassroomRepo.save.mockResolvedValue({});
      const result = await service.setSchoolClassrooms({
        sc_id: 5,
        up_by: 9,
        items: [{ class_id: 7, is_open: 1 }],
      });
      expect(schoolClassroomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ scId: 5, classId: 7, del: 0 }),
      );
      expect(result.flag).toBe(true);
    });
  });

  // loadPerheadRateSetting ต้องตัดชั้นที่ปิด (is_open=0) ออก
  describe('loadPerheadRateSetting (ตัดชั้นที่ปิด)', () => {
    it('ชั้นที่ is_open=0 ไม่อยู่ในผลลัพธ์', async () => {
      budgetTypeSchoolRepo.find.mockResolvedValue([
        { bgTypeId: 10, perhead: 1 },
      ]);
      budgetTypeRepo.find.mockResolvedValue([
        { bgTypeId: 10, budgetType: 'เงินอุดหนุน' },
      ]);
      classroomRepo.find.mockResolvedValue([
        { classId: 1, classLev: 'ป.1' },
        { classId: 2, classLev: 'ป.2' },
      ]);
      // ชั้น 2 ปิด
      schoolClassroomRepo.find.mockResolvedValue([{ classId: 2, isOpen: 0 }]);
      classroomBudgetRepo.find.mockResolvedValue([]);
      const result = await service.loadPerheadRateSetting(5, 2);
      const classIds = result.data.map((d: any) => d.class_id);
      expect(classIds).toContain(1);
      expect(classIds).not.toContain(2);
    });
  });
});
