import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { CashReserveLimit } from '../report-daily-balance/entities/cash-reserve-limit.entity';
import { ComputedAlert, ymd } from './deadline-rules';

const AUDIT_DAILY = 1;

/**
 * ตรวจการบันทึก/ปิดยอดประจำวัน (เชิงรุก) — คืน ComputedAlert (source=daily_check)
 *  - UNCLOSED_DAYS: มีวันที่มีรายการแต่ยังไม่ลงนามตรวจสอบรับ-จ่าย/ปิดยอด
 *  - CASH_OVER_LIMIT: เงินสดคงเหลือเกินวงเงินเก็บรักษา
 */
@Injectable()
export class DailyCheckService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
    @InjectRepository(FinancialAuditLog)
    private readonly auditRepo: Repository<FinancialAuditLog>,
    @InjectRepository(CashReserveLimit)
    private readonly crlRepo: Repository<CashReserveLimit>,
  ) {}

  async computeForSchool(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const [unclosed, cash] = await Promise.all([
      this.unclosedDays(scId, budgetYear, today),
      this.cashOverLimit(scId, budgetYear),
    ]);
    return [...unclosed, ...cash];
  }

  // ── UNCLOSED_DAYS ──
  private async unclosedDays(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const byNum = Number(budgetYear);
    const txDays = await this.ftRepo
      .createQueryBuilder('ft')
      .select('DATE(ft.create_date)', 'd')
      .addSelect('ft.sy_id', 'syid')
      .where('ft.sc_id = :scId AND ft.budget_year = :by AND ft.del = 0', {
        scId,
        by: byNum,
      })
      .andWhere('ft.create_date IS NOT NULL')
      .groupBy('DATE(ft.create_date)')
      .addGroupBy('ft.sy_id')
      .getRawMany<{ d: string; syid: number }>();
    if (txDays.length === 0) return [];

    const syIds = [...new Set(txDays.map((r) => Number(r.syid)))];
    const audited = await this.auditRepo
      .createQueryBuilder('a')
      .select('a.audit_date', 'd')
      .where('a.sc_id = :scId AND a.audit_type = :t', { scId, t: AUDIT_DAILY })
      .andWhere('a.sy_id IN (:...syIds)', { syIds })
      .andWhere('a.audit_date IS NOT NULL')
      .getRawMany<{ d: string }>();
    const auditedSet = new Set(audited.map((r) => String(r.d)));

    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
      23,
      59,
      59,
    );
    // ปิดยอดวันนี้ยังไม่ครบไม่นับ — ดูเฉพาะถึงเมื่อวาน
    const unclosed = txDays
      .map((r) => String(r.d))
      .filter((d) => !auditedSet.has(d) && new Date(d) <= yesterday)
      .sort();
    if (unclosed.length === 0) return [];

    const oldest = new Date(unclosed[0]);
    const daysOld = Math.floor((today.getTime() - oldest.getTime()) / 86400000);
    const severe = daysOld > 3;
    return [
      {
        rule_code: 'UNCLOSED_DAYS',
        period: budgetYear,
        severity: severe ? 'error' : 'warning',
        title: `มีวันที่ยังไม่ปิดยอด/ลงนามตรวจสอบ ${unclosed.length} วัน`,
        detail: `วันที่มีรายการรับ-จ่ายแต่ยังไม่ลงนามตรวจสอบประจำวัน ${unclosed.length} วัน (เก่าสุด ${unclosed[0]} ค้าง ${daysOld} วัน) — จัดทำรายงานเงินคงเหลือและลงนามให้ครบ`,
        link: '/sfmis/report/daily-balance',
        due_date: ymd(today),
        assignee_role: severe ? '2,5,8' : '5,8',
      },
    ];
  }

  // ── CASH_OVER_LIMIT ──
  private async cashOverLimit(
    scId: number,
    budgetYear: string,
  ): Promise<ComputedAlert[]> {
    const limit = await this.crlRepo.findOne({ where: { scId } });
    if (!limit) return [];
    const rows = await this.ftRepo.find({
      where: { scId, budgetYear: Number(budgetYear), del: 0, moneyChannel: 1 },
    });
    if (rows.length === 0) return [];
    const cash = rows.reduce(
      (s, r) => s + (Number(r.type) || 0) * (Number(r.amount) || 0),
      0,
    );
    if (cash <= limit.limitAmount) return [];
    return [
      {
        rule_code: 'CASH_OVER_LIMIT',
        period: budgetYear,
        severity: 'warning',
        title: 'เงินสดคงเหลือเกินวงเงินเก็บรักษา',
        detail: `เงินสดคงเหลือ ${cash.toLocaleString()} บาท เกินวงเงินเก็บรักษา ${limit.limitAmount.toLocaleString()} บาท — นำฝากธนาคาร/ส่งคลังส่วนเกิน`,
        link: '/sfmis/financial-report/daily-balance',
        due_date: '',
        assignee_role: '5,8',
      },
    ];
  }
}
