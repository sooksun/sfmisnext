import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { School } from '../school/entities/school.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { TbEstimateAcadyear } from '../budget/entities/tb-estimate-acadyear.entity';
import { GovRevenueService } from '../gov-revenue/gov-revenue.service';
import { RegisterMoneyTypeService } from '../register-money-type/register-money-type.service';
import { LoanAgreementService } from '../loan-agreement/loan-agreement.service';
import { ReportDailyBalanceService } from '../report-daily-balance/report-daily-balance.service';
import { CashKeepingService } from '../cash-keeping/cash-keeping.service';

export interface DashboardAlert {
  category: 'interest' | 'tax' | 'loan' | 'cash';
  level: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  link: string;
}

const TH_MONTH_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** "YYYY-MM" (ค.ศ.) → "ก.พ. 2569" (พ.ศ.) — ใช้กับเดือนที่ค้างนำส่ง */
function thMonth(ym?: string | null): string {
  if (!ym) return '-';
  const [y, m] = String(ym).split('-').map((s) => parseInt(s, 10));
  if (!y || !m || m < 1 || m > 12) return String(ym);
  return `${TH_MONTH_ABBR[m - 1]} ${y + 543}`;
}

/** "YYYY-MM-DD" (ค.ศ.) → "6 มี.ค. 2569" (พ.ศ.) — แปลงเฉพาะตอนแสดงผล */
function thDate(ymd?: string | null): string {
  if (!ymd) return '-';
  const datePart = String(ymd).slice(0, 10);
  const [y, m, d] = datePart.split('-').map((s) => parseInt(s, 10));
  if (!y || !m || !d || m < 1 || m > 12) return String(ymd);
  return `${d} ${TH_MONTH_ABBR[m - 1]} ${y + 543}`;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(FinancialTransactions)
    private readonly ftRepository: Repository<FinancialTransactions>,
    @InjectRepository(BudgetIncomeType)
    private readonly bgTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(TbEstimateAcadyear)
    private readonly estimateRepository: Repository<TbEstimateAcadyear>,
    private readonly govRevenueService: GovRevenueService,
    private readonly registerMoneyTypeService: RegisterMoneyTypeService,
    private readonly loanAgreementService: LoanAgreementService,
    private readonly reportDailyBalanceService: ReportDailyBalanceService,
    private readonly cashKeepingService: CashKeepingService,
  ) {}

  /**
   * รวมแจ้งเตือนทางการเงินทั้งหมดสำหรับแสดงบนแดชบอร์ด
   *  - ดอกเบี้ยรายได้แผ่นดิน (รอบ 30 มิ.ย./30 ธ.ค.) + ค้างนำส่ง
   *  - นำส่งภาษีหัก ณ ที่จ่าย (ก่อนวันที่ 7 เดือนถัดไป)
   *  - เงินยืมใกล้/เลยกำหนดคืน
   *  - เงินสดคงเหลือเกินวงเงินสำรอง
   */
  async loadAlerts(scId: number, syId: number, budgetYear: string) {
    const [interest, tax, loans, cash, cashDeposit] = await Promise.all([
      this.govRevenueService
        .interestReminder(scId, syId, budgetYear)
        .catch(() => null),
      this.registerMoneyTypeService
        .whtRemitReminder(scId, syId, budgetYear)
        .catch(() => null),
      this.loanAgreementService
        .dueReminder(scId, syId, budgetYear)
        .catch(() => null),
      this.reportDailyBalanceService.loadCashLimitCheck(scId).catch(() => null),
      this.cashKeepingService.depositReminder(scId, syId).catch(() => null),
    ]);

    const alerts: DashboardAlert[] = [];
    const baht = (n: number) => Number(n).toLocaleString('th-TH');

    // ดอกเบี้ย/รายได้แผ่นดิน
    interest?.alerts?.forEach((a) =>
      alerts.push({
        category: 'interest',
        level: a.level,
        title: 'ดอกเบี้ยเงินฝาก / รายได้แผ่นดิน',
        message: a.message,
        link: '/sfmis/financial-report/gov-revenue',
      }),
    );

    // นำส่งภาษีหัก ณ ที่จ่าย
    const taxRows = (tax?.data ?? []) as Array<{
      status: string;
      month: string;
      outstanding: number;
      deadline: string;
    }>;
    taxRows
      .filter((r) => r.status === 'overdue' || r.status === 'due_soon')
      .forEach((r) =>
        alerts.push({
          category: 'tax',
          level: r.status === 'overdue' ? 'urgent' : 'warning',
          title: 'นำส่งภาษีหัก ณ ที่จ่าย',
          message: `เดือน ${thMonth(r.month)} ค้างนำส่ง ${baht(r.outstanding)} บาท (กำหนด ${thDate(r.deadline)})`,
          link: '/sfmis/financial-report/gov-revenue',
        }),
      );

    // เงินยืมค้างชำระ
    loans?.data?.forEach((r) =>
      alerts.push({
        category: 'loan',
        level: r.flag === 'overdue' ? 'urgent' : 'warning',
        title: 'เงินยืมค้างชำระ',
        message: `บย.${r.la_no} ${r.borrower_name ?? ''} ${baht(r.amount)} บาท (กำหนดคืน ${thDate(r.due_date)})`,
        link: '/sfmis/pay-menu/loan-agreement',
      }),
    );

    // เงินสดเกินวงเงินสำรอง
    if (cash?.exceeded) {
      alerts.push({
        category: 'cash',
        level: 'warning',
        title: 'เงินสดเกินวงเงินสำรองจ่าย',
        message: `เงินสดคงเหลือ ${baht(cash.cash_balance)} บาท เกินวงเงิน ${baht(cash.limit_amount)} บาท ควรนำฝากธนาคาร`,
        link: '/sfmis/financial-report/daily-balance',
      });
    }

    // นำเงินสดฝากธนาคารตามระเบียบ 2562 (ครบ/ใกล้ครบกำหนด)
    if (cashDeposit?.overdue && cashDeposit.overdue > 0) {
      alerts.push({
        category: 'cash',
        level: 'urgent',
        title: 'เลยกำหนดนำเงินสดฝากธนาคาร',
        message: `มีเงินสดเก็บรักษา ${cashDeposit.overdue} รายการ รวม ${baht(cashDeposit.total_overdue)} บาท เลยกำหนดนำฝากตามระเบียบ — ต้องนำฝากโดยด่วน`,
        link: '/sfmis/financial-report/unified-register',
      });
    }
    const dueSoonCount =
      (cashDeposit?.count ?? 0) - (cashDeposit?.overdue ?? 0);
    if (dueSoonCount > 0) {
      alerts.push({
        category: 'cash',
        level: 'warning',
        title: 'ใกล้กำหนดนำเงินสดฝากธนาคาร',
        message: `มีเงินสดเก็บรักษา ${dueSoonCount} รายการที่ใกล้ครบกำหนดนำฝาก (เกิน 10,000 บาท→วันทำการถัดไป, ไม่เกิน→ภายใน 3 วันทำการ)`,
        link: '/sfmis/financial-report/unified-register',
      });
    }

    const order = { urgent: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => order[a.level] - order[b.level]);

    return {
      alerts,
      total: alerts.length,
      urgent: alerts.filter((a) => a.level === 'urgent').length,
      warning: alerts.filter((a) => a.level === 'warning').length,
    };
  }

  // ─── Pie chart: สัดส่วนรายรับตามประเภทเงิน ──────────────────────────────

  async loadChartBudgetTypePie(scId: number, year?: number) {
    const rows = await this.ftRepository
      .createQueryBuilder('ft')
      .select('ft.bg_type_id', 'bgTypeId')
      .addSelect('SUM(ft.amount)', 'total')
      .where('ft.sc_id = :scId AND ft.type = 1 AND ft.del = :del', {
        scId,
        del: '0',
      })
      .andWhere(year ? 'YEAR(ft.create_date) = :year' : '1=1', { year })
      .groupBy('ft.bg_type_id')
      .orderBy('total', 'DESC')
      .getRawMany<{ bgTypeId: number; total: string }>();

    if (rows.length === 0) return { data: [], labels: [] };

    const bgTypeIds = rows.map((r) => r.bgTypeId).filter(Boolean);
    const types =
      bgTypeIds.length > 0
        ? await this.bgTypeRepository.find({
            where: { bgTypeId: In(bgTypeIds), del: 0 },
          })
        : [];
    const typeMap = new Map(types.map((t) => [t.bgTypeId, t.budgetType]));

    return {
      data: rows.map((r) => Math.round(Number(r.total) * 100) / 100),
      labels: rows.map(
        (r) => typeMap.get(r.bgTypeId) ?? `ประเภท ${r.bgTypeId}`,
      ),
    };
  }

  // ─── Bar chart: รายรับ vs รายจ่ายตามประเภทเงิน ───────────────────────────

  async loadChartBudgetTypeBar(scId: number, year?: number) {
    const rows = await this.ftRepository
      .createQueryBuilder('ft')
      .select('ft.bg_type_id', 'bgTypeId')
      .addSelect(
        'SUM(CASE WHEN ft.type = 1  THEN ft.amount ELSE 0 END)',
        'income',
      )
      .addSelect(
        'SUM(CASE WHEN ft.type = -1 THEN ft.amount ELSE 0 END)',
        'expense',
      )
      .where('ft.sc_id = :scId AND ft.del = :del', { scId, del: '0' })
      .andWhere(year ? 'YEAR(ft.create_date) = :year' : '1=1', { year })
      .groupBy('ft.bg_type_id')
      .orderBy('income', 'DESC')
      .getRawMany<{ bgTypeId: number; income: string; expense: string }>();

    if (rows.length === 0) return { data: [], labels: [] };

    const bgTypeIds = rows.map((r) => r.bgTypeId).filter(Boolean);
    const types =
      bgTypeIds.length > 0
        ? await this.bgTypeRepository.find({
            where: { bgTypeId: In(bgTypeIds), del: 0 },
          })
        : [];
    const typeMap = new Map(types.map((t) => [t.bgTypeId, t.budgetType]));

    return {
      labels: rows.map(
        (r) => typeMap.get(r.bgTypeId) ?? `ประเภท ${r.bgTypeId}`,
      ),
      data: rows.map((r) => ({
        income: Math.round(Number(r.income) * 100) / 100,
        expense: Math.round(Number(r.expense) * 100) / 100,
      })),
    };
  }

  // ─── Budget prediction: เปรียบยอดประมาณ vs จริง ──────────────────────────

  async predictBudget(scId: number, year: string) {
    // ยอดประมาณการจาก tb_estimate_acadyear
    const estimate = await this.estimateRepository
      .createQueryBuilder('ea')
      .select('SUM(ea.ea_budget)', 'predicted')
      .addSelect('SUM(ea.real_budget)', 'realBudget')
      .where('ea.sc_id = :scId AND ea.budget_year = :year AND ea.del = 0', {
        scId,
        year,
      })
      .getRawOne<{ predicted: string; realBudget: string }>();

    // ปีงบประมาณไทย: เริ่ม 1 ต.ค. ปีก่อน สิ้นสุด 30 ก.ย. ปีถัดไป (เทียบ CE)
    // budget_year เป็น พ.ศ. เช่น 2568 → CE end = 2025, CE start = 2024
    const budgetYearNum = Number(year);
    const ceEnd = budgetYearNum - 543;
    const ceStart = ceEnd - 1;
    const fiscalStart = `${ceStart}-10-01`;
    const fiscalEnd = `${ceEnd}-09-30`;

    // ยอดรับจริงจาก financial_transactions ในช่วงปีงบประมาณ
    const actual = await this.ftRepository
      .createQueryBuilder('ft')
      .select('SUM(ft.amount)', 'total')
      .where('ft.sc_id = :scId AND ft.type = 1 AND ft.del = :del', {
        scId,
        del: '0',
      })
      .andWhere(
        'ft.create_date >= :fiscalStart AND ft.create_date <= :fiscalEnd',
        {
          fiscalStart,
          fiscalEnd,
        },
      )
      .getRawOne<{ total: string }>();

    const predicted = Math.round(Number(estimate?.predicted ?? 0) * 100) / 100;
    const actualAmt = Math.round(Number(actual?.total ?? 0) * 100) / 100;
    const difference = Math.round((actualAmt - predicted) * 100) / 100;

    return {
      predicted,
      actual: actualAmt,
      difference,
      real_budget: Math.round(Number(estimate?.realBudget ?? 0) * 100) / 100,
    };
  }

  // ─── Dashboard summary ────────────────────────────────────────────────────

  async loadDashboard(scId: number) {
    const currentYear = await this.schoolYearRepository.findOne({
      where: { scId, del: 0 },
      order: { syId: 'DESC' },
    });

    // รายรับ / รายจ่ายจาก financial_transactions
    const totals = await this.ftRepository
      .createQueryBuilder('ft')
      .select('SUM(CASE WHEN ft.type = 1  THEN ft.amount ELSE 0 END)', 'income')
      .addSelect(
        'SUM(CASE WHEN ft.type = -1 THEN ft.amount ELSE 0 END)',
        'expense',
      )
      .where('ft.sc_id = :scId AND ft.del = :del', { scId, del: '0' })
      .getRawOne<{ income: string; expense: string }>();

    // ประมาณการงบประมาณปีปัจจุบัน
    const estimateTotal = currentYear
      ? await this.estimateRepository
          .createQueryBuilder('ea')
          .select('SUM(ea.real_budget)', 'total')
          .where('ea.sc_id = :scId AND ea.sy_id = :syId AND ea.del = 0', {
            scId,
            syId: currentYear.syId,
          })
          .getRawOne<{ total: string }>()
      : null;

    const budgetReceived = Math.round(Number(totals?.income ?? 0) * 100) / 100;
    const disbursement = Math.round(Number(totals?.expense ?? 0) * 100) / 100;
    const budgetAnnual =
      Math.round(Number(estimateTotal?.total ?? 0) * 100) / 100;
    const remaining = Math.round((budgetReceived - disbursement) * 100) / 100;

    return {
      budgetReceived,
      budgetAnnual,
      disbursement,
      remaining,
      currentYear: currentYear
        ? {
            sy_id: currentYear.syId,
            sy_year: currentYear.syYear,
            budget_year: currentYear.budgetYear,
          }
        : null,
    };
  }

  // ─── Rounds (ปีการศึกษา/งวดที่) ──────────────────────────────────────────

  async getRound(scId: number) {
    const years = await this.schoolYearRepository.find({
      where: { scId, del: 0 },
      order: { syId: 'DESC' },
      take: 10,
    });

    return {
      rounds: years.map((y) => ({
        sy_id: y.syId,
        sy_year: y.syYear,
        semester: y.semester,
        sy_date_s: y.syDateS,
        sy_date_e: y.syDateE,
        budget_year: y.budgetYear,
      })),
    };
  }
}
