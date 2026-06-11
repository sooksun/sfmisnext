import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpeningBalance } from './entities/opening-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import {
  AddOpeningBalanceDto,
  UpdateOpeningBalanceDto,
} from './dto/opening-balance.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class OpeningBalanceService {
  constructor(
    @InjectRepository(OpeningBalance)
    private readonly repo: Repository<OpeningBalance>,
    @InjectRepository(FiscalYearBalance)
    private readonly fybRepo: Repository<FiscalYearBalance>,
  ) {}

  /**
   * ยอดยกมาของปี Y มาจากการปิดปี Y-1 — ถ้าปี Y-1 ถูก ผอ. ลงนามปิดแล้ว
   * (is_final=1) ห้ามเพิ่ม/แก้/ลบยอดยกมาของปี Y อีก เพื่อให้ตรงกับที่ลงนาม
   */
  private async assertYearNotLocked(
    scId: number,
    budgetYear: string | null | undefined,
  ) {
    if (!budgetYear || !Number(budgetYear)) return null;
    const prevYear = String(Number(budgetYear) - 1);
    const finalized = await this.fybRepo.count({
      where: { scId, budgetYear: prevYear, isFinal: 1, del: 0 },
    });
    if (finalized > 0) {
      return {
        flag: false,
        ms: `ยอดยกมาปี ${budgetYear} ถูกล็อกแล้ว (ปีงบ ${prevYear} ปิดปีและลงนามแล้ว) — หากต้องแก้ไขให้ติดต่อผู้ดูแลระบบ`,
      };
    }
    return null;
  }

  async loadOpeningBalances(scId: number, syId: number, budgetYear: string) {
    return this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { moneyTypeId: 'ASC', storageType: 'ASC' },
    });
  }

  async addOpeningBalance(dto: AddOpeningBalanceDto) {
    const locked = await this.assertYearNotLocked(dto.sc_id, dto.budget_year);
    if (locked) return locked;

    const entity = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      balanceDate: dto.balance_date,
      moneyTypeId: dto.money_type_id,
      moneyTypeName: dto.money_type_name ?? null,
      storageType: dto.storage_type,
      bankAccountId: dto.bank_account_id ?? null,
      amount: dto.amount,
      remark: dto.remark ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.repo.save(entity);
    return { flag: true, ms: 'บันทึกยอดยกมาสำเร็จ' };
  }

  async updateOpeningBalance(dto: UpdateOpeningBalanceDto, user: JwtUser) {
    const ob = await this.repo.findOne({ where: { obId: dto.ob_id, del: 0 } });
    if (!ob) return { flag: false, ms: 'ไม่พบยอดยกมา' };
    assertSameSchool(user, ob.scId);
    const locked = await this.assertYearNotLocked(ob.scId, ob.budgetYear);
    if (locked) return locked;
    await this.repo.update(
      { obId: dto.ob_id },
      {
        balanceDate: dto.balance_date,
        amount: dto.amount,
        remark: dto.remark ?? null,
        upBy: dto.up_by,
      },
    );
    return { flag: true, ms: 'แก้ไขยอดยกมาสำเร็จ' };
  }

  async deleteOpeningBalance(obId: number, upBy: number, user: JwtUser) {
    const ob = await this.repo.findOne({ where: { obId, del: 0 } });
    if (!ob) return { flag: false, ms: 'ไม่พบยอดยกมา' };
    assertSameSchool(user, ob.scId);
    const locked = await this.assertYearNotLocked(ob.scId, ob.budgetYear);
    if (locked) return locked;
    await this.repo.update({ obId }, { del: 1, upBy });
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  /** สรุปยอดยกมาแยกตามประเภทเงิน สำหรับ daily-balance report */
  async getSummaryByMoneyType(scId: number, budgetYear: string) {
    return this.repo
      .createQueryBuilder('ob')
      .select('ob.moneyTypeId', 'moneyTypeId')
      .addSelect('ob.moneyTypeName', 'moneyTypeName')
      .addSelect('ob.storageType', 'storageType')
      .addSelect('SUM(ob.amount)', 'totalAmount')
      .where('ob.scId = :scId AND ob.budgetYear = :budgetYear AND ob.del = 0', {
        scId,
        budgetYear,
      })
      .groupBy('ob.moneyTypeId')
      .addGroupBy('ob.storageType')
      .getRawMany();
  }
}
