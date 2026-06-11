import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanPrevBalance } from './entities/plan-prev-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import {
  DeletePrevBalanceDto,
  SavePrevBalanceDto,
} from './dto/plan-prev-balance.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

/** สถานะอายุเงินตามกฎ 2 ปีงบประมาณ */
type AgeStatus = 'ok' | 'last_year' | 'expired';

@Injectable()
export class PlanPrevBalanceService {
  constructor(
    @InjectRepository(PlanPrevBalance)
    private readonly repo: Repository<PlanPrevBalance>,
    @InjectRepository(FiscalYearBalance)
    private readonly fybRepo: Repository<FiscalYearBalance>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepo: Repository<SchoolYear>,
    private readonly fundBalanceService: FundBalanceService,
  ) {}

  /** ปีที่ใช้ได้ถึง = ปีที่มา + 1 (ใช้ภายใน 2 ปีงบ) */
  private usableUntil(sourceBudgetYear: string | null): number | null {
    const src = Number(sourceBudgetYear);
    return Number.isFinite(src) && src > 0 ? src + 1 : null;
  }

  /** เทียบอายุเงินกับปีงบที่กำลังวางแผน */
  private ageStatus(
    sourceBudgetYear: string | null,
    budgetYear: string,
  ): AgeStatus {
    const until = this.usableUntil(sourceBudgetYear);
    const cur = Number(budgetYear);
    if (until == null || !Number.isFinite(cur)) return 'ok';
    if (until < cur) return 'expired';
    if (until === cur) return 'last_year';
    return 'ok';
  }

  private decorate(
    row: {
      ppb_id: number;
      money_type_id: number;
      money_type_name: string | null;
      source_budget_year: string | null;
      amount: number;
      finance_amount: number | null;
      is_confirmed: boolean;
      remark: string | null;
    },
    budgetYear: string,
  ) {
    return {
      ...row,
      usable_until_year: this.usableUntil(row.source_budget_year),
      age_status: this.ageStatus(row.source_budget_year, budgetYear),
    };
  }

