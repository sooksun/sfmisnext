import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { WithholdingCertificate } from '../registration-certificate/entities/withholding-certificate.entity';
import { GovRevenueEntry } from '../gov-revenue/entities/gov-revenue-entry.entity';
import { MonthlySubmission } from '../monthly-submission/entities/monthly-submission.entity';
import { BankReconciliation } from '../bank-reconciliation/entities/bank-reconciliation.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';
import { FinancialAssessment } from '../financial-assessment/entities/financial-assessment.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { DepositRegister } from '../deposit-register/entities/deposit-register.entity';
import {
  ComputedAlert,
  addDays,
  atEnd,
  ceYear,
  dayOfThisMonth,
  fiscalRange,
  fiscalYearEnd,
  prevMonthStart,
  thMonth,
  ymd,
  ymKey,
} from './deadline-rules';

const FINANCE = '5,8';
const FINANCE_DIR = '2,5,8';

/**
 * DeadlineEngine — คำนวณรายการเตือนตามปฏิทินการเงินของโรงเรียนหนึ่ง ณ วันที่ today
 * แต่ละกฎผูก smart-resolve (query ข้อมูลจริง) → emit เฉพาะที่ "ยังไม่ทำ"
 */
@Injectable()
export class DeadlineEngineService {
  constructor(
    @InjectRepository(WithholdingCertificate)
    private readonly whtRepo: Repository<WithholdingCertificate>,
    @InjectRepository(GovRevenueEntry)
    private readonly govRepo: Repository<GovRevenueEntry>,
    @InjectRepository(MonthlySubmission)
    private readonly msRepo: Repository<MonthlySubmission>,
    @InjectRepository(BankReconciliation)
    private readonly reconRepo: Repository<BankReconciliation>,
    @InjectRepository(FiscalYearBalance)
    private readonly fybRepo: Repository<FiscalYearBalance>,
    @InjectRepository(ReceiptBook)
    private readonly rbRepo: Repository<ReceiptBook>,
    @InjectRepository(FinancialAssessment)
    private readonly faRepo: Repository<FinancialAssessment>,
    @InjectRepository(LoanAgreement)
    private readonly loanRepo: Repository<LoanAgreement>,
    @InjectRepository(DepositRegister)
    private readonly depRepo: Repository<DepositRegister>,
  ) {}

  async computeForSchool(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const parts = await Promise.all([
      this.whtRemit(scId, budgetYear, today),
      this.interest(scId, budgetYear, today),
      this.govRemit(scId, budgetYear, today),
      this.monthlyReport(scId, budgetYear, today),
      this.fyClose(scId, budgetYear, today),
      this.receiptReport(scId, budgetYear, today),
      this.selfAssess(scId, budgetYear, today),
      this.loanDue(scId, budgetYear, today),
      this.egpDeposit(scId, budgetYear, today),
    ]);
    return parts.flat();
  }

  private inFiscal(budgetYear: string, today: Date): boolean {
    const r = fiscalRange(budgetYear);
    return !!r && today >= r.start && today <= r.end;
  }

  // ── WHT_REMIT: นำส่งภาษีหัก ณ ที่จ่ายเดือนก่อน ก่อนวันที่ 7 ──
  private async whtRemit(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    if (!this.inFiscal(budgetYear, today)) return [];
    const prev = prevMonthStart(today);
    const prevEnd = atEnd(new Date(prev.getFullYear(), prev.getMonth() + 1, 0));
    const certs = await this.whtRepo.find({
      where: {
        scId,
        del: 0,
        cerDate: Between(prev, prevEnd) as unknown as Date,
      },
    });
    if (certs.length === 0) return []; // ไม่มีการหักภาษีเดือนก่อน
    const pending = certs.filter((c) => !c.remitDate);
    if (pending.length === 0) return []; // นำส่งครบแล้ว → ไม่เตือน
    const due = dayOfThisMonth(today, 7);
    const overdue = today > atEnd(due);
    return [
      {
        rule_code: 'WHT_REMIT',
        period: ymKey(prev),
        severity: overdue ? 'error' : 'warning',
        title: `นำส่งภาษีหัก ณ ที่จ่าย เดือน ${thMonth(prev)}`,
        detail: `มีหนังสือรับรองหักภาษีที่ยังไม่บันทึกวันนำส่ง ${pending.length} ฉบับ — กำหนดนำส่งสรรพากรภายในวันที่ 7 ของเดือนนี้`,
        link: '/sfmis/report/certificate',
        due_date: ymd(due),
        assignee_role: FINANCE,
      },
    ];
  }

