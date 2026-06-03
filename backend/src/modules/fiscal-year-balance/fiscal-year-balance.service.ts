import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYearBalance } from './entities/fiscal-year-balance.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import {
  FinalizeYearDto,
  SaveBalanceDto,
  SaveBulkBalancesDto,
} from './dto/fiscal-year-balance.dto';

@Injectable()
export class FiscalYearBalanceService {
  constructor(
    @InjectRepository(FiscalYearBalance)
    private readonly fybRepo: Repository<FiscalYearBalance>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    @InjectRepository(OpeningBalance)
    private readonly openingRepo: Repository<OpeningBalance>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepo: Repository<SchoolYear>,
  ) {}

  /** โหลดยอดยกมาของปีที่ต้องการ */
  async loadBalances(scId: number, budgetYear: string) {
    const balances = await this.fybRepo.find({
      where: { scId, budgetYear, del: 0 },
      order: { moneyTypeId: 'ASC' },
    });
    return {
      data: balances.map((b) => ({
        fyb_id: b.fybId,
        sc_id: b.scId,
        budget_year: b.budgetYear,
        money_type_id: b.moneyTypeId,
        money_type_name: b.moneyTypeName,
        cash_balance: b.cashBalance,
        bank_balance: b.bankBalance,
        smp_balance: b.smpBalance,
        total_balance: b.totalBalance,
        closing_date: b.closingDate,
        closed_by: b.closedBy,
        closed_by_name: b.closedByName,
        is_final: b.isFinal === 1,
        note: b.note,
      })),
      count: balances.length,
      is_year_final:
        balances.length > 0 && balances.every((b) => b.isFinal === 1),
    };
  }