  /**
   * โหลดเงินเหลือจ่ายปีเก่าของปีที่วางแผน
   *  - ถ้ามี row บันทึกแล้ว คืนตามนั้น
   *  - ถ้ายังไม่มี → pre-fill จาก fiscal_year_balance ของปีงบก่อนหน้า (อ้างอิงฝั่งการเงิน)
   */
  async load(scId: number, syId: number, budgetYear: string) {
    const saved = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { moneyTypeId: 'ASC' },
    });

    if (saved.length > 0) {
      return {
        data: saved.map((b) =>
          this.decorate(
            {
              ppb_id: b.ppbId,
              money_type_id: b.moneyTypeId,
              money_type_name: b.moneyTypeName,
              source_budget_year: b.sourceBudgetYear,
              amount: Number(b.amount) || 0,
              finance_amount:
                b.financeAmount == null ? null : Number(b.financeAmount),
              is_confirmed: b.isConfirmed === 1,
              remark: b.remark,
            },
            budgetYear,
          ),
        ),
        count: saved.length,
        prefilled: false,
      };
    }

    // pre-fill: สรุปยอดเงินคงเหลือจริงรายประเภทเงินของปีงบก่อนหน้า (กรองเฉพาะ > 0)
    const prevYear = String(Number(budgetYear) - 1);
    const candidates = await this.computePrevYearBalances(scId, prevYear);

    return {
      data: candidates.map((c) =>
        this.decorate(
          {
            ppb_id: 0,
            money_type_id: c.money_type_id,
            money_type_name: c.money_type_name,
            source_budget_year: prevYear,
            amount: c.amount,
            finance_amount: c.amount,
            is_confirmed: false,
            remark: null,
          },
          budgetYear,
        ),
      ),
      count: candidates.length,
      prefilled: true,
    };
  }

  /**
   * สรุปยอดเงินคงเหลือจริง "รายประเภทเงิน" ณ สิ้นปีงบก่อนหน้า — กรองเฉพาะที่ยังมีเงินคงเหลือ (> 0)
   *  1) ถ้าการเงินปิดปี (fiscal_year_balance) แล้ว → ใช้ยอดทางการ (total_balance)
   *  2) ถ้ายังไม่ปิด → คำนวณสดจาก ledger: ยอดยกมา + รับ − จ่าย (FundBalanceService) ของปีงบก่อน
   */
  private async computePrevYearBalances(
    scId: number,
    prevYear: string,
  ): Promise<
    Array<{
      money_type_id: number;
      money_type_name: string | null;
      amount: number;
    }>
  > {
    // 1) ยอดทางการจากการปิดปีงบ
    const fyb = await this.fybRepo.find({
      where: { scId, budgetYear: prevYear, del: 0 },
      order: { moneyTypeId: 'ASC' },
    });
    if (fyb.length > 0) {
      return fyb
        .map((b) => ({
          money_type_id: b.moneyTypeId,
          money_type_name: b.moneyTypeName,
          amount: Number(b.totalBalance) || 0,
        }))
        .filter((r) => r.amount > 0);
    }

    // 2) คำนวณสดจาก ledger ของปีงบก่อน (ต้องมี school_year ของปีนั้น)
    const prevSy = await this.schoolYearRepo.findOne({
      where: { scId, budgetYear: Number(prevYear), del: 0 },
      order: { syId: 'ASC' },
    });
    if (!prevSy) return [];

    const types = await this.budgetTypeRepo.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    const out: Array<{
      money_type_id: number;
      money_type_name: string | null;
      amount: number;
    }> = [];
    for (const t of types) {
      const bal = await this.fundBalanceService.available(
        scId,
        prevSy.syId,
        t.bgTypeId,
      );
      if (bal > 0) {
        out.push({
          money_type_id: t.bgTypeId,
          money_type_name: t.budgetType,
          amount: bal,
        });
      }
    }
    return out;
  }

  /** บันทึก/ยืนยันหลายรายการพร้อมกัน (upsert ตามประเภทเงิน + ปีที่มา) */
  async save(dto: SavePrevBalanceDto) {
    for (const r of dto.rows) {
      const sourceYear =
        r.source_budget_year ?? String(Number(dto.budget_year) - 1);

      // snapshot ชื่อประเภทเงินถ้าไม่ได้ส่งมา
      let moneyTypeName = r.money_type_name ?? null;
      if (!moneyTypeName) {
        const bt = await this.budgetTypeRepo.findOne({
          where: { bgTypeId: r.money_type_id },
        });
        moneyTypeName = bt?.budgetType ?? null;
      }

      let bal = await this.repo.findOne({
        where: {
          scId: dto.sc_id,
          syId: dto.sy_id,
          budgetYear: dto.budget_year,
          moneyTypeId: r.money_type_id,
          sourceBudgetYear: sourceYear,
          del: 0,
        },
      });

      if (!bal) {
        bal = this.repo.create({
          scId: dto.sc_id,
          syId: dto.sy_id,
          budgetYear: dto.budget_year,
          moneyTypeId: r.money_type_id,
          sourceBudgetYear: sourceYear,
          del: 0,
        });
      }

      bal.moneyTypeName = moneyTypeName;
      bal.amount = r.amount ?? 0;
      bal.financeAmount = r.finance_amount ?? null;
      bal.remark = r.remark ?? null;
      bal.isConfirmed = 1;
      bal.upBy = dto.up_by ?? 0;

      await this.repo.save(bal);
    }
    return {
      flag: true,
      ms: `บันทึกเงินเหลือจ่ายปีเก่า ${dto.rows.length} ประเภทเรียบร้อยแล้ว`,
    };
  }

  async delete(dto: DeletePrevBalanceDto, user: JwtUser) {
    const row = await this.repo.findOne({
      where: { ppbId: dto.ppb_id, del: 0 },
    });
    if (!row) return { flag: false, ms: 'ไม่พบรายการ' };
    assertSameSchool(user, row.scId);
    await this.repo.update({ ppbId: dto.ppb_id }, { del: 1, upBy: dto.up_by });
    return { flag: true, ms: 'ลบรายการสำเร็จ' };
  }

  /** สรุปเงินเหลือจ่ายปีเก่า (ยืนยันแล้ว) แยกตามประเภทเงิน — ใช้รวมเข้าวงเงินใน BudgetService */
  async getSummaryByType(
    scId: number,
    syId: number,
    budgetYear?: string,
  ): Promise<
    Array<{ bg_type_id: number; budget_type: string; carryover_amount: number }>
  > {
    // syId ระบุปีงบไม่ซ้ำต่อโรงเรียนอยู่แล้ว — budgetYear เป็นตัวกรองเสริม (optional)
    const rows = await this.repo.find({
      where: {
        scId,
        syId,
        ...(budgetYear ? { budgetYear } : {}),
        isConfirmed: 1,
        del: 0,
      },
    });
    const byType = new Map<
      number,
      { bg_type_id: number; budget_type: string; carryover_amount: number }
    >();
    for (const r of rows) {
      const prev = byType.get(r.moneyTypeId);
      if (prev) {
        prev.carryover_amount += Number(r.amount) || 0;
      } else {
        byType.set(r.moneyTypeId, {
          bg_type_id: r.moneyTypeId,
          budget_type: r.moneyTypeName ?? '',
          carryover_amount: Number(r.amount) || 0,
        });
      }
    }
    return Array.from(byType.values());
  }

  /**
   * เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ (age_status = 'expired') — ต้องนำส่งคลังเป็นรายได้แผ่นดิน
   * ตรวจจับอัตโนมัติจากเงินเหลือจ่ายปีเก่าที่บันทึกไว้ เทียบกฎ ปีที่มา + 1 < ปีงบปัจจุบัน
   */
  async expiredForTreasury(scId: number, syId: number, budgetYear: string) {
    const rows = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { sourceBudgetYear: 'ASC', moneyTypeId: 'ASC' },
    });
    const data = rows
      .filter(
        (r) => this.ageStatus(r.sourceBudgetYear, budgetYear) === 'expired',
      )
      .map((r) => ({
        ppb_id: r.ppbId,
        money_type_id: r.moneyTypeId,
        money_type_name: r.moneyTypeName,
        source_budget_year: r.sourceBudgetYear,
        usable_until_year: this.usableUntil(r.sourceBudgetYear),
        amount: Number(r.amount) || 0,
      }))
      .filter((r) => r.amount > 0);
    return { data, total: data.reduce((s, r) => s + r.amount, 0) };
  }

  /** ผลรวมเงินเหลือจ่ายปีเก่า (ยืนยันแล้ว) สำหรับบวกเข้าเพดานวงเงิน */
  async getCarryoverTotal(
    scId: number,
    syId: number,
    budgetYear?: string,
  ): Promise<number> {
    const summary = await this.getSummaryByType(scId, syId, budgetYear);
    return summary.reduce((s, t) => s + t.carryover_amount, 0);
  }
}