  // ── INTEREST H1/H2: รับรู้ดอกเบี้ยเงินฝาก 1 ก.ค. / 1 ม.ค. ──
  private async interest(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const ce = ceYear(budgetYear);
    if (!ce) return [];
    const out: ComputedAlert[] = [];
    // งวด: H2 = ม.ค. (ค.ศ. ce), H1 = ก.ค. (ค.ศ. ce-1 เพราะ ก.ค. อยู่ครึ่งหลังของปีงบที่เริ่ม ต.ค. ce-1)
    const windows = [
      { tag: 'H1', monthIdx: 6, ceYearOfMonth: ce - 1, label: '1 กรกฎาคม' },
      { tag: 'H2', monthIdx: 0, ceYearOfMonth: ce, label: '1 มกราคม' },
    ];
    for (const w of windows) {
      const dueDate = new Date(w.ceYearOfMonth, w.monthIdx, 1);
      const winStart = addDays(dueDate, -7);
      const winEnd = addDays(dueDate, 20); // เปิดเตือนถึงกลางเดือน
      if (today < winStart || today > winEnd) continue;
      const mStart = new Date(w.ceYearOfMonth, w.monthIdx, 1);
      const mEnd = new Date(w.ceYearOfMonth, w.monthIdx + 1, 0);
      const got = await this.govRepo.count({
        where: {
          scId,
          del: 0,
          revenueType: 1, // ดอกเบี้ยเงินฝากเงินอุดหนุน
          docDate: Between(ymd(mStart), ymd(mEnd)),
        },
      });
      if (got > 0) continue; // บันทึกรับดอกเบี้ยแล้ว
      out.push({
        rule_code: `INTEREST_${w.tag}`,
        period: `${budgetYear}-${w.tag}`,
        severity: today > atEnd(dueDate) ? 'error' : 'warning',
        title: `รับรู้ดอกเบี้ยเงินฝากธนาคาร งวด ${w.label}`,
        detail: `ถึงกำหนดบันทึกรับเงินรายได้แผ่นดิน (ดอกเบี้ยเงินฝากเงินอุดหนุน) ประจำงวด ${w.label}`,
        link: '/sfmis/financial-report/gov-revenue',
        due_date: ymd(dueDate),
        assignee_role: FINANCE,
      });
    }
    return out;
  }

  // ── GOV_REMIT: เงินรายได้แผ่นดินคงค้างนำส่ง ──
  private async govRemit(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    if (!this.inFiscal(budgetYear, today)) return [];
    const rows = await this.govRepo.find({ where: { scId, budgetYear, del: 0 } });
    if (rows.length === 0) return [];
    const received = sumBy(rows, (r) => (r.entryType === 1 ? r.amount : 0));
    const remitted = sumBy(rows, (r) => (r.entryType === 2 ? r.amount : 0));
    const outstanding = received - remitted;
    if (outstanding <= 0.005) return [];
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return [
      {
        rule_code: 'GOV_REMIT',
        period: ymKey(today),
        severity: outstanding > 10000 ? 'error' : 'warning',
        title: 'เงินรายได้แผ่นดินคงค้างรอนำส่งคลัง',
        detail: `คงค้าง ${outstanding.toLocaleString()} บาท — นำส่งอย่างน้อยเดือนละ 1 ครั้ง (เกิน 10,000 บาท ภายใน 3 วันทำการ)`,
        link: '/sfmis/financial-report/gov-revenue',
        due_date: ymd(monthEnd),
        assignee_role: FINANCE,
      },
    ];
  }

