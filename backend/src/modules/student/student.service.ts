import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

interface ClassroomBudgetPayload {
  class_id: number;
  bg_type_id: number;
  amount: number;
  up_by?: number;
}

interface UpdateClassroomBudgetPayload {
  crb_id?: number | null;
  class_id?: number;
  bg_type_id?: number;
  amount: number;
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
  ) {}

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
      console.error('Add student error:', error);
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
      console.error('Update student error:', error);
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
      console.error('Confirm send record error:', error);
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
    console.log('loadCalculatePerhead called with scId:', scId, 'year:', year);

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
      console.log('No students found with syId, trying to find by budget_year');
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
      console.log('Found students by budget_year:', students.length);
    }

    console.log('Found students:', students.length);
    if (students.length > 0) {
      console.log('First student:', {
        stId: students[0].stId,
        classId: students[0].classId,
        stCount: students[0].stCount,
        scId: students[0].scId,
        syId: students[0].syId,
        budgetYear: students[0].budgetYear,
      });
    } else {
      console.warn('No students found for scId:', scId, 'year:', year);
    }

    // Get classrooms
    const classrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });

    // Get budget types - only selected ones for this school
    const selectedBudgetTypes =
      await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId,
          del: 0,
        },
      });

    const selectedBgTypeIds = selectedBudgetTypes
      .map((item) => item.bgTypeId)
      .filter((id) => id !== null);

    // If no selected budget types, get all (for backward compatibility)
    const budgetTypes =
      selectedBgTypeIds.length > 0
        ? await this.budgetIncomeTypeRepository.find({
            where: {
              bgTypeId: In(selectedBgTypeIds),
              del: 0,
            },
            order: { bgTypeId: 'ASC' },
          })
        : await this.budgetIncomeTypeRepository.find({
            where: { del: 0 },
            order: { bgTypeId: 'ASC' },
          });

    // Get classroom budgets
    const classroomBudgets = await this.masterClassroomBudgetRepository.find({
      where: { del: 0 },
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
      console.log('No students found, creating entries for all classrooms');
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

    console.log('loadCalculatePerhead result:', {
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
    classroomBudget.amount = payload.amount;
    classroomBudget.upBy = payload.up_by || 0;
    classroomBudget.del = 0;

    try {
      await this.masterClassroomBudgetRepository.save(classroomBudget);
      return { flag: true, ms: 'บันทึกอัตรารายหัวสำเร็จ' };
    } catch (error) {
      console.error('Add classroom budget error:', error);
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกอัตรารายหัว' };
    }
  }

  async updateClassroomBudget(payload: UpdateClassroomBudgetPayload) {
    console.log('updateClassroomBudget called with payload:', payload);

    // If crb_id is null or 0, create a new record instead
    if (!payload.crb_id || payload.crb_id === 0 || payload.crb_id === null) {
      console.log('crb_id is null/0, creating new record instead');
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
      console.log('Classroom budget not found with crb_id:', payload.crb_id);
      // Try to create new record if not found
      if (payload.class_id && payload.bg_type_id) {
        console.log('Attempting to create new record');
        return this.addClassroomBudget({
          class_id: payload.class_id,
          bg_type_id: payload.bg_type_id,
          amount: payload.amount,
          up_by: payload.up_by,
        });
      }
      return { flag: false, ms: 'ไม่พบข้อมูลอัตรารายหัว' };
    }

    classroomBudget.amount = payload.amount;
    classroomBudget.upBy = payload.up_by || classroomBudget.upBy;
    classroomBudget.updateDate = new Date();

    try {
      await this.masterClassroomBudgetRepository.save(classroomBudget);
      return { flag: true, ms: 'แก้ไขอัตรารายหัวสำเร็จ' };
    } catch (error) {
      console.error('Update classroom budget error:', error);
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
      console.log(
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

      console.log('Existing allocations:', existing.length);

      // Soft delete all existing
      if (existing && existing.length > 0) {
        for (const item of existing) {
          item.del = 1;
          item.updateDate = new Date();
          await this.budgetIncomeTypeSchoolRepository.save(item);
        }
        console.log('Soft deleted', existing.length, 'existing allocations');
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
            upBy: payload.up_by || 0,
            del: 0,
            createDate: new Date(),
            updateDate: new Date(),
          });
          newAllocations.push(newAllocation);
        }
      }

      console.log('Creating', newAllocations.length, 'new allocations');

      // Save all new allocations in batch
      if (newAllocations.length > 0) {
        await this.budgetIncomeTypeSchoolRepository.save(newAllocations);
        console.log('Saved', newAllocations.length, 'new allocations');
      }

      return { flag: true, ms: 'บันทึกการกำหนดประเภทเงินที่ประมาณการสำเร็จ' };
    } catch (error) {
      console.error('Set budget allocation error:', error);
      return {
        flag: false,
        ms:
          'เกิดข้อผิดพลาดในการบันทึกการกำหนดประเภทเงินที่ประมาณการ: ' +
          ((error as Error).message || 'Unknown error'),
      };
    }
  }

  async loadPerheadRateSetting(scId: number, _syId: number) {
    // Get all budget types (only selected ones)
    const selectedBudgetTypes =
      await this.budgetIncomeTypeSchoolRepository.find({
        where: {
          scId,
          del: 0,
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

    // Get all classrooms
    const classrooms = await this.masterClassroomRepository.find({
      order: { classId: 'ASC' },
    });

    // Get existing per-head rates
    const existingRates = await this.masterClassroomBudgetRepository.find({
      where: { del: 0 },
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
              classId: rate.class_id,
              bgTypeId: rate.bg_type_id,
              del: 0,
            },
          });

          if (existing) {
            // Update existing
            existing.amount = rate.amount;
            existing.upBy = payload.up_by;
            existing.updateDate = new Date();
            await this.masterClassroomBudgetRepository.save(existing);
          } else {
            // Create new
            const newRate = this.masterClassroomBudgetRepository.create({
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
      console.error('Set perhead rate error:', error);
      return {
        flag: false,
        ms: 'เกิดข้อผิดพลาดในการบันทึกอัตราการสนับสนุนเงินรายหัว',
      };
    }
  }
}
