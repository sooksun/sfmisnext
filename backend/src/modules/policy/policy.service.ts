import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from './entities/budget-income-type.entity';
import { PlnRealBudget } from './entities/pln-real-budget.entity';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(PlnRealBudget)
    private readonly plnRealBudgetRepository: Repository<PlnRealBudget>,
  ) {}

  async getBudgetIncomeType() {
    const items = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return items.map((item) => ({
      bg_type_id: item.bgTypeId,
      bg_type_name: item.budgetType,
      budget_type: item.budgetType,
      budget_type_id: item.bgTypeId,
      budget_type_name: item.budgetType,
      budget_type_calc: item.budgetTypeCalc,
      budget_borrow_type: item.budgetBorrowType,
    }));
  }

  async getSchoolYear() {
    const items = await this.schoolYearRepository.find({
      where: { del: 0 },
      order: { syYear: 'DESC' },
    });

    return items.map((item) => ({
      sy_id: item.syId,
      sy_year: item.syYear,
      sy_name: `ปีการศึกษา ${item.syYear}`,
      budget_year: item.budgetYear,
      sc_id: item.scId,
      semester: item.semester,
    }));
  }

  async getPartner(scId: number) {
    const items = await this.partnerRepository.find({
      where: { scId, del: 0 },
      order: { pId: 'DESC' },
    });

    return items.map((p) => ({
      p_id: p.pId,
      p_name: p.pName,
      p_type: p.pType,
      p_id_tax: p.pIdTax,
      pay_type: p.payType,
      sc_id: p.scId,
    }));
  }

  async loadRealBudget(
    syId: number,
    scId: number,
    page: number,
    pageSize: number,
  ) {
    // syId ไม่ได้ถูกใช้ filter เพราะคอลัมน์ acad_year มีความหมายคลุมเครือ
    // (บางครั้งเก็บ sy_id บางครั้งเก็บปี CE) — กรองเฉพาะตามโรงเรียน + ยังไม่ถูกลบ
    void syId;
    const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
    const safeSize =
      Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 25;
    const offset = safePage * safeSize;

    const baseQb = this.plnRealBudgetRepository
      .createQueryBuilder('rb')
      .leftJoin(
        'master_budget_income_type',
        'bit',
        'bit.bg_type_id = rb.bg_type_id',
      )
      .where('rb.sc_id = :scId', { scId })
      .andWhere('rb.del = 0');

    const count = await baseQb.clone().getCount();

    const rows = await baseQb
      .select('rb.prb_id', 'prb_id')
      .addSelect('rb.sc_id', 'sc_id')
      .addSelect('rb.acad_year', 'acad_year')
      .addSelect('rb.bg_type_id', 'bg_type_id')
      .addSelect('bit.budget_type', 'budget_type_name')
      .addSelect('rb.receivetype', 'receivetype')
      .addSelect('rb.recieve_acadyear', 'recieve_acadyear')
      .addSelect('rb.detail', 'detail')
      .addSelect('rb.amount', 'amount')
      .addSelect('rb.del', 'del')
      .addSelect('rb.up_by', 'up_by')
      .addSelect('rb.update_date', 'up_date')
      .orderBy('rb.prb_id', 'DESC')
      .offset(offset)
      .limit(safeSize)
      .getRawMany<{
        prb_id: number;
        sc_id: number;
        acad_year: number;
        bg_type_id: number;
        budget_type_name: string | null;
        receivetype: number;
        recieve_acadyear: number;
        detail: string | null;
        amount: string | number | null;
        del: number;
        up_by: number | null;
        up_date: Date | null;
      }>();

    return {
      data: rows.map((r) => ({
        ...r,
        budget_type_name: r.budget_type_name ?? '',
        detail: r.detail ?? '',
        amount: r.amount == null ? 0 : Number(r.amount),
      })),
      count,
      page: safePage,
      pageSize: safeSize,
    };
  }

  loadExpenses(_scId: number, _year: string, page: number, pageSize: number) {
    // ในกรณีที่ยังไม่มี entity สำหรับ Expenses
    return {
      data: [],
      count: 0,
      page,
      pageSize,
    };
  }

  async addRealBudget(payload: Record<string, unknown>) {
    try {
      const row = this.plnRealBudgetRepository.create({
        scId: Number(payload.sc_id ?? 0),
        acadYear: Number(payload.acad_year ?? 0),
        autoNumbers: 0,
        bgTypeId: Number(payload.bg_type_id ?? 0),
        receivetype: Number(payload.receivetype ?? 0),
        recieveAcadyear: Number(payload.recieve_acadyear ?? 0),
        detail: String(payload.detail ?? ''),
        amount: Number(payload.amount ?? 0),
        upBy: payload.up_by != null ? Number(payload.up_by) : null,
        del: 0,
      });
      await this.plnRealBudgetRepository.save(row);
      return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
    } catch (err) {
      console.error('addRealBudget error:', err);
      return { flag: false, ms: 'บันทึกไม่สำเร็จ' };
    }
  }

  async updateRealBudget(payload: Record<string, unknown>) {
    try {
      const prbId = Number(payload.prb_id ?? 0);
      if (!prbId) return { flag: false, ms: 'ไม่พบรหัสรายการ' };

      const row = await this.plnRealBudgetRepository.findOne({
        where: { prbId, del: 0 },
      });
      if (!row) return { flag: false, ms: 'ไม่พบรายการที่ต้องการแก้ไข' };

      row.bgTypeId = Number(payload.bg_type_id ?? row.bgTypeId);
      row.receivetype = Number(payload.receivetype ?? row.receivetype);
      row.recieveAcadyear = Number(
        payload.recieve_acadyear ?? row.recieveAcadyear,
      );
      row.detail = String(payload.detail ?? row.detail ?? '');
      row.amount = Number(payload.amount ?? row.amount);
      if (payload.acad_year != null) {
        row.acadYear = Number(payload.acad_year);
      }
      if (payload.up_by != null) {
        row.upBy = Number(payload.up_by);
      }
      row.updateDate = new Date();

      await this.plnRealBudgetRepository.save(row);
      return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
    } catch (err) {
      console.error('updateRealBudget error:', err);
      return { flag: false, ms: 'บันทึกไม่สำเร็จ' };
    }
  }

  async removeRealBudget(payload: Record<string, unknown>) {
    try {
      const prbId = Number(payload.prb_id ?? 0);
      if (!prbId) return { flag: false, ms: 'ไม่พบรหัสรายการ' };

      const row = await this.plnRealBudgetRepository.findOne({
        where: { prbId, del: 0 },
      });
      if (!row) return { flag: false, ms: 'ไม่พบรายการที่ต้องการลบ' };

      row.del = 1;
      row.updateDate = new Date();
      if (payload.up_by != null) row.upBy = Number(payload.up_by);

      await this.plnRealBudgetRepository.save(row);
      return { flag: true, ms: 'ลบเรียบร้อยแล้ว' };
    } catch (err) {
      console.error('removeRealBudget error:', err);
      return { flag: false, ms: 'ลบไม่สำเร็จ' };
    }
  }

  addExpenses(_payload: unknown) {
    // ในกรณีที่ยังไม่มี entity สำหรับ Expenses
    return { flag: true, ms: 'ฟังก์ชันนี้ยังไม่พร้อมใช้งาน' };
  }

  updateExpenses(_payload: unknown) {
    // ในกรณีที่ยังไม่มี entity สำหรับ Expenses
    return { flag: true, ms: 'ฟังก์ชันนี้ยังไม่พร้อมใช้งาน' };
  }

  removeExpenses(_payload: unknown) {
    // ในกรณีที่ยังไม่มี entity สำหรับ Expenses
    return { flag: true, ms: 'ลบเรียบร้อยแล้ว' };
  }
}
