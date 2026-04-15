import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(BudgetIncomeTypeSchool)
    private readonly budgetIncomeTypeSchoolRepository: Repository<BudgetIncomeTypeSchool>,
  ) {}

  async loadSchools(page: number, pageSize: number) {
    const [items, count] = await this.schoolRepository.findAndCount({
      where: { del: 0 },
      order: { scId: 'DESC' },
      skip: page * pageSize,
      take: pageSize,
    });

    return {
      data: items.map((s) => ({
        sc_id: s.scId,
        sc_name: s.scName,
        sc_address: s.add1 ?? '',
        sc_phone: s.tel ?? '',
        sc_code: s.scCode,
        email: s.email,
        logo: s.logo,
        del: s.del,
      })),
      count,
      page,
      pageSize,
    };
  }

  async loadBudgetIncomeTypeSchool(
    scId: number,
    page: number,
    pageSize: number,
  ) {
    const [items, count] =
      await this.budgetIncomeTypeSchoolRepository.findAndCount({
        where: { scId, del: 0 },
        order: { bgTypeSchoolId: 'DESC' },
        skip: page * pageSize,
        take: pageSize,
      });

    return {
      data: items,
      count,
      page,
      pageSize,
    };
  }

  async addSchool(payload: any) {
    const school = this.schoolRepository.create({
      scName: payload.sc_name ?? '',
      add1: payload.sc_address ?? null,
      tel: payload.sc_phone ?? null,
      del: 0,
    });
    try {
      await this.schoolRepository.save(school);
      return { flag: true, ms: 'บันทึกข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
  }

  async updateSchool(payload: any) {
    const school = await this.schoolRepository.findOne({
      where: { scId: payload.sc_id, del: 0 },
    });
    if (!school) return { flag: false, ms: 'ไม่พบข้อมูลโรงเรียน' };

    if (payload.sc_name !== undefined) school.scName = payload.sc_name;
    if (payload.sc_address !== undefined) school.add1 = payload.sc_address;
    if (payload.sc_phone !== undefined) school.tel = payload.sc_phone;

    try {
      await this.schoolRepository.save(school);
      return { flag: true, ms: 'อัปเดตข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' };
    }
  }

  async removeSchool(payload: any) {
    const school = await this.schoolRepository.findOne({
      where: { scId: payload.sc_id, del: 0 },
    });
    if (!school) return { flag: false, ms: 'ไม่พบข้อมูลโรงเรียน' };

    school.del = 1;
    try {
      await this.schoolRepository.save(school);
      return { flag: true, ms: 'ลบข้อมูลสำเร็จ' };
    } catch (_error) {
      return { flag: false, ms: 'เกิดข้อผิดพลาดในการลบข้อมูล' };
    }
  }

  loadProvince() {
    return [];
  }
}
