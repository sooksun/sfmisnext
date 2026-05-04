import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../receipt/entities/receipt.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class YearEndReportService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  /** คำนวณจำนวนวันที่เหลือถึงวันกำหนดส่ง (ลบ = เกินกำหนด) */
  private daysRemaining(
    targetMonth: number,
    targetDay: number,
    budgetYearCE: number,
  ): number {
    // กำหนดส่งคือปีถัดไปจากปีงบประมาณ (CE)
    const deadline = new Date(
      budgetYearCE + 1,
      targetMonth - 1,
      targetDay,
      0,
      0,
      0,
      0,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ─── receipt usage report ────────────────────────────────────────────────────

  async getReceiptUsageReport(scId: number, syId: number, budgetYear: string) {
    try {
      // budget_year อาจเป็น พ.ศ. (≥2400) หรือ ค.ศ. (≤2100) ให้แปลงเป็น ค.ศ.
      const byNum = parseInt(budgetYear, 10);
      const budgetYearCE = byNum >= 2400 ? byNum - 543 : byNum;
      const budgetYearStr = String(byNum); // ตามที่เก็บใน DB (column year)

      // โหลดใบเสร็จทั้งหมดของปีงบประมาณนี้ (status = '1' = active)
      const receipts = await this.receiptRepository
        .createQueryBuilder('r')
        .where('r.sc_id = :scId', { scId })
        .andWhere('r.sy_id = :syId', { syId })
        .andWhere('r.year = :year', { year: budgetYearStr })
        .andWhere('r.status = :status', { status: '1' })
        .leftJoin('pln_receive', 'pr', 'pr.pr_id = r.pr_id')
        .addSelect('pr.receive_form', 'receive_form')
        .getRawMany<{
          r_r_id: number;
          r_r_no: string | null;
          r_detail: string | null;
          r_pr_id: string;
          r_date_generate: string | null;
          receive_form: string | null;
        }>();

      const totalCount = receipts.length;

      // group by receive_form (ประเภทแบบฟอร์ม) เป็น proxy ของประเภทใบเสร็จ
      const groupMap = new Map<
        string,
        { count: number; amount_total: number }
      >();

      for (const r of receipts) {
        const typeName = r.receive_form || 'ทั่วไป';
        const existing = groupMap.get(typeName);
        if (existing) {
          existing.count += 1;
        } else {
          groupMap.set(typeName, { count: 1, amount_total: 0 });
        }
      }

      // โหลดยอดเงินจาก pln_receive_detail โดย join ผ่าน pln_receive
      // pr_id ของใบเสร็จเชื่อมกับ pln_receive.pr_id
      const prIds = receipts
        .map((r) => parseInt(r.r_pr_id, 10))
        .filter((id) => !isNaN(id) && id > 0);

      if (prIds.length > 0) {
        const details = await this.plnReceiveDetailRepository
          .createQueryBuilder('prd')
          .where('prd.pr_id IN (:...prIds)', { prIds })
          .andWhere('prd.del = :del', { del: 0 })
          .select('prd.pr_id', 'pr_id')
          .addSelect('SUM(prd.prd_budget)', 'total_budget')
          .groupBy('prd.pr_id')
          .getRawMany<{ pr_id: string; total_budget: string }>();

        const detailMap = new Map(
          details.map((d) => [
            parseInt(d.pr_id, 10),
            parseFloat(d.total_budget) || 0,
          ]),
        );

        // map pr_id → receive_form
        for (const r of receipts) {
          const prId = parseInt(r.r_pr_id, 10);
          const amount = detailMap.get(prId) ?? 0;
          const typeName = r.receive_form || 'ทั่วไป';
          const item = groupMap.get(typeName);
          if (item) {
            item.amount_total += amount;
          }
        }
      }

      const byType = Array.from(groupMap.entries()).map(([type_name, v]) => ({
        type_name,
        count: v.count,
        amount_total: v.amount_total,
      }));

      const daysRem = this.daysRemaining(10, 15, budgetYearCE);

      return {
        budget_year: budgetYear,
        total_count: totalCount,
        by_type: byType,
        deadline: '15 ต.ค.',
        days_remaining: daysRem,
      };
    } catch {
      const byNum = parseInt(budgetYear, 10);
      const budgetYearCE = byNum >= 2400 ? byNum - 543 : byNum;
      return {
        budget_year: budgetYear,
        total_count: 0,
        by_type: [],
        deadline: '15 ต.ค.',
        days_remaining: this.daysRemaining(10, 15, budgetYearCE),
      };
    }
  }

  // ─── school revenue report ────────────────────────────────────────────────────

  async getSchoolRevenueReport(scId: number, syId: number, budgetYear: string) {
    try {
      const byNum = parseInt(budgetYear, 10);
      const budgetYearCE = byNum >= 2400 ? byNum - 543 : byNum;
      const budgetYearStr = String(byNum);

      // โหลด pln_receive (รายรับ) ที่ cfTransaction=1 (ยืนยันแล้ว)
      const receives = await this.plnReceiveRepository
        .createQueryBuilder('pr')
        .where('pr.sc_id = :scId', { scId })
        .andWhere('pr.sy_id = :syId', { syId })
        .andWhere('pr.budget_year = :budgetYear', { budgetYear: budgetYearStr })
        .andWhere('pr.del = :del', { del: 0 })
        .andWhere('pr.cf_transaction = :cf', { cf: 1 })
        .getMany();

      const prIds = receives.map((pr) => pr.prId);

      // โหลด details ของ pln_receive
      let details: {
        pr_id: number;
        prd_budget: number;
        bg_type_id: number | null;
        prd_detail: string | null;
      }[] = [];

      if (prIds.length > 0) {
        const rawDetails = await this.plnReceiveDetailRepository
          .createQueryBuilder('prd')
          .where('prd.pr_id IN (:...prIds)', { prIds })
          .andWhere('prd.del = :del', { del: 0 })
          .select('prd.pr_id', 'pr_id')
          .addSelect('prd.prd_budget', 'prd_budget')
          .addSelect('prd.bg_type_id', 'bg_type_id')
          .addSelect('prd.prd_detail', 'prd_detail')
          .getRawMany<{
            pr_id: string;
            prd_budget: string;
            bg_type_id: string | null;
            prd_detail: string | null;
          }>();

        details = rawDetails.map((d) => ({
          pr_id: parseInt(d.pr_id, 10),
          prd_budget: parseFloat(d.prd_budget) || 0,
          bg_type_id: d.bg_type_id ? parseInt(d.bg_type_id, 10) : null,
          prd_detail: d.prd_detail ?? null,
        }));
      }

      // โหลดชื่อประเภทงบประมาณ
      const bgTypeIds = [
        ...new Set(
          details
            .map((d) => d.bg_type_id)
            .filter((id): id is number => id !== null),
        ),
      ];
      const budgetTypes =
        bgTypeIds.length > 0
          ? await this.budgetIncomeTypeRepository
              .createQueryBuilder('bt')
              .where('bt.bg_type_id IN (:...bgTypeIds)', { bgTypeIds })
              .andWhere('bt.del = :del', { del: 0 })
              .getMany()
          : [];

      const btMap = new Map(
        budgetTypes.map((bt) => [bt.bgTypeId, bt.budgetType]),
      );

      // group by bg_type_id
      const categoryMap = new Map<
        string,
        { income: number; expense: number }
      >();

      for (const d of details) {
        const catName = d.bg_type_id
          ? (btMap.get(d.bg_type_id) ?? `ประเภท ${d.bg_type_id}`)
          : 'ไม่ระบุประเภท';
        const existing = categoryMap.get(catName);
        const amt = d.prd_budget;
        if (existing) {
          existing.income += amt;
        } else {
          categoryMap.set(catName, { income: amt, expense: 0 });
        }
      }

      const byCategory = Array.from(categoryMap.entries()).map(
        ([category, v]) => ({
          category,
          income: v.income,
          expense: v.expense,
        }),
      );

      const totalIncome = byCategory.reduce((s, c) => s + c.income, 0);
      const totalExpense = byCategory.reduce((s, c) => s + c.expense, 0);
      const net = totalIncome - totalExpense;

      const daysRem = this.daysRemaining(10, 30, budgetYearCE);

      return {
        budget_year: budgetYear,
        total_income: totalIncome,
        total_expense: totalExpense,
        net,
        by_category: byCategory,
        deadline: '30 ต.ค.',
        days_remaining: daysRem,
      };
    } catch {
      const byNum = parseInt(budgetYear, 10);
      const budgetYearCE = byNum >= 2400 ? byNum - 543 : byNum;
      return {
        budget_year: budgetYear,
        total_income: 0,
        total_expense: 0,
        net: 0,
        by_category: [],
        deadline: '30 ต.ค.',
        days_remaining: this.daysRemaining(10, 30, budgetYearCE),
      };
    }
  }
}
