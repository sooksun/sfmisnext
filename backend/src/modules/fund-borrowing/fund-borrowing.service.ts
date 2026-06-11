import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FundBorrowing } from './entities/fund-borrowing.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

/**
 * ประเภทเงินที่ "ห้าม" นำไปให้ยืมข้ามประเภท (ตามระเบียบ)
 * เช่น ภาษีหัก ณ ที่จ่าย, เงินประกันสัญญา, เงินรายได้แผ่นดิน — เป็นเงินผ่าน/ฝาก ไม่ใช่เงินใช้สอย
 */
const RESTRICTED_SOURCE_PATTERNS = [
  'ภาษี',
  'ประกัน',
  'ค้ำประกัน',
  'รายได้แผ่นดิน',
  'นำส่ง',
];

@Injectable()
export class FundBorrowingService {
  constructor(
    @InjectRepository(FundBorrowing)
    private readonly fbRepo: Repository<FundBorrowing>,
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
    @InjectRepository(OpeningBalance)
    private readonly obRepo: Repository<OpeningBalance>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    private readonly dataSource: DataSource,
  ) {}

  async loadBorrowings(scId: number, syId: number, budgetYear: string) {
    void budgetYear; // กรองด้วย sy_id เป็นหลัก (unique ต่อปีงบ)
    const rows = await this.fbRepo.find({
      where: { scId, syId, del: 0 },
      order: { fbId: 'DESC' },
    });
    const today = new Date().toISOString().substring(0, 10);
    return {
      data: rows.map((r) => ({
        fb_id: r.fbId,
        from_money_type_id: r.fromMoneyTypeId,
        from_money_type_name: r.fromMoneyTypeName,
        to_money_type_id: r.toMoneyTypeId,
        to_money_type_name: r.toMoneyTypeName,
        amount: r.amount,
        borrow_date: r.borrowDate,
        repay_date: r.repayDate,
        purpose: r.purpose,
        status: r.status,
        is_outstanding: r.status === 1,
        note: r.note,
        create_date: r.createDate,
      })),
      count: rows.length,
      total_outstanding: rows
        .filter((r) => r.status === 1)
        .reduce((s, r) => s + Number(r.amount), 0),
      _today: today,
    };
  }