  // ── MONTHLY_REPORT: ส่งรายงานประจำเดือนให้เขต ภายในวันที่ 15 ──
  private async monthlyReport(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    if (!this.inFiscal(budgetYear, today)) return [];
    if (today.getDate() < 10) return []; // เริ่มเตือนวันที่ 10
    const prev = prevMonthStart(today);
    const beYm = `${prev.getFullYear() + 543}-${`${prev.getMonth() + 1}`.padStart(2, '0')}`;
    const done = await this.msRepo
      .createQueryBuilder('m')
      .where('m.sc_id = :scId AND m.del = 0 AND m.status >= 2', { scId })
      .andWhere('m.submit_month = :ym', { ym: beYm })
      .getCount();
    if (done > 0) return [];
    const due = dayOfThisMonth(today, 15);
    return [
      {
        rule_code: 'MONTHLY_REPORT',
        period: ymKey(prev),
        severity: today > atEnd(due) ? 'error' : 'warning',
        title: `ส่งรายงานการเงินประจำเดือน ${thMonth(prev)} ให้เขตพื้นที่ฯ`,
        detail: 'จัดส่งสำเนารายงานเงินคงเหลือ + งบเทียบยอดธนาคาร ภายในวันที่ 15 ของเดือนถัดไป',
        link: '/sfmis/financial-report/monthly-submission',
        due_date: ymd(due),
        assignee_role: FINANCE,
      },
    ];
  }

  // ── FY_CLOSE: ปิดยอดบัญชีปีงบประมาณ ──
  private async fyClose(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const fye = fiscalYearEnd(budgetYear);
    if (!fye) return [];
    const winStart = new Date(fye.getFullYear(), 8, 1); // 1 ก.ย.
    const due = addDays(fye, 30); // ~30 ต.ค.
    if (today < winStart || today > addDays(due, 30)) return [];
    const closed = await this.fybRepo
      .createQueryBuilder('f')
      .where('f.sc_id = :scId AND f.budget_year = :by', { scId, by: budgetYear })
      .andWhere('f.closing_date IS NOT NULL')
      .getCount();
    if (closed > 0) return [];
    return [
      {
        rule_code: 'FY_CLOSE',
        period: `${budgetYear}-FY`,
        severity: today > atEnd(due) ? 'error' : 'warning',
        title: `ปิดยอดบัญชีปีงบประมาณ ${budgetYear}`,
        detail: 'สรุปปิดยอดเงินคงเหลือทุกประเภท ณ สิ้นปีงบประมาณ (30 ก.ย.) เพื่อยกยอดไปปีถัดไป',
        link: '/sfmis/financial-report/fiscal-year-close',
        due_date: ymd(due),
        assignee_role: FINANCE_DIR,
      },
    ];
  }

  // ── RECEIPT_REPORT: รายงานการใช้ใบเสร็จ + เลิกใช้เล่มเก่า ภายใน 31 ต.ค. ──
  private async receiptReport(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const ce = ceYear(budgetYear);
    if (!ce) return [];
    const due = new Date(ce, 9, 31); // 31 ต.ค. (ค.ศ. ce)
    const winStart = new Date(ce, 9, 1);
    if (today < winStart || today > addDays(due, 30)) return [];
    const books = await this.rbRepo.find({ where: { scId, del: 0 } });
    const old = books.filter((b) => String(b.budgetYear) !== budgetYear);
    const leftover = old.filter(
      (b) => b.currentNo <= b.toNo && !b.retiredDate && !b.voidedDate,
    );
    if (old.length === 0 || leftover.length === 0) return [];
    return [
      {
        rule_code: 'RECEIPT_REPORT',
        period: `${budgetYear}-RB`,
        severity: today > atEnd(due) ? 'error' : 'warning',
        title: 'รายงานการใช้ใบเสร็จ + ประทับตราเลิกใช้เล่มปีก่อน',
        detail: `มีเล่มใบเสร็จปีก่อนใช้ไม่หมด ${leftover.length} เล่ม — ประทับตราเลิกใช้และจัดทำรายงานภายใน 31 ต.ค.`,
        link: '/sfmis/financial-report/receipt-book',
        due_date: ymd(due),
        assignee_role: FINANCE,
      },
    ];
  }

