import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

/**
 * คำนวณ "ยอดคงเหลือของประเภทเงิน" ให้ตรงกับที่ทะเบียนคุมเงินแสดง
 *   ยอดคงเหลือ = ยอดยกมา(ปีนี้) + รับ − จ่าย
 *   (opening_balance กรอง sc+sy+ประเภทเงิน ; financial_transactions กรอง sc+ประเภทเงิน
 *    — ตรงกับ register-money-type.loadRegisterControlMoneyType)
 *
 * ใช้เป็น guard กันจ่าย/ยืม "เกินยอดคงเหลือ" ตามระบบควบคุมเงินหน่วยงานย่อย 2544
 * (เงินแต่ละประเภทห้ามติดลบ)
 */
@Injectable()
export class FundBalanceService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
    @InjectRepository(OpeningBalance)
    private readonly obRepo: Repository<OpeningBalance>,
  ) {}

  /** ยอดคงเหลือของประเภทเงิน (อ่านนอก transaction) */
  async available(
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<number> {
    return this.compute(this.ftRepo, this.obRepo, scId, syId, bgTypeId);
  }

  /** ยอดคงเหลือ (อ่านภายใน transaction — เห็น row ที่ lock อยู่) */
  async availableInTx(
    em: EntityManager,
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<number> {
    return this.compute(
      em.getRepository(FinancialTransactions),
      em.getRepository(OpeningBalance),
      scId,
      syId,
      bgTypeId,
    );
  }

  private async compute(
    ftRepo: Repository<FinancialTransactions>,
    obRepo: Repository<OpeningBalance>,
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<number> {
    const opening = await obRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount),0)', 's')
      .where('o.sc_id = :scId', { scId })
      .andWhere('o.money_type_id = :mt', { mt: bgTypeId })
      .andWhere('o.del = 0')
      .andWhere(syId ? 'o.sy_id = :syId' : '1=1', { syId })
      .getRawOne<{ s: string }>();

    const income = await ftRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.amount),0)', 's')
      .where('f.sc_id = :scId', { scId })
      .andWhere(syId ? 'f.sy_id = :syId' : '1=1', { syId })
      .andWhere('f.bg_type_id = :mt', { mt: bgTypeId })
      .andWhere('f.type = 1')
      .andWhere('f.del = 0')
      .getRawOne<{ s: string }>();

    const expense = await ftRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.amount),0)', 's')
      .where('f.sc_id = :scId', { scId })
      .andWhere(syId ? 'f.sy_id = :syId' : '1=1', { syId })
      .andWhere('f.bg_type_id = :mt', { mt: bgTypeId })
      .andWhere('f.type = -1')
      .andWhere('f.del = 0')
      .getRawOne<{ s: string }>();

    return (
      Number(opening?.s ?? 0) +
      Number(income?.s ?? 0) -
      Number(expense?.s ?? 0)
    );
  }
}
