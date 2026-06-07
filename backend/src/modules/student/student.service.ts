import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Student } from './entities/student.entity';
import { SubmittingStudentRecords } from './entities/submitting-student-records.entity';
import { MasterClassroom } from './entities/master-classroom.entity';
import { MasterClassroomBudget } from './entities/master-classroom-budget.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { AddStudentDto } from './dto/add-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CheckSendRecordDto } from './dto/check-send-record.dto';
import { ConfirmSendRecordDto } from './dto/confirm-send-record.dto';
import { CheckClassOnYearDto } from './dto/check-class-on-year.dto';
import { SetBudgetAllocationDto } from './dto/set-budget-allocation.dto';
import { SetPerheadRateDto } from './dto/set-perhead-rate.dto';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { SchoolClassroom } from './entities/school-classroom.entity';

interface ClassroomBudgetPayload {
  class_id: number;
  bg_type_id: number;
  amount?: number;
  up_by?: number;
}

interface UpdateClassroomBudgetPayload {
  crb_id?: number | null;
  class_id?: number;
  bg_type_id?: number;
  amount?: number;
  up_by?: number;
}

export interface PerheadDataItem {
  st_id: number | null;
  class_id: number | null;
  class_lev: string;
  bg_type_id: number | null;
  budget_type: string;
  st_count: number;
  amount: number;
  budget_per_head: number;
  total: number;
  total_budget: number;
  sy_year: string;
  crb_id: number | null;
}

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(SubmittingStudentRecords)
    private readonly submittingStudentRecordsRepository: Repository<SubmittingStudentRecords>,
    @InjectRepository(MasterClassroom)
    private readonly masterClassroomRepository: Repository<MasterClassroom>,
    @InjectRepository(MasterClassroomBudget)
    private readonly masterClassroomBudgetRepository: Repository<MasterClassroomBudget>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(BudgetIncomeTypeSchool)
    private readonly budgetIncomeTypeSchoolRepository: Repository<BudgetIncomeTypeSchool>,
    @InjectRepository(SchoolClassroom)
    private readonly schoolClassroomRepository: Repository<SchoolClassroom>,
  ) {}

  // ── ชั้นที่เปิดสอนของโรงเรียน ────────────────────────────────────────────────
  // คืน id ของชั้นที่ "ปิด" (is_open=0) เพื่อใช้ตัดออก (ชั้นที่ไม่มี row = เปิดตามค่าเริ่มต้น)
  private async getClosedClassIds(scId: number): Promise<Set<number>> {
    const rows = await this.schoolClassroomRepository.find({
      where: { scId, del: 0 },
    });
    return new Set(rows.filter((r) => r.isOpen === 0).map((r) => r.classId));
  }

  // คืนชั้นทั้งหมดของโรงเรียน พร้อม flag is_open (ชั้นไม่มี row = เปิด)
  async loadSchoolClassrooms(scId: number) {
    const classrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });
    const rows = await this.schoolClassroomRepository.find({
      where: { scId, del: 0 },
    });
    const openMap = new Map(rows.map((r) => [r.classId, r.isOpen]));
    return classrooms.map((c) => ({
      class_id: c.classId,
      class_lev: c.classLev ?? '',
      is_open: openMap.has(c.classId) ? (openMap.get(c.classId) as number) : 1,
    }));
  }

  async setSchoolClassrooms(payload: {
    sc_id: number;
    up_by?: number;
    items: { class_id: number; is_open: number }[];
  }) {
    try {
      for (const it of payload.items ?? []) {
        let row = await this.schoolClassroomRepository.findOne({
          where: { scId: payload.sc_id, classId: it.class_id, del: 0 },
        });
        if (!row) {
          row = this.schoolClassroomRepository.create({
            scId: payload.sc_id,
            classId: it.class_id,
            del: 0,
          });
        }
        row.isOpen = it.is_open ? 1 : 0;
        if (payload.up_by !== undefined) row.upBy = payload.up_by;
        row.updateDate = new Date();
        await this.schoolClassroomRepository.save(row);
      }
      return { flag: true, ms: 'บันทึกชั้นที่เปิดสอนสำเร็จ' };
    } catch (error) {
      this.logger.error('Set school classrooms error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
  }

  async loadStudent(
    syId: number,
    budgetYear: string,
    scId: number,
    page: number,
    pageSize: number,
  ) {
    const [items, count] = await this.studentRepository.findAndCount({
      where: {
        syId,
        budgetYear,
        scId,
        del: 0,
      },
      relations: [],
      order: { classId: 'ASC' },
      skip: page * pageSize,
      take: pageSize,
    });

    // Get classrooms for joining
    const classrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });

    // Check if record is submitted
    const submitRecord = await this.submittingStudentRecordsRepository.findOne({
      where: {
        syId,
        scId,
        year: parseInt(budgetYear),
        del: 0,
      },
    });

    const edit = submitRecord?.status !== 100;

    // Calculate total students
    const totalStudent = items.reduce((sum, item) => sum + item.stCount, 0);

    // Map data with classroom info
    const data = items.map((item) => {
      const classroom = classrooms.find((c) => c.classId === item.classId);
      return {
        st_id: item.stId,
        sc_id: item.scId,
        sy_id: item.syId,
        budget_year: item.budgetYear,
        class_id: item.classId,
        class_lev: classroom?.classLev || '',
        st_count: item.stCount,
        up_by: item.upBy,
        create_date: item.createDate,
        update_date: item.updateDate,
        del: item.del,
      };
    });

    return {
      data,
      count,
      edit,
      totalstudent: totalStudent,
    };
  }

  async addStudent(payload: AddStudentDto) {
    // Check if student already exists for this class and year
    const existing = await this.studentRepository.findOne({
      where: {
        scId: payload.sc_id,
        syId: payload.sy_id,
        budgetYear: payload.budget_year,
        classId: payload.class_id,
        del: 0,
      },
    });

    if (existing) {
      return { flag: false, ms: 'ข้อมูลนักเรียนสำหรับชั้นเรียนนี้มีอยู่แล้ว' };
    }

    const student = new Student();
    student.scId = payload.sc_id;
    student.syId = payload.sy_id;
    student.budgetYear = payload.budget_year;
    student.classId = payload.class_id;
    student.stCount = payload.st_count;
    student.upBy = payload.up_by || 0;
    student.del = 0;

    try {
      await this.studentRepository.save(student);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      this.logger.error('Add student error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async loadClassroom() {
    const classrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });

    return classrooms.map((classroom) => ({
      class_id: classroom.classId,
      class_lev: classroom.classLev,
    }));
  }

  async updateStudent(payload: UpdateStudentDto) {
    const student = await this.studentRepository.findOne({
      where: { stId: payload.st_id, del: 0 },
    });

    if (!student) {
      return { flag: false, ms: 'ไม่พบข้อมูลนักเรียน' };
    }

    if (payload.st_count !== undefined) {
      student.stCount = payload.st_count;
    }
    if (payload.up_by !== undefined) {
      student.upBy = payload.up_by;
    }

    student.updateDate = new Date();

    try {
      await this.studentRepository.save(student);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (error) {
      this.logger.error('Update student error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async checkSendRecord(payload: CheckSendRecordDto) {
    const record = await this.submittingStudentRecordsRepository.findOne({
      where: {
        scId: payload.sc_id,
        syId: payload.sy_id,
        year: payload.year,
        del: 0,
      },
    });

    if (!record) {
      return {
        ssr_id: 0,
        status: 0,
      };
    }

    return {
      ssr_id: record.ssrId,
      status: record.status,
    };
  }

  async confirmSendRecord(payload: ConfirmSendRecordDto) {
    let record = await this.submittingStudentRecordsRepository.findOne({
      where: {
        scId: payload.sc_id,
        syId: payload.sy_id,
        year: payload.year,
        del: 0,
      },
    });

    if (!record) {
      record = new SubmittingStudentRecords();
      record.scId = payload.sc_id;
      record.syId = payload.sy_id;
      record.year = payload.year;
      record.upBy = payload.up_by || 0;
      record.del = 0;
    }

    record.status = 100;
    record.updateDate = new Date();

    try {
      await this.submittingStudentRecordsRepository.save(record);
      return { flag: true, ms: 'ยืนยันการส่งข้อมูลสำเร็จ' };
    } catch (error) {
      this.logger.error('Confirm send record error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการยืนยัน' };
    }
  }

  async checkClassOnYear(payload: CheckClassOnYearDto) {
    // Check if students exist for this year
    const count = await this.studentRepository.count({
      where: {
        scId: payload.sc_id,
        syId: payload.sy_id,
        budgetYear: payload.budget_date,
        del: 0,
      },
    });

    // If no students, create default records for all classes
    if (count === 0) {
      const classrooms = await this.masterClassroomRepository.find({
        order: { classId: 'ASC' },
      });

      const students = classrooms.map((classroom) => {
        const student = new Student();
        student.scId = payload.sc_id;
        student.syId = payload.sy_id;
        student.budgetYear = payload.budget_date;
        student.classId = classroom.classId;
        student.stCount = 0;
        student.upBy = payload.up_by || 0;
        student.del = 0;
        return student;
      });

      await this.studentRepository.save(students);
    }

    return { valid: true };
  }

  async loadCalculatePerhead(scId: number, year: number) {
    this.logger.debug(
      'loadCalculatePerhead called with scId:',
      scId,
      'year:',
      year,
    );

    // Get students for the year - try both syId and budget_year
    let students = await this.studentRepository.find({
      where: {
        scId,
        syId: year,
        del: 0,
      },
      relations: [],
      order: { classId: 'ASC' },
    });

    // If no students found with syId, try to find by budget_year
    if (students.length === 0) {
      this.logger.debug(
        'No students found with syId, trying to find by budget_year',
      );
      const budgetYear = String(year + 543); // Convert to Buddhist year
      students = await this.studentRepository.find({
        where: {
          scId,
          budgetYear: budgetYear,
          del: 0,
        },
        relations: [],
        order: { classId: 'ASC' },
      });
      this.logger.debug('Found students by budget_year:', students.length);
    }

    this.logger.debug('Found students:', students.length);
    if (students.length > 0) {
      this.logger.debug('First student:', {
        stId: students[0].stId,
        classId: students[0].classId,
        stCount: students[0].stCount,
        scId: students[0].scId,
        syId: students[0].syId,
        budgetYear: students[0].budgetYear,
      });
    } else {
      this.logger.warn('No students found for scId:', scId, 'year:', year);
    }

    // Get classrooms (ตัดชั้นที่โรงเรียนไม่เปิดสอนออก)
    const allClassrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });
    const closedClassIds = await this.getClosedClassIds(scId);
    const classrooms = allClassrooms.filter(
      (c) => !closedClassIds.has(c.classId),
    );

    // Get budget types - only selected ones for this school ที่เปิดให้กำหนดรายหัว (perhead != 0)
    const selectedBudgetTypes =
      await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId,
          del: 0,
          perhead: Not(0),
        },
      });

    const selectedBgTypeIds = selectedBudgetTypes
      .map((item) => item.bgTypeId)
      .filter((id) => id !== null);

    // คำนวณเฉพาะประเภทเงินที่โรงเรียนตั้งให้ "กำหนดรายหัวได้" (perhead != 0) เท่านั้น
    // ถ้ายังไม่ได้ตั้งค่า → ไม่คำนวณอะไรเลย (สอดคล้องกับหน้า 1.4 loadPerheadRateSetting)
    const budgetTypes =
      selectedBgTypeIds.length > 0
        ? await this.budgetIncomeTypeRepository.find({
            where: {
              bgTypeId: In(selectedBgTypeIds),
              del: 0,
            },
            order: { bgTypeId: 'ASC' },
          })
        : [];

    // Get classroom budgets (อัตราเงินต่อหัวเฉพาะปีงบที่เลือก)
    const classroomBudgets = await this.masterClassroomBudgetRepository.find({
      where: { del: 0, syId: year },
      order: { classId: 'ASC', bgTypeId: 'ASC' },
    });

    // Build data structure: for each student, create entries for each budget type
    // Filter: only include students with stCount > 0
    const data: PerheadDataItem[] = [];
    const syYear = String(year + 543); // Convert to Buddhist year

    for (const student of students) {
      // Skip students with count = 0
      if (!student.stCount || student.stCount === 0) {
        continue;
      }

      const classroom = classrooms.find((c) => c.classId === student.classId);
      // ข้ามนักเรียนของชั้นที่โรงเรียน "ไม่เปิดสอน" (ถูกตัดออกจาก classrooms แล้ว)
      // กันแถวระดับชั้นว่างเปล่า และไม่ให้เงินของชั้นที่ปิดถูกรวมในยอดรวม
      if (!classroom) {
        continue;
      }

      for (const budgetType of budgetTypes) {
        const classroomBudget = classroomBudgets.find(
          (cb) =>
            cb.classId === student.classId &&
            cb.bgTypeId === budgetType.bgTypeId,
        );

        const amount = classroomBudget ? Number(classroomBudget.amount) : 0;
        const total = student.stCount * amount;

        data.push({
          st_id: student.stId,
          class_id: student.classId || null,
          class_lev: classroom?.classLev || '',
          bg_type_id: budgetType.bgTypeId || null,
          budget_type: budgetType.budgetType || '',
          st_count: student.stCount || 0,
          amount: amount,
          budget_per_head: amount,
          total: total,
          total_budget: total,
          sy_year: syYear,
          crb_id: classroomBudget?.crbId || null,
        });
      }
    }

    // If no students found, create entries for all classrooms with budget types
    if (students.length === 0) {
      this.logger.debug(
        'No students found, creating entries for all classrooms',
      );
      for (const classroom of classrooms) {
        for (const budgetType of budgetTypes) {
          const classroomBudget = classroomBudgets.find(
            (cb) =>
              cb.classId === classroom.classId &&
              cb.bgTypeId === budgetType.bgTypeId,
          );

          const amount = classroomBudget ? Number(classroomBudget.amount) : 0;
          const total = 0; // No students, so total is 0

          data.push({
            st_id: null,
            class_id: classroom.classId,
            class_lev: classroom.classLev || '',
            bg_type_id: budgetType.bgTypeId,
            budget_type: budgetType.budgetType,
            st_count: 0,
            amount: amount,
            budget_per_head: amount,
            total: total,
            total_budget: total,
            sy_year: syYear,
            crb_id: classroomBudget?.crbId || null,
          });
        }
      }
    }

    const totalprice = data.reduce((sum, item) => sum + (item.total || 0), 0);

    this.logger.debug('loadCalculatePerhead result:', {
      dataCount: data.length,
      totalprice,
      sampleItem: data.length > 0 ? data[0] : null,
    });

    return {
      data,
      count: data.length,
      totalprice,
    };
  }

  // ผลรวมงบประมาณการจากการคำนวณรายหัว (ชั้นที่เปิดสอน × ประเภทเงินที่กำหนดรายหัว)
  // ใช้เป็น "ยอดประมาณการ" ในงานงบประมาณ (หน้า 1.6/1.7) เพื่อให้ตรงกับหน้า 1.5 เสมอ
  async getPerheadTotal(scId: number, syId: number): Promise<number> {
    const result = await this.loadCalculatePerhead(scId, syId);
    return result.totalprice || 0;
  }

  // ยอดประมาณการรายรับ "แยกตามประเภทเงิน" จากการคำนวณรายหัว (รวม total group by bg_type)
  // ใช้ในหน้า 1.7 (กำหนดวงเงินงบประมาณ) ให้รายการ/ยอดตรงกับหน้า 1.5
  async getPerheadByType(
    scId: number,
    syId: number,
  ): Promise<
    { bg_type_id: number; budget_type: string; estimated_amount: number }[]
  > {
    const result = await this.loadCalculatePerhead(scId, syId);
    const map = new Map<
      number,
      { bg_type_id: number; budget_type: string; estimated_amount: number }
    >();
    for (const item of result.data) {
      if (item.bg_type_id == null) continue;
      const amount = Number(item.total) || 0;
      const prev = map.get(item.bg_type_id);
      if (prev) {
        prev.estimated_amount += amount;
      } else {
        map.set(item.bg_type_id, {
          bg_type_id: item.bg_type_id,
          budget_type: item.budget_type,
          estimated_amount: amount,
        });
      }
    }
    return [...map.values()];
  }

  async addClassroomBudget(payload: ClassroomBudgetPayload) {
    // Check if already exists
    const existing = await this.masterClassroomBudgetRepository.findOne({
      where: {
        classId: payload.class_id,
        bgTypeId: payload.bg_type_id,
        del: 0,
      },
    });

    if (existing) {
      return {
        flag: false,
        ms: 'อัตรารายหัวสำหรับชั้นเรียนและประเภทเงินนี้มีอยู่แล้ว กรุณาใช้การแก้ไขแทน',
      };
    }

    const classroomBudget = new MasterClassroomBudget();
    classroomBudget.classId = payload.class_id;
    classroomBudget.bgTypeId = payload.bg_type_id;
    classroomBudget.amount = payload.amount ?? 0;
    classroomBudget.upBy = payload.up_by || 0;
    classroomBudget.del = 0;

    try {
      await this.masterClassroomBudgetRepository.save(classroomBudget);
      return { flag: true, ms: 'บันทึกอัตรารายหัวสำเร็จ' };
    } catch (error) {
      this.logger.error('Add classroom budget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกอัตรารายหัว' };
    }
  }

  async updateClassroomBudget(payload: UpdateClassroomBudgetPayload) {
    this.logger.debug('updateClassroomBudget called with payload:', payload);

    // If crb_id is null or 0, create a new record instead
    if (!payload.crb_id || payload.crb_id === 0 || payload.crb_id === null) {
      this.logger.debug('crb_id is null/0, creating new record instead');
      if (!payload.class_id || !payload.bg_type_id) {
        return {
          flag: false,
          ms: 'ไม่พบข้อมูล class_id หรือ bg_type_id สำหรับสร้างอัตรารายหัวใหม่',
        };
      }
      return this.addClassroomBudget({
        class_id: payload.class_id,
        bg_type_id: payload.bg_type_id,
        amount: payload.amount,
        up_by: payload.up_by,
      });
    }

    const classroomBudget = await this.masterClassroomBudgetRepository.findOne({
      where: { crbId: payload.crb_id, del: 0 },
    });

    if (!classroomBudget) {
      this.logger.debug(
        'Classroom budget not found with crb_id:',
        payload.crb_id,
      );
      // Try to create new record if not found
      if (payload.class_id && payload.bg_type_id) {
        this.logger.debug('Attempting to create new record');
        return this.addClassroomBudget({
          class_id: payload.class_id,
          bg_type_id: payload.bg_type_id,
          amount: payload.amount,
          up_by: payload.up_by,
        });
      }
      return { flag: false, ms: 'ไม่พบข้อมูลอัตรารายหัว' };
    }

    if (payload.amount !== undefined) classroomBudget.amount = payload.amount;
    classroomBudget.upBy = payload.up_by || classroomBudget.upBy;
    classroomBudget.updateDate = new Date();

    try {
      await this.masterClassroomBudgetRepository.save(classroomBudget);
      return { flag: true, ms: 'แก้ไขอัตรารายหัวสำเร็จ' };
    } catch (error) {
      this.logger.error('Update classroom budget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการแก้ไขอัตรารายหัว' };
    }
  }

  async loadBudgetAllocation(scId: number, _syId: number) {
    // Get all budget types
    const allBudgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    // Get selected budget types for this school and year
    const selectedBudgetTypes =
      await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId,
          del: 0,
        },
      });

    // Map selected budget types
    const selectedMap = new Map<number, boolean>();
    selectedBudgetTypes.forEach((item) => {
      if (item.bgTypeId) {
        selectedMap.set(item.bgTypeId, true);
      }
    });

    // Build response
    const data = allBudgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      selected: selectedMap.has(type.bgTypeId) ? 1 : 0,
    }));

    return { data, count: data.length };
  }

  async setBudgetAllocation(payload: SetBudgetAllocationDto) {
    try {
      this.logger.debug(
        'setBudgetAllocation called with payload:',
        JSON.stringify(payload, null, 2),
      );

      // Validate input
      if (!payload.sc_id || payload.sc_id <= 0) {
        return { flag: false, ms: 'ไม่พบข้อมูล sc_id' };
      }
      if (!payload.budget_types || !Array.isArray(payload.budget_types)) {
        return { flag: false, ms: 'ไม่พบข้อมูล budget_types' };
      }

      // Get existing allocations for this school
      const existing = await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId: payload.sc_id,
          del: 0,
        },
      });

      this.logger.debug('Existing allocations:', existing.length);

      // เก็บค่า perhead เดิมของแต่ละ bg_type_id ไว้ก่อนลบ
      // เพื่อไม่ให้การตั้งค่า "ประเภทเงินที่กำหนดรายหัวได้" (หน้า 1.3) ถูกรีเซ็ตเป็น 1
      const perheadByType = new Map<number, number>();
      for (const item of existing) {
        if (item.bgTypeId != null) {
          perheadByType.set(item.bgTypeId, item.perhead ?? 1);
        }
      }

      // Soft delete all existing
      if (existing && existing.length > 0) {
        for (const item of existing) {
          item.del = 1;
          item.updateDate = new Date();
          await this.budgetIncomeTypeSchoolRepository.save(item);
        }
        this.logger.debug(
          'Soft deleted',
          existing.length,
          'existing allocations',
        );
      }

      // Create new allocations for selected budget types
      const newAllocations: any[] = [];
      for (const budgetType of payload.budget_types) {
        // Check if selected is 1 (number)
        if (budgetType.selected === 1) {
          const newAllocation = this.budgetIncomeTypeSchoolRepository.create({
            scId: payload.sc_id,
            bgTypeId: budgetType.bg_type_id,
            baId: null,
            // คงค่า perhead เดิมไว้ (ประเภทใหม่ที่ยังไม่เคยตั้ง = 1 ตาม default)
            perhead: perheadByType.get(budgetType.bg_type_id) ?? 1,
            upBy: payload.up_by || 0,
            del: 0,
            createDate: new Date(),
            updateDate: new Date(),
          });
          newAllocations.push(newAllocation);
        }
      }

      this.logger.debug('Creating', newAllocations.length, 'new allocations');

      // Save all new allocations in batch
      if (newAllocations.length > 0) {
        await this.budgetIncomeTypeSchoolRepository.save(newAllocations);
        this.logger.debug('Saved', newAllocations.length, 'new allocations');
      }

      return { flag: true, ms: 'บันทึกการกำหนดประเภทเงินที่ประมาณการสำเร็จ' };
    } catch (error) {
      this.logger.error('Set budget allocation error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการบันทึกการกำหนดประเภทเงินที่ประมาณการ: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async loadPerheadRateSetting(scId: number, syId: number) {
    // เฉพาะประเภทเงินของโรงเรียนที่เปิดให้กำหนดรายหัว (perhead = 1)
    // ประเภทที่ตั้ง perhead = 0 จะไม่แสดงให้กรอกในหน้าตั้งค่าเกณฑ์เงินต่อหัว
    const selectedBudgetTypes =
      await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId,
          del: 0,
          perhead: Not(0),
        },
      });

    const selectedBgTypeIds = selectedBudgetTypes
      .map((item) => item.bgTypeId)
      .filter((id) => id !== null);

    if (selectedBgTypeIds.length === 0) {
      return { data: [], count: 0 };
    }

    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: {
        bgTypeId: In(selectedBgTypeIds),
        del: 0,
      },
      order: { bgTypeId: 'ASC' },
    });

    // Get all classrooms (ตัดชั้นที่โรงเรียนไม่เปิดสอนออก)
    const allClassrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });
    const closedIds = await this.getClosedClassIds(scId);
    const classrooms = allClassrooms.filter((c) => !closedIds.has(c.classId));

    // Get existing per-head rates (เฉพาะปีงบที่เลือก)
    const existingRates = await this.masterClassroomBudgetRepository.find({
      where: { del: 0, syId },
      order: { classId: 'ASC', bgTypeId: 'ASC' },
    });

    // Build data structure: for each classroom and budget type combination
    const data: {
      class_id: number;
      class_lev: string;
      bg_type_id: number;
      budget_type: string;
      amount: number;
      crb_id: number | null;
    }[] = [];
    for (const classroom of classrooms) {
      for (const budgetType of budgetTypes) {
        const existingRate = existingRates.find(
          (r) =>
            r.classId === classroom.classId &&
            r.bgTypeId === budgetType.bgTypeId,
        );

        data.push({
          class_id: classroom.classId,
          class_lev: classroom.classLev ?? '',
          bg_type_id: budgetType.bgTypeId,
          budget_type: budgetType.budgetType,
          amount: existingRate ? Number(existingRate.amount) : 0,
          crb_id: existingRate?.crbId || null,
        });
      }
    }

    return { data, count: data.length };
  }

  async setPerheadRate(payload: SetPerheadRateDto) {
    try {
      for (const rate of payload.rates) {
        if (rate.amount > 0) {
          // Check if record exists
          const existing = await this.masterClassroomBudgetRepository.findOne({
            where: {
              syId: payload.sy_id,
              classId: rate.class_id,
              bgTypeId: rate.bg_type_id,
              del: 0,
            },
          });

          if (existing) {
            // Update existing
            existing.amount = rate.amount;
            if (payload.up_by !== undefined) existing.upBy = payload.up_by;
            existing.updateDate = new Date();
            await this.masterClassroomBudgetRepository.save(existing);
          } else {
            // Create new
            const newRate = this.masterClassroomBudgetRepository.create({
              syId: payload.sy_id,
              classId: rate.class_id,
              bgTypeId: rate.bg_type_id,
              amount: rate.amount,
              upBy: payload.up_by,
              del: 0,
              createDate: new Date(),
              updateDate: new Date(),
            });
            await this.masterClassroomBudgetRepository.save(newRate);
          }
        } else {
          // If amount is 0, soft delete existing record
          const existing = await this.masterClassroomBudgetRepository.findOne({
            where: {
              syId: payload.sy_id,
              classId: rate.class_id,
              bgTypeId: rate.bg_type_id,
              del: 0,
            },
          });

          if (existing) {
            existing.del = 1;
            existing.updateDate = new Date();
            await this.masterClassroomBudgetRepository.save(existing);
          }
        }
      }

      return { flag: true, ms: 'บันทึกอัตราการสนับสนุนเงินรายหัวสำเร็จ' };
    } catch (error) {
      this.logger.error('Set perhead rate error:', error);
      return {
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกอัตราการสนับสนุนเงินรายหัว',
      };
    }
  }

  // ── ตั้งค่าประเภทเงินที่กำหนดเงินต่อหัวได้ ────────────────────────────────────
  // คืนประเภทเงินที่โรงเรียนเลือกใช้ พร้อม flag perhead (1=กำหนดรายหัวได้)
  async loadPerheadBudgetTypes(scId: number) {
    const schoolTypes = await this.budgetIncomeTypeSchoolRepository.find({
      where: { scId, del: 0 },
      order: { bgTypeId: 'ASC' },
    });
    const ids = schoolTypes
      .map((s) => s.bgTypeId)
      .filter((x): x is number => x !== null);
    const masters = ids.length
      ? await this.budgetIncomeTypeRepository.find({
          where: { bgTypeId: In(ids), del: 0 },
        })
      : [];
    const name = (id: number | null) =>
      masters.find((m) => m.bgTypeId === id)?.budgetType ?? '';

    return schoolTypes.map((s) => ({
      bg_type_school_id: s.bgTypeSchoolId,
      bg_type_id: s.bgTypeId,
      budget_type: name(s.bgTypeId),
      perhead: s.perhead ?? 1,
    }));
  }

  async setPerheadBudgetTypes(payload: {
    sc_id: number;
    up_by?: number;
    items: { bg_type_school_id: number; perhead: number }[];
  }) {
    try {
      for (const it of payload.items ?? []) {
        const row = await this.budgetIncomeTypeSchoolRepository.findOne({
          where: {
            bgTypeSchoolId: it.bg_type_school_id,
            scId: payload.sc_id,
            del: 0,
          },
        });
        if (row) {
          row.perhead = it.perhead ? 1 : 0;
          if (payload.up_by !== undefined) row.upBy = payload.up_by;
          row.updateDate = new Date();
          await this.budgetIncomeTypeSchoolRepository.save(row);
        }
      }
      return { flag: true, ms: 'บันทึกการตั้งค่าประเภทเงินรายหัวสำเร็จ' };
    } catch (error) {
      this.logger.error('Set perhead budget types error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
  }
}