  /** บันทึก/อัปเดตยอดของประเภทเงินหนึ่งประเภท */
  async saveBalance(dto: SaveBalanceDto) {
    // snapshot money type name
    let moneyTypeName: string | null = null;
    const bt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.money_type_id },
    });
    if (bt) moneyTypeName = bt.budgetType;

    // snapshot closer name
    let closedByName: string | null = null;
    if (dto.closed_by) {
      const admin = await this.adminRepo.findOne({
        where: { adminId: dto.closed_by },
      });
      if (admin) closedByName = admin.name ?? admin.username ?? null;
    }

    let bal = await this.fybRepo.findOne({
      where: {
        scId: dto.sc_id,
        budgetYear: dto.budget_year,
        moneyTypeId: dto.money_type_id,
        del: 0,
      },
    });

    if (!bal) {
      bal = this.fybRepo.create({
        scId: dto.sc_id,
        budgetYear: dto.budget_year,
        moneyTypeId: dto.money_type_id,
        moneyTypeName,
        del: 0,
      });
    }

    bal.cashBalance = dto.cash_balance ?? 0;
    bal.bankBalance = dto.bank_balance ?? 0;
    bal.smpBalance = dto.smp_balance ?? 0;
    bal.totalBalance = bal.cashBalance + bal.bankBalance + bal.smpBalance;
    bal.closingDate = dto.closing_date ?? null;
    bal.closedBy = dto.closed_by ?? null;
    bal.closedByName = closedByName;
    bal.note = dto.note ?? null;
    bal.upBy = dto.up_by ?? 0;

    await this.fybRepo.save(bal);
    return { flag: true, ms: 'บันทึกยอดยกมาเรียบร้อยแล้ว' };
  }

  /** บันทึกหลายประเภทพร้อมกัน (bulk) */
  async saveBulkBalances(dto: SaveBulkBalancesDto) {
    for (const b of dto.balances) {
      await this.saveBalance({
        sc_id: dto.sc_id,
        budget_year: dto.budget_year,
        money_type_id: b.money_type_id,
        cash_balance: b.cash_balance,
        bank_balance: b.bank_balance,
        smp_balance: b.smp_balance,
        closing_date: dto.closing_date,
        closed_by: dto.closed_by,
        note: dto.note,
        up_by: dto.up_by,
      });
    }
    return {
      flag: true,
      ms: `บันทึกยอดยกมา ${dto.balances.length} ประเภทเรียบร้อยแล้ว`,
    };
  }

  /** ผอ. ยืนยันและล็อกยอดยกมาของปีนั้น */
  async finalizeYear(dto: FinalizeYearDto) {
    const balances = await this.fybRepo.find({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
    });
    if (balances.length === 0)
      return { flag: false, ms: 'ไม่พบข้อมูลยอดยกมา กรุณาบันทึกก่อน' };

    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.signed_by },
    });
    const closedByName = admin?.name ?? admin?.username ?? null;

    for (const b of balances) {
      b.isFinal = 1;
      b.closedBy = dto.signed_by;
      b.closedByName = closedByName;
      b.note = dto.note ?? b.note;
    }
    await this.fybRepo.save(balances);

    // ── อัตโนมัติ: ยกยอดคงเหลือเป็นยอดยกมา (opening_balance) ของปีถัดไป ──────
    const carry = await this.carryForwardToNextYear(dto.sc_id, dto.budget_year);

    return {
      flag: true,
      ms:
        `ปิดปีงบประมาณ ${dto.budget_year} เรียบร้อยแล้ว` +
        (carry.created > 0
          ? ` และยกยอดเป็นยอดยกมาปี ${carry.nextYear} จำนวน ${carry.created} รายการ`
          : carry.skipped
            ? ` (ยังไม่ยกยอด: ${carry.skipped})`
            : ''),
      carry_forward: carry,
    };
  }

  /**
   * ยกยอดคงเหลือสิ้นปี → สร้าง opening_balance ของปีถัดไปอัตโนมัติ
   *  cash_balance→storage 1, bank_balance→storage 2, smp_balance→storage 3
   *  idempotent: ลบ opening อัตโนมัติของปีถัดไป (remark มี [auto-carry]) ก่อนสร้างใหม่
   */
  private async carryForwardToNextYear(
    scId: number,
    budgetYear: string,
  ): Promise<{
    nextYear: string;
    created: number;
    skipped: string | null;
  }> {
    const nextBE = Number(budgetYear) + 1;
    const nextYear = String(nextBE);

    // หา school_year ของปีถัดไป (budget_year = nextBE)
    const nextSy = await this.schoolYearRepo.findOne({
      where: { scId, budgetYear: nextBE, del: 0 },
      order: { syId: 'ASC' },
    });
    if (!nextSy) {
      return {
        nextYear,
        created: 0,
        skipped: `ยังไม่มีปีการศึกษา/ปีงบ ${nextYear} ในระบบ`,
      };
    }

    const balances = await this.fybRepo.find({
      where: { scId, budgetYear, del: 0 },
    });

    const balanceDate = nextSy.budgetDateS
      ? new Date(nextSy.budgetDateS).toISOString().slice(0, 10)
      : `${nextBE - 543}-10-01`;

    // ลบ opening อัตโนมัติเดิมของปีถัดไป (กันซ้ำเมื่อปิดปีหลายครั้ง)
    await this.openingRepo
      .createQueryBuilder()
      .update(OpeningBalance)
      .set({ del: 1 })
      .where('sc_id = :scId', { scId })
      .andWhere('sy_id = :syId', { syId: nextSy.syId })
      .andWhere('del = 0')
      .andWhere("remark LIKE '%[auto-carry]%'")
      .execute();

    let created = 0;
    for (const b of balances) {
      const parts: Array<[number, number]> = [
        [1, Number(b.cashBalance) || 0],
        [2, Number(b.bankBalance) || 0],
        [3, Number(b.smpBalance) || 0],
      ];
      for (const [storageType, amount] of parts) {
        if (amount <= 0) continue;
        await this.openingRepo.save(
          this.openingRepo.create({
            scId,
            syId: nextSy.syId,
            budgetYear: nextYear,
            balanceDate,
            moneyTypeId: b.moneyTypeId,
            moneyTypeName: b.moneyTypeName,
            storageType,
            amount,
            remark: `[auto-carry] ยกยอดจากปี ${budgetYear}`,
            upBy: b.upBy ?? 0,
            del: 0,
          }),
        );
        created++;
      }
    }

    return { nextYear, created, skipped: null };
  }
}