  /** ยอดคงเหลือของประเภทเงิน = ยอดยกมา + รับ − จ่าย (กรองด้วย sy_id) */
  private async computeAvailable(
    scId: number,
    syId: number,
    moneyTypeId: number,
  ): Promise<number> {
    const opening = await this.obRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount),0)', 'sum')
      .where('o.sc_id = :scId', { scId })
      .andWhere('o.sy_id = :syId', { syId })
      .andWhere('o.money_type_id = :mt', { mt: moneyTypeId })
      .andWhere('o.del = 0')
      .getRawOne<{ sum: string }>();

    const income = await this.ftRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.amount),0)', 'sum')
      .where('f.sc_id = :scId', { scId })
      .andWhere('f.sy_id = :syId', { syId })
      .andWhere('f.bg_type_id = :mt', { mt: moneyTypeId })
      .andWhere('f.type = 1')
      .andWhere('f.del = 0')
      .getRawOne<{ sum: string }>();

    const expense = await this.ftRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.amount),0)', 'sum')
      .where('f.sc_id = :scId', { scId })
      .andWhere('f.sy_id = :syId', { syId })
      .andWhere('f.bg_type_id = :mt', { mt: moneyTypeId })
      .andWhere('f.type = -1')
      .andWhere('f.del = 0')
      .getRawOne<{ sum: string }>();

    return (
      Number(opening?.sum ?? 0) +
      Number(income?.sum ?? 0) -
      Number(expense?.sum ?? 0)
    );
  }

  async addBorrowing(dto: {
    sc_id: number;
    sy_id: number;
    budget_year: string;
    from_money_type_id: number;
    to_money_type_id: number;
    amount: number;
    borrow_date: string;
    purpose?: string;
    note?: string;
    up_by?: number;
  }) {
    const amount = Number(dto.amount ?? 0);
    if (amount <= 0) throw new BadRequestException('จำนวนเงินยืมต้องมากกว่า 0');
    if (dto.from_money_type_id === dto.to_money_type_id)
      throw new BadRequestException('ประเภทเงินต้นทางและปลายทางต้องต่างกัน');

    const fromBt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.from_money_type_id },
    });
    const toBt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.to_money_type_id },
    });
    const fromName = fromBt?.budgetType ?? '';
    const toName = toBt?.budgetType ?? '';

    // (ก) ประเภทเงินต้นทางต้องไม่ใช่เงินผ่าน/ฝาก (ภาษี/ประกัน/รายได้แผ่นดิน)
    if (RESTRICTED_SOURCE_PATTERNS.some((p) => fromName.includes(p))) {
      throw new BadRequestException(
        `ไม่อนุญาตให้ยืมจาก "${fromName}" — เป็นเงินผ่าน/เงินฝากที่ต้องนำส่ง ไม่ใช่เงินใช้สอย`,
      );
    }

    // (ข) ยอดคงเหลือต้นทางต้องเพียงพอ
    const available = await this.computeAvailable(
      dto.sc_id,
      dto.sy_id,
      dto.from_money_type_id,
    );
    if (amount > available) {
      throw new BadRequestException(
        `ยอดคงเหลือ "${fromName}" ${available.toLocaleString('th-TH')} บาท ไม่พอให้ยืม ${amount.toLocaleString('th-TH')} บาท`,
      );
    }

    // สร้างรายการ + FT คู่ (โอนออกต้นทาง / โอนเข้าปลายทาง) ใน transaction
    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const fbRepo = em.getRepository(FundBorrowing);

      const ftOut = await ftRepo.save(
        ftRepo.create({
          type: -1,
          bgTypeId: dto.from_money_type_id,
          amount,
          scId: dto.sc_id,
          syId: dto.sy_id,
          moneyChannel: 2,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: dto.borrow_date ? new Date(dto.borrow_date) : new Date(),
        }),
      );
      const ftIn = await ftRepo.save(
        ftRepo.create({
          type: 1,
          bgTypeId: dto.to_money_type_id,
          amount,
          scId: dto.sc_id,
          syId: dto.sy_id,
          moneyChannel: 2,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: dto.borrow_date ? new Date(dto.borrow_date) : new Date(),
        }),
      );

      const fb = await fbRepo.save(
        fbRepo.create({
          scId: dto.sc_id,
          syId: dto.sy_id,
          budgetYear: dto.budget_year ?? null,
          fromMoneyTypeId: dto.from_money_type_id,
          fromMoneyTypeName: fromName || null,
          toMoneyTypeId: dto.to_money_type_id,
          toMoneyTypeName: toName || null,
          amount,
          borrowDate: dto.borrow_date ?? null,
          purpose: dto.purpose ?? null,
          status: 1,
          ftOutId: ftOut.ftId,
          ftInId: ftIn.ftId,
          note: dto.note ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
        }),
      );

      return {
        flag: true,
        ms: `บันทึกการยืมเงินข้ามประเภท (${fromName} → ${toName}) ${amount.toLocaleString('th-TH')} บาท เรียบร้อยแล้ว`,
        fb_id: fb.fbId,
      };
    });
  }

  /** คืนเงินยืมข้ามประเภท → สร้าง FT คู่ย้อนกลับ (คืนเข้าต้นทาง / โอนออกปลายทาง) */
  async repayBorrowing(
    dto: {
      fb_id: number;
      repay_date: string;
      note?: string;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const fb = await this.fbRepo.findOne({
      where: { fbId: dto.fb_id, del: 0 },
    });
    if (!fb) return { flag: false, ms: 'ไม่พบรายการยืมเงิน' };
    if (user && fb.scId != null) assertSameSchool(user, fb.scId);
    if (fb.status !== 1) return { flag: false, ms: 'รายการนี้คืน/ยกเลิกแล้ว' };

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const fbRepo = em.getRepository(FundBorrowing);
      const amount = Number(fb.amount);
      const when = dto.repay_date ? new Date(dto.repay_date) : new Date();

      // คืนเข้าต้นทาง (type=+1) / ตัดออกจากปลายทาง (type=-1)
      await ftRepo.save(
        ftRepo.create({
          type: 1,
          bgTypeId: fb.fromMoneyTypeId,
          amount,
          scId: fb.scId,
          syId: fb.syId,
          moneyChannel: 2,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: when,
        }),
      );
      await ftRepo.save(
        ftRepo.create({
          type: -1,
          bgTypeId: fb.toMoneyTypeId,
          amount,
          scId: fb.scId,
          syId: fb.syId,
          moneyChannel: 2,
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: when,
        }),
      );

      fb.status = 2;
      fb.repayDate = dto.repay_date ?? null;
      if (dto.note) fb.note = dto.note;
      fb.upBy = dto.up_by ?? 0;
      await fbRepo.save(fb);

      return { flag: true, ms: 'บันทึกการคืนเงินยืมข้ามประเภทเรียบร้อยแล้ว' };
    });
  }

  /** ยกเลิกการยืม (ยังไม่คืน) → ลบ FT คู่ที่สร้างไว้ */
  async cancelBorrowing(fbId: number, upBy: number, user?: JwtUser) {
    const fb = await this.fbRepo.findOne({ where: { fbId, del: 0 } });
    if (!fb) return { flag: false, ms: 'ไม่พบรายการยืมเงิน' };
    if (user && fb.scId != null) assertSameSchool(user, fb.scId);
    if (fb.status === 2)
      return { flag: false, ms: 'รายการที่คืนแล้วยกเลิกไม่ได้' };

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const fbRepo = em.getRepository(FundBorrowing);
      if (fb.ftOutId) await ftRepo.update({ ftId: fb.ftOutId }, { del: 1 });
      if (fb.ftInId) await ftRepo.update({ ftId: fb.ftInId }, { del: 1 });
      fb.status = 3;
      fb.upBy = upBy;
      await fbRepo.save(fb);
      return { flag: true, ms: 'ยกเลิกการยืมเงินข้ามประเภทเรียบร้อยแล้ว' };
    });
  }

  /** จำนวนรายการยืมข้ามประเภทที่ยังค้างคืน (ใช้ guard ปิดปีงบ) */
  async countOutstanding(scId: number, syId: number): Promise<number> {
    return this.fbRepo.count({ where: { scId, syId, status: 1, del: 0 } });
  }
}
