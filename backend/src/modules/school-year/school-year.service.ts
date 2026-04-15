import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolYear } from './entities/school-year.entity';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';

@Injectable()
export class SchoolYearService {
  constructor(
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
  ) {}

  async getSchoolYear(scId: number, page: number, pageSize: number) {
    const [items, count] = await this.schoolYearRepository.findAndCount({
      where: { scId, del: 0 },
      order: { syId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((item) => this.toResponse(item)),
      count,
      page,
      pageSize,
    };
  }

  async loadAllSchoolYears(page: number, pageSize: number) {
    const [items, count] = await this.schoolYearRepository
      .createQueryBuilder('sy')
      .where('sy.del = :del', { del: 0 })
      .orderBy('sy.syId', 'DESC')
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: items.map((item) => ({
        ...this.toResponse(item),
        // Additional aliases for B_school_year page compatibility
        sy_name: `ปีการศึกษา ${item.syYear}`,
        sy_start: item.syDateS ? String(item.syDateS).slice(0, 10) : null,
        sy_end: item.syDateE ? String(item.syDateE).slice(0, 10) : null,
      })),
      count,
      page,
      pageSize,
    };
  }

  async saveSchoolYear(payload: CreateSchoolYearDto) {
    const schoolYear = new SchoolYear();
    schoolYear.syYear = payload.sy_year;
    schoolYear.semester = payload.semester ?? 1;
    schoolYear.syDateS = payload.sy_date_s ? new Date(payload.sy_date_s) : null;
    schoolYear.syDateE = payload.sy_date_e ? new Date(payload.sy_date_e) : null;
    schoolYear.scId = payload.sc_id ?? null;
    schoolYear.budgetYear = payload.budget_year ?? null;
    schoolYear.budgetDateS = payload.budget_date_s
      ? new Date(payload.budget_date_s)
      : null;
    schoolYear.budgetDateE = payload.budget_date_e
      ? new Date(payload.budget_date_e)
      : null;
    schoolYear.upBy = payload.up_by ?? null;
    schoolYear.del = 0;

    await this.schoolYearRepository.save(schoolYear);
    return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
  }

  async updateSchoolYear(payload: UpdateSchoolYearDto) {
    const schoolYear = await this.schoolYearRepository.findOne({
      where: { syId: payload.sy_id, del: 0 },
    });

    if (!schoolYear) {
      return { flag: false, ms: 'ไม่พบข้อมูลปีการศึกษา' };
    }

    if (payload.sy_year !== undefined) schoolYear.syYear = payload.sy_year;
    if (payload.semester !== undefined) schoolYear.semester = payload.semester;
    if (payload.sy_date_s !== undefined) {
      schoolYear.syDateS = payload.sy_date_s
        ? new Date(payload.sy_date_s)
        : null;
    }
    if (payload.sy_date_e !== undefined) {
      schoolYear.syDateE = payload.sy_date_e
        ? new Date(payload.sy_date_e)
        : null;
    }
    if (payload.budget_year !== undefined)
      schoolYear.budgetYear = payload.budget_year ?? null;
    if (payload.budget_date_s !== undefined) {
      schoolYear.budgetDateS = payload.budget_date_s
        ? new Date(payload.budget_date_s)
        : null;
    }
    if (payload.budget_date_e !== undefined) {
      schoolYear.budgetDateE = payload.budget_date_e
        ? new Date(payload.budget_date_e)
        : null;
    }
    if (payload.up_by !== undefined) schoolYear.upBy = payload.up_by ?? null;

    await this.schoolYearRepository.save(schoolYear);
    return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async removeSchoolYear(syId: number) {
    const schoolYear = await this.schoolYearRepository.findOne({
      where: { syId, del: 0 },
    });

    if (!schoolYear) {
      return { flag: false, ms: 'ไม่พบข้อมูลปีการศึกษา' };
    }

    schoolYear.del = 1;
    await this.schoolYearRepository.save(schoolYear);
    return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
  }

  async loadSchoolYearByYear(scId: number) {
    // Support both sc_id = 0 (global) and specific sc_id
    // Include records where sc_id matches OR sc_id = 0 (global records)
    const items = await this.schoolYearRepository
      .createQueryBuilder('sy')
      .where('sy.del = :del', { del: 0 })
      .andWhere('(sy.scId = :scId OR sy.scId = 0 OR sy.scId IS NULL)', { scId })
      .orderBy('sy.syYear', 'DESC')
      .getMany();

    // Return array directly for *ngFor compatibility
    return items.map((item) => this.toResponse(item));
  }

  async changeYear(syId: number, scId: number, budgetSyId?: number) {
    // Support both sc_id = 0 (global) and specific sc_id
    const schoolYear = await this.schoolYearRepository
      .createQueryBuilder('sy')
      .where('sy.syId = :syId', { syId })
      .andWhere('sy.del = :del', { del: 0 })
      .andWhere('(sy.scId = :scId OR sy.scId = 0 OR sy.scId IS NULL)', { scId })
      .getOne();

    if (!schoolYear) {
      return { flag: false, ms: 'ไม่พบปีการศึกษาที่เลือก' };
    }

    // Find budget year - use budgetSyId if provided, otherwise use budgetYear or syYear
    let budgetYear: SchoolYear | null = null;
    if (budgetSyId) {
      budgetYear = await this.schoolYearRepository
        .createQueryBuilder('sy')
        .where('sy.syId = :budgetSyId', { budgetSyId })
        .andWhere('sy.del = :del', { del: 0 })
        .andWhere('(sy.scId = :scId OR sy.scId = 0 OR sy.scId IS NULL)', {
          scId,
        })
        .getOne();
    } else {
      budgetYear = await this.schoolYearRepository
        .createQueryBuilder('sy')
        .where('sy.syYear = :syYear', {
          syYear: schoolYear.budgetYear || schoolYear.syYear,
        })
        .andWhere('sy.del = :del', { del: 0 })
        .andWhere('(sy.scId = :scId OR sy.scId = 0 OR sy.scId IS NULL)', {
          scId,
        })
        .getOne();
    }

    // Return format expected by frontend
    return {
      flag: true,
      sy_date: this.toResponse(schoolYear),
      budget_date: budgetYear
        ? this.toResponse(budgetYear)
        : this.toResponse(schoolYear),
      ms: 'เปลี่ยนปีการศึกษาสำเร็จ',
    };
  }

  async checkYear() {
    // Get the most recent active school year (global or sc_id = 0)
    const schoolYear = await this.schoolYearRepository
      .createQueryBuilder('sy')
      .where('sy.del = :del', { del: 0 })
      .andWhere('(sy.scId = 0 OR sy.scId IS NULL)')
      .orderBy('sy.syYear', 'DESC')
      .addOrderBy('sy.syId', 'DESC')
      .getOne();

    if (!schoolYear) {
      return { flag: false, ms: 'ไม่พบปีการศึกษา' };
    }

    // Find budget year - use budgetYear if available, otherwise use syYear
    let budgetYear: SchoolYear | null = null;
    if (schoolYear.budgetYear) {
      budgetYear = await this.schoolYearRepository
        .createQueryBuilder('sy')
        .where('sy.syYear = :syYear', { syYear: schoolYear.budgetYear })
        .andWhere('sy.del = :del', { del: 0 })
        .andWhere('(sy.scId = 0 OR sy.scId IS NULL)')
        .getOne();
    }

    // Return format expected by frontend
    return {
      flag: true,
      sy_date: this.toResponse(schoolYear),
      budget_date: budgetYear
        ? this.toResponse(budgetYear)
        : this.toResponse(schoolYear),
      ms: 'โหลดข้อมูลปีการศึกษาสำเร็จ',
    };
  }

  private toResponse(schoolYear: SchoolYear) {
    return {
      sy_id: schoolYear.syId,
      sy_year: schoolYear.syYear,
      semester: schoolYear.semester,
      sy_date_s: schoolYear.syDateS,
      sy_date_e: schoolYear.syDateE,
      budget_year: schoolYear.budgetYear,
      budget_date_s: schoolYear.budgetDateS,
      budget_date_e: schoolYear.budgetDateE,
      sc_id: schoolYear.scId,
      up_by: schoolYear.upBy,
      cre_date: schoolYear.creDate,
      up_date: schoolYear.upDate,
      del: schoolYear.del,
    };
  }
}