  // ── SELF_ASSESS: ประเมินตนเอง แบบ 2544 ส่งเขต ภายใน ก.ค. ──
  private async selfAssess(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const ce = ceYear(budgetYear);
    if (!ce) return [];
    const due = new Date(ce, 6, 31); // 31 ก.ค.
    const winStart = new Date(ce, 6, 1);
    if (today < winStart || today > addDays(due, 30)) return [];
    const sent = await this.faRepo.count({
      where: { scId, budgetYear, del: 0, status: 3 },
    });
    if (sent > 0) return [];
    return [
      {
        rule_code: 'SELF_ASSESS',
        period: `${budgetYear}-SA`,
        severity: today > atEnd(due) ? 'error' : 'warning',
        title: 'ประเมินตนเองด้านการเงิน การบัญชี (แบบ 2544) ส่งเขต',
        detail: 'จัดทำแบบประเมินตนเอง 2544 และจัดส่งเขตพื้นที่ฯ ภายในเดือนกรกฎาคม',
        link: '/sfmis/financial-report/self-assessment',
        due_date: ymd(due),
        assignee_role: FINANCE_DIR,
      },
    ];
  }

  // ── LOAN_DUE: เงินยืมใกล้ครบ/เกินกำหนด (รายสัญญา) ──
  private async loanDue(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const loans = await this.loanRepo.find({
      where: { scId, budgetYear, del: 0, status: 1 }, // OUTSTANDING
    });
    const out: ComputedAlert[] = [];
    for (const l of loans) {
      if (!l.dueDate) continue;
      const due = new Date(l.dueDate as unknown as string);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (daysLeft > 7) continue; // เตือนล่วงหน้า 7 วัน
      const overdue = daysLeft < 0;
      out.push({
        rule_code: 'LOAN_DUE',
        period: `loan-${l.laId}`,
        severity: overdue ? 'error' : 'warning',
        title: overdue
          ? `เงินยืมเกินกำหนดส่งใช้: ${l.laNo ?? l.laId}`
          : `เงินยืมใกล้ครบกำหนดส่งใช้: ${l.laNo ?? l.laId}`,
        detail: `ผู้ยืม ${l.borrowerName ?? '-'} จำนวน ${(l.amount || 0).toLocaleString()} บาท ครบกำหนด ${ymd(due)}${overdue ? ` (เกิน ${-daysLeft} วัน)` : ` (อีก ${daysLeft} วัน)`}`,
        link: '/sfmis/pay-menu/loan-agreement',
        due_date: ymd(due),
        assignee_role: FINANCE_DIR,
      });
    }
    return out;
  }

  // ── EGP_DEPOSIT: เงินประกันสัญญาครบกำหนดคืน (รายรายการ) ──
  private async egpDeposit(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.depRepo.find({ where: { scId, budgetYear, del: 0 } });
    const out: ComputedAlert[] = [];
    for (const d of rows) {
      if (!d.dueDate || d.returnDate) continue;
      const due = new Date(d.dueDate as unknown as string);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (daysLeft > 15) continue;
      out.push({
        rule_code: 'EGP_DEPOSIT',
        period: `dep-${d.drId}`,
        severity: daysLeft < 0 ? 'error' : 'warning',
        title: `เงินประกันสัญญาครบกำหนดคืน: ${d.itemName ?? d.drId}`,
        detail: `${d.depositKind ?? 'เงินประกันสัญญา'} ครบกำหนดคืนผู้มีสิทธิ ${ymd(due)}${daysLeft < 0 ? ` (เกิน ${-daysLeft} วัน)` : ` (อีก ${daysLeft} วัน)`}`,
        link: '/sfmis/financial-report/deposit-register',
        due_date: ymd(due),
        assignee_role: FINANCE,
      });
    }
    return out;
  }
}

function sumBy<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
}
