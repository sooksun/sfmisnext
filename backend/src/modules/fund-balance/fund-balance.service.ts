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

  /** ยอดคงเหลือของประเภทเงิน — รวมทุกช่องทาง (อ่านนอก transaction) */
  async available(
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<number> {
    return this.compute(this.ftRepo, this.obRepo, scId, syId, bgTypeId, 'all');
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
      'all',
    );
  }

  /**
   * ยอด "เงินสด" คงเหลือของประเภทเงิน (เฉพาะช่องทางเงินสด/เช็คในมือ)
   *   เงินสด = ยอดยกมา(storage 1/legacy) + รับเงินสด(channel 0/1) − จ่ายเงินสด(channel 0/1)
   * คำนวณให้ตรงกับคอลัมน์ "เงินสด" ใน report-daily-balance — ใช้กันจ่ายจนเงินสดติดลบ
   */
  async availableCash(
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<number> {
    return this.compute(this.ftRepo, this.obRepo, scId, syId, bgTypeId, 'cash');
  }

  /** ยอดเงินสดคงเหลือ (อ่านภายใน transaction) */
  async availableCashInTx(
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
      'cash',
    );
  }

  private async compute(
    ftRepo: Repository<FinancialTransactions>,
    obRepo: Repository<OpeningBalance>,
    scId: number,
    syId: number,
    bgTypeId: number,
    mode: 'all' | 'cash',
  ): Promise<number> {
    const openingQb = obRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount),0)', 's')
      .where('o.sc_id = :scId', { scId })
      .andWhere('o.money_type_id = :mt', { mt: bgTypeId })
      .andWhere('o.del = 0')
      // storage_type 4 = ลูกหนี้ยกมา (เงินที่ยืมออกไปแล้ว) — ไม่นับเป็นยอดที่ใช้ได้
      .andWhere('o.storage_type <> 4')
      .andWhere(syId ? 'o.sy_id = :syId' : '1=1', { syId });
    if (mode === 'cash') {
      // เงินสด = ยอดยกมา storage_type 1 (และ legacy ที่ไม่ใช่ 2=ธนาคาร/3=สพป.)
      openingQb.andWhere('o.storage_type NOT IN (2,3)');
    }
    const opening = await openingQb.getRawOne<{ s: string }>();

    const sumFt = async (type: 1 | -1): Promise<number> => {
      const qb = ftRepo
        .createQueryBuilder('f')
        .select('COALESCE(SUM(f.amount),0)', 's')
        .where('f.sc_id = :scId', { scId })
        .andWhere(syId ? 'f.sy_id = :syId' : '1=1', { syId })
        .andWhere('f.bg_type_id = :mt', { mt: bgTypeId })
        .andWhere('f.type = :type', { type })
        .andWhere('f.del = 0');
      if (mode === 'cash') {
        // เงินสด/เช็คในมือ = money_channel 1 หรือ 0 (legacy ไม่ระบุ)
        qb.andWhere('(f.money_channel = 1 OR f.money_channel = 0)');
      }
      const r = await qb.getRawOne<{ s: string }>();
      return Number(r?.s ?? 0);
    };

    const income = await sumFt(1);
    const expense = await sumFt(-1);

    return Number(opening?.s ?? 0) + income - expense;
  }
}
