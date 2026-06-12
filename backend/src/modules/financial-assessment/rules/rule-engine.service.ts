import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovRevenueEntry } from '../../gov-revenue/entities/gov-revenue-entry.entity';
import { FinancialTransactions } from '../../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../../opening-balance/entities/opening-balance.entity';
import { CrossDomainGuardService } from '../../cross-domain-guard/cross-domain-guard.service';
import { BudgetRequest } from '../../budget-request/entities/budget-request.entity';
import { BankLedgerEntry } from '../../bank-ledger/entities/bank-ledger-entry.entity';
import { SmpDepositEntry } from '../../smp-deposit/entities/smp-deposit-entry.entity';
import { DepositRegister } from '../../deposit-register/entities/deposit-register.entity';
import { CashKeepingCommittee } from '../../cash-committee/entities/cash-keeping-committee.entity';
import { BankReconciliation } from '../../bank-reconciliation/entities/bank-reconciliation.entity';
import { MonthlySubmission } from '../../monthly-submission/entities/monthly-submission.entity';
import { FinancialAuditLog } from '../../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../../loan-agreement/entities/loan-agreement.entity';
import { ReceiptBook } from '../../receipt-book/entities/receipt-book.entity';
import { Project } from '../../project/entities/project.entity';
import { Receipt } from '../../receipt/entities/receipt.entity';
import { WithholdingCertificate } from '../../registration-certificate/entities/withholding-certificate.entity';
import { CashReserveLimit } from '../../report-daily-balance/entities/cash-reserve-limit.entity';
import { CashKeepingRecord } from '../../cash-keeping/entities/cash-keeping-record.entity';
import { RequestWithdraw } from '../../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../../receive/entities/pln-receive.entity';
import { BudgetIncomeTypeSchool } from '../../bank/entities/budget-income-type-school.entity';
import { FiscalYearBalance } from '../../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { FinanceAnnualAttestation } from '../entities/finance-annual-attestation.entity';
import { AssessContext, EvalMap, EvalOutcome } from './rule-engine.types';

const LOAN_OUTSTANDING = 1;
const LOAN_RETURNED = 2;
const AUDIT_DAILY = 1;
const SIGNER_DIRECTOR = 3; // financial_audit_log.signer_role: 1=finance, 2=committee, 3=director
const RW_APPROVED_MIN = 200; // request_withdraw.status: 200=ผอ.อนุมัติ, 202=ออกเช็ค
const MS_PER_DAY = 86400000;

/**
 * Rule Engine — ประเมินข้อ "auto"/"prefill" อัตโนมัติจากข้อมูลโมดูลเดิม (อ่านอย่างเดียว)
 * คืน item_code → { result, detail } ; ข้อที่ตรวจไม่ได้ → 'unknown' (ไม่ override คำตอบคน)
 */
@Injectable()
export class RuleEngineService {
  constructor(
    @InjectRepository(GovRevenueEntry)
    private readonly govRepo: Repository<GovRevenueEntry>,
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
    @InjectRepository(OpeningBalance)
    private readonly openingRepo: Repository<OpeningBalance>,
    @InjectRepository(BudgetRequest)
    private readonly brRepo: Repository<BudgetRequest>,
    @InjectRepository(BankLedgerEntry)
    private readonly bleRepo: Repository<BankLedgerEntry>,
    @InjectRepository(SmpDepositEntry)
    private readonly smpRepo: Repository<SmpDepositEntry>,
    @InjectRepository(DepositRegister)
    private readonly depRepo: Repository<DepositRegister>,
    @InjectRepository(CashKeepingCommittee)
    private readonly ckcRepo: Repository<CashKeepingCommittee>,
    @InjectRepository(BankReconciliation)
    private readonly reconRepo: Repository<BankReconciliation>,
    @InjectRepository(MonthlySubmission)
    private readonly msRepo: Repository<MonthlySubmission>,
    @InjectRepository(FinancialAuditLog)
    private readonly auditRepo: Repository<FinancialAuditLog>,
    @InjectRepository(LoanAgreement)
    private readonly loanRepo: Repository<LoanAgreement>,
    @InjectRepository(ReceiptBook)
    private readonly rbRepo: Repository<ReceiptBook>,
    @InjectRepository(Project)
    private readonly projRepo: Repository<Project>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(WithholdingCertificate)
    private readonly whtRepo: Repository<WithholdingCertificate>,
    @InjectRepository(FinanceAnnualAttestation)
    private readonly attestRepo: Repository<FinanceAnnualAttestation>,
    @InjectRepository(CashReserveLimit)
    private readonly crlRepo: Repository<CashReserveLimit>,
    @InjectRepository(CashKeepingRecord)
    private readonly ckrRepo: Repository<CashKeepingRecord>,
    @InjectRepository(RequestWithdraw)
    private readonly rwRepo: Repository<RequestWithdraw>,
    @InjectRepository(PlnReceive)
    private readonly prRepo: Repository<PlnReceive>,
    @InjectRepository(BudgetIncomeTypeSchool)
    private readonly bitsRepo: Repository<BudgetIncomeTypeSchool>,
    @InjectRepository(FiscalYearBalance)
    private readonly fybRepo: Repository<FiscalYearBalance>,
    private readonly guard: CrossDomainGuardService,
  ) {}

  async evaluate(ctx: AssessContext): Promise<EvalMap> {
    const out: EvalMap = {};
    const set = (code: string, o: EvalOutcome) => (out[code] = o);

    await Promise.all([
      this.evalRegisters(ctx, set),
      this.evalCommitteeAndAudit(ctx, set),
      this.evalReports(ctx, set),
      this.evalLoans(ctx, set),
      this.evalReceiptBook(ctx, set),
      this.evalPlanAndReceipts(ctx, set),
      this.evalCashBalance(ctx, set),
      this.evalWithholding(ctx, set),
      this.evalCashKeeping(ctx, set),
      this.evalReceiveSide(ctx, set),
      this.evalPaySide(ctx, set),
      this.evalYearEnd(ctx, set),
    ]);

    return out;
  }

  // ── ประเด็น 6 การจัดทำบัญชี — มีทะเบียนคุม/เป็นปัจจุบัน ──
  private async evalRegisters(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId, budgetYear } = ctx;

    const govCount = await this.govRepo.count({
      where: { scId, budgetYear, del: 0 },
    });
    set('6.1', existence(govCount, 'ทะเบียนคุมรับ-นำส่งเงินรายได้แผ่นดิน', 'รายการ'));

    const ftCount = await this.ftRepo.count({ where: { scId, syId, del: 0 } });
    set(
      '6.2',
      existence(ftCount, 'ทะเบียนคุมเงินนอกงบประมาณ (รายการเคลื่อนไหว)', 'รายการ'),
    );

    const brCount = await this.brRepo.count({
      where: { scId, budgetYear, del: 0 },
    });
    set('6.4', existence(brCount, 'ทะเบียนคุมหลักฐานขอเบิก', 'รายการ'));

    // 6.3 เงินประกันสัญญา — N/A ถ้าไม่มี
    const depCount = await this.depRepo.count({
      where: { scId, budgetYear, del: 0 },
    });
    set(
      '6.3',
      depCount > 0
        ? yes(`พบทะเบียนคุมเงินฝาก (ประกันสัญญา) ${depCount} รายการ`)
        : na('ไม่มีเงินประกันสัญญาในระบบ'),
    );

    // 6.5 เงินฝากธนาคารกระแสรายวัน — N/A ถ้าไม่มีบัญชีกระแสรายวัน
    const bleCount = await this.bleRepo.count({ where: { scId, syId, del: 0 } });
    set(
      '6.5',
      bleCount > 0
        ? yes(`พบทะเบียนเงินฝากธนาคารกระแสรายวัน ${bleCount} รายการ`)
        : na('ไม่มีรายการเงินฝากธนาคารกระแสรายวันในระบบ'),
    );

    // 6.6 สมุดคู่ฝาก ส่วนราชการผู้เบิก
    const smpCount = await this.smpRepo.count({
      where: { scId, budgetYear, del: 0 },
    });
    set('6.6', existence(smpCount, 'สมุดคู่ฝาก (ส่วนราชการผู้เบิก)', 'รายการ'));
  }

  // ── ประเด็น 3.1 กรรมการเก็บรักษาเงิน + ประเด็น 8.2/2.1 ตรวจสอบประจำวัน ──
  private async evalCommitteeAndAudit(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId } = ctx;

    const keeperCount = await this.ckcRepo.count({
      where: { scId, role: 'keeper', del: 0 },
    });
    set(
      '3.1',
      keeperCount >= 2
        ? yes(`มีคำสั่งกรรมการเก็บรักษาเงิน ${keeperCount} คน`)
        : keeperCount === 1
          ? no('มีกรรมการเก็บรักษาเงินเพียง 1 คน (ระเบียบกำหนดอย่างน้อย 2 คน)')
          : no('ยังไม่มีคำสั่งแต่งตั้งกรรมการเก็บรักษาเงิน'),
    );

    // 8.2 ตรวจสอบรับจ่ายประจำวัน — มี audit log รายวัน
    const dailyAudit = await this.auditRepo.count({
      where: { scId, syId, auditType: AUDIT_DAILY },
    });
    set(
      '8.2',
      dailyAudit > 0
        ? yes(`มีการลงนามตรวจสอบรับจ่ายประจำวัน ${dailyAudit} วัน`)
        : no('ยังไม่มีการลงนามตรวจสอบรับจ่ายประจำวันในระบบ'),
    );

    // 2.1 รายงานเงินคงเหลือประจำวัน + ลงนาม ครบทุกวันที่มีรายการ
    const txDates = await this.ftRepo
      .createQueryBuilder('ft')
      .select('DATE(ft.create_date)', 'd')
      .where('ft.sc_id = :scId AND ft.sy_id = :syId AND ft.del = 0', {
        scId,
        syId,
      })
      .andWhere('ft.create_date IS NOT NULL')
      .groupBy('DATE(ft.create_date)')
      .getRawMany<{ d: string }>();
    const auditDates = await this.auditRepo
      .createQueryBuilder('a')
      .select('a.audit_date', 'd')
      .addSelect('a.signer_role', 'role')
      .where('a.sc_id = :scId AND a.sy_id = :syId AND a.audit_type = :t', {
        scId,
        syId,
        t: AUDIT_DAILY,
      })
      .andWhere('a.audit_date IS NOT NULL')
      .getRawMany<{ d: string; role: number }>();

    if (txDates.length === 0) {
      const u = unknown('ยังไม่มีรายการรับ-จ่ายในระบบ จึงประเมินไม่ได้');
      set('2.1', u);
      set('6.7', u);
    } else {
      const allDays = txDates.map((r) => String(r.d));
      const audited = new Set(auditDates.map((r) => String(r.d)));
      const missing = allDays.filter((d) => !audited.has(d));
      set(
        '2.1',
        missing.length === 0
          ? yes(`มีรายงานเงินคงเหลือ+ลงนามครบทุกวันที่มีรายการ (${txDates.length} วัน)`)
          : no(
              `มีวันที่มีรายการแต่ยังไม่ลงนาม ${missing.length}/${txDates.length} วัน (เช่น ${missing.slice(0, 3).join(', ')})`,
            ),
      );

      // 6.7 ผอ. (signer_role=3) ตรวจสอบรายการเคลื่อนไหวทุกสิ้นวัน
      const directorDays = new Set(
        auditDates
          .filter((r) => Number(r.role) === SIGNER_DIRECTOR)
          .map((r) => String(r.d)),
      );
      const missDir = allDays.filter((d) => !directorDays.has(d));
      set(
        '6.7',
        missDir.length === 0
          ? yes(`ผอ. ลงนามตรวจสอบครบทุกวันที่มีรายการ (${allDays.length} วัน)`)
          : no(
              `วันที่มีรายการแต่ ผอ. ยังไม่ลงนามตรวจสอบ ${missDir.length}/${allDays.length} วัน`,
            ),
      );
    }
  }

  // ── ประเด็น 7 รายงานการเงิน ──
  private async evalReports(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId } = ctx;

    const submitted = await this.msRepo.count({
      where: [
        { scId, syId, del: 0, status: 2 },
        { scId, syId, del: 0, status: 3 },
      ],
    });
    set(
      '7.3',
      submitted > 0
        ? yes(`จัดส่งรายงานประจำเดือนให้เขตแล้ว ${submitted} เดือน`)
        : no('ยังไม่มีการจัดส่งรายงานประจำเดือนให้เขตพื้นที่ฯ'),
    );

    // 7.2 / 7.4 งบเทียบยอดเงินฝากกระแสรายวัน — N/A ถ้าไม่มี
    const reconCount = await this.reconRepo.count({ where: { scId, del: 0 } });
    const reconOutcome: EvalOutcome =
      reconCount > 0
        ? yes(`มีงบเทียบยอดเงินฝากธนาคาร ${reconCount} รายการ`)
        : na('ไม่มีบัญชีกระแสรายวัน/งบเทียบยอดในระบบ');
    set('7.2', reconOutcome);
    set('7.4', reconOutcome);

    // 7.1 รายงานสิ้นเดือนตรงทะเบียนคุม — ยอดคงเหลือทุกประเภทถูกต้อง (ไม่ติดลบ)
    const balances71 = await this.typeBalances(scId, syId);
    if (balances71.length === 0) {
      set('7.1', unknown('ยังไม่มีรายการเคลื่อนไหวให้เทียบยอด'));
    } else {
      const neg = balances71.filter((b) => b.balance < -0.005);
      set(
        '7.1',
        neg.length === 0
          ? yes(`ยอดคงเหลือสิ้นเดือนทุกประเภทถูกต้อง (${balances71.length} ประเภท ไม่ติดลบ)`)
          : no(`ยอดคงเหลือสิ้นเดือนมีประเภทติดลบ ${neg.length} ประเภท — รายงานไม่ตรงทะเบียนคุม`),
      );
    }
  }

  // ── ประเด็น 9 เงินยืม ──
  private async evalLoans(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId, budgetYear } = ctx;
    const loans = await this.loanRepo.find({
      where: { scId, budgetYear, del: 0 },
    });

    if (loans.length === 0) {
      const naAll = na('ไม่มีการยืมเงินในปีงบประมาณนี้');
      ['9.1', '9.2', '9.3', '9.4', '9.5'].forEach((c) => set(c, naAll));
      return;
    }

    // 9.1 (prefill) สัญญามีสาระสำคัญครบ (ผู้ยืม + วัตถุประสงค์ + วันครบกำหนด)
    const incomplete = loans.filter(
      (l) => !l.borrowerName || !l.expenseDetail || !l.dueDate,
    );
    set(
      '9.1',
      incomplete.length === 0
        ? yes(`สัญญายืมเงิน ${loans.length} ฉบับ มีสาระสำคัญครบถ้วน`)
        : no(`มีสัญญายืมเงินข้อมูลไม่ครบ ${incomplete.length} ฉบับ`),
    );

    // 9.3 ไม่ยืมใหม่ขณะรายเก่ายังค้าง — ผู้ยืมรายเดียวมี OUTSTANDING ≥ 2 ฉบับ
    const outstandingByBorrower = new Map<number, number>();
    for (const l of loans) {
      if (l.status === LOAN_OUTSTANDING) {
        outstandingByBorrower.set(
          l.borrowerId,
          (outstandingByBorrower.get(l.borrowerId) ?? 0) + 1,
        );
      }
    }
    const dup = [...outstandingByBorrower.values()].filter((n) => n >= 2).length;
    set(
      '9.3',
      dup === 0
        ? yes('ไม่พบการยืมเงินรายใหม่ขณะที่ยังมีลูกหนี้ค้างชำระ')
        : no(`พบผู้ยืม ${dup} ราย มีสัญญาค้างชำระพร้อมกันมากกว่า 1 ฉบับ`),
    );

    // 9.4 ส่งใช้เงินยืมตามกำหนด — returnedDate ≤ dueDate
    const returned = loans.filter(
      (l) => l.status === LOAN_RETURNED && l.returnedDate && l.dueDate,
    );
    const late = returned.filter(
      (l) => new Date(l.returnedDate!) > new Date(l.dueDate!),
    );
    if (returned.length === 0) {
      set('9.4', unknown('ยังไม่มีการส่งใช้เงินยืมให้ประเมิน'));
    } else {
      set(
        '9.4',
        late.length === 0
          ? yes(`ส่งใช้เงินยืมตรงตามกำหนดครบ ${returned.length} ฉบับ`)
          : no(`มีการส่งใช้เงินยืมเกินกำหนด ${late.length}/${returned.length} ฉบับ`),
      );
    }

    // 9.5 (prefill) ลูกหนี้ค้างเกินกำหนด ต้องมีการเร่งรัด/รายงาน
    const today = new Date();
    const overdue = loans.filter(
      (l) =>
        l.status === LOAN_OUTSTANDING &&
        l.dueDate &&
        new Date(l.dueDate) < today,
    );
    set(
      '9.5',
      overdue.length === 0
        ? yes('ไม่มีลูกหนี้เงินยืมค้างเกินกำหนด')
        : no(
            `มีลูกหนี้เงินยืมค้างเกินกำหนด ${overdue.length} ราย — โปรดยืนยันการเร่งรัด/รายงาน ผอ.`,
          ),
    );
  }

  // ── ประเด็น 10 ใบเสร็จรับเงิน ──
  private async evalReceiptBook(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, budgetYear } = ctx;
    const books = await this.rbRepo.find({ where: { scId, del: 0 } });

    const thisYear = books.filter((b) => String(b.budgetYear) === budgetYear);
    set(
      '10.1',
      thisYear.length > 0
        ? yes(`มีทะเบียนคุมใบเสร็จรับเงิน ${thisYear.length} เล่ม`)
        : no('ยังไม่มีทะเบียนคุมใบเสร็จรับเงินของปีงบประมาณนี้'),
    );

    // 10.3 ไม่ใช้ใบเสร็จข้ามปีงบ — เล่มปีก่อนที่ยังเปิดใช้ (ไม่ปิด/ไม่ยกเลิก)
    if (books.length === 0) {
      set('10.3', unknown('ยังไม่มีเล่มใบเสร็จในระบบ จึงประเมินไม่ได้'));
    } else {
      const stillOpenOld = books.filter(
        (b) =>
          String(b.budgetYear) !== budgetYear &&
          !b.closedDate &&
          !b.voidedDate,
      );
      set(
        '10.3',
        stillOpenOld.length === 0
          ? yes('ไม่พบการใช้ใบเสร็จข้ามปีงบประมาณ')
          : no(`พบเล่มใบเสร็จปีก่อนยังเปิดใช้อยู่ ${stillOpenOld.length} เล่ม`),
      );
    }

    // 10.2 ใบเสร็จที่ยกเลิก แนบต้นฉบับ/ระบุเหตุผลครบ
    const voided = books.filter((b) => b.voidedDate);
    if (voided.length === 0) {
      set('10.2', yes('ไม่มีเล่มใบเสร็จที่ยกเลิก'));
    } else {
      const noReason = voided.filter((b) => !b.voidReason);
      set(
        '10.2',
        noReason.length === 0
          ? yes(`เล่มที่ยกเลิก ${voided.length} เล่ม ระบุเหตุผลครบ`)
          : no(`มีเล่มที่ยกเลิกแต่ไม่ระบุเหตุผล ${noReason.length} เล่ม`),
      );
    }

    // 10.4 เล่มปีก่อนใช้ไม่หมด ต้องประทับตราเลิกใช้ (retired_date)
    const oldBooks = books.filter((b) => String(b.budgetYear) !== budgetYear);
    if (oldBooks.length === 0) {
      set('10.4', na('ไม่มีเล่มใบเสร็จของปีงบประมาณก่อน'));
    } else {
      // เล่มปีก่อนที่ยังมีเลขเหลือ (current_no ≤ to_no) แต่ยังไม่เลิกใช้
      const leftoverNotRetired = oldBooks.filter(
        (b) => b.currentNo <= b.toNo && !b.retiredDate && !b.voidedDate,
      );
      set(
        '10.4',
        leftoverNotRetired.length === 0
          ? yes('เล่มใบเสร็จปีก่อนที่ใช้ไม่หมด ประทับตราเลิกใช้ครบแล้ว')
          : no(
              `มีเล่มปีก่อนใช้ไม่หมดแต่ยังไม่ประทับตราเลิกใช้ ${leftoverNotRetired.length} เล่ม`,
            ),
      );
    }

    // 10.5 รายงานการใช้ใบเสร็จสิ้นปีงบ ภายใน 31 ต.ค. ของปีงบถัดไป
    // เกณฑ์ตรวจ: ทุกเล่มของปีงบนั้นถูกปิด/ยกเลิก/เลิกใช้ ภายในกำหนด (= สำรวจการใช้ครบทั้งปีแล้ว)
    const deadline105 = receiptReportDeadline(budgetYear);
    if (!deadline105) {
      set('10.5', unknown('รูปแบบปีงบประมาณไม่ถูกต้อง'));
    } else if (new Date() < deadline105) {
      set(
        '10.5',
        unknown(
          `ยังไม่ถึงกำหนดรายงานการใช้ใบเสร็จ (ภายใน ${deadline105.toISOString().slice(0, 10)})`,
        ),
      );
    } else if (thisYear.length === 0) {
      set('10.5', unknown('ไม่มีเล่มใบเสร็จของปีงบประมาณนี้ให้รายงาน'));
    } else {
      const openPastDeadline = thisYear.filter(
        (b) => !b.closedDate && !b.voidedDate && !b.retiredDate,
      );
      set(
        '10.5',
        openPastDeadline.length === 0
          ? yes('สำรวจ/ปิดการใช้ใบเสร็จครบทุกเล่มภายในกำหนด 31 ต.ค.')
          : no(
              `พ้นกำหนด 31 ต.ค. แล้วแต่ยังมีเล่มไม่สรุปการใช้ ${openPastDeadline.length} เล่ม`,
            ),
      );
    }
  }

  // ── ประเด็น 1 แผน + ประเด็น 4.4 ใบเสร็จ ──
  private async evalPlanAndReceipts(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId, budgetYear } = ctx;

    // 1.1 (prefill) มีแผนปฏิบัติการ — ดูจากโครงการในปีนั้น
    const projCount = await this.projRepo.count({
      where: { scId, syId, del: 0 },
    });
    set(
      '1.1',
      projCount > 0
        ? yes(`พบโครงการ/กิจกรรมในแผน ${projCount} รายการ`)
        : no('ยังไม่มีโครงการ/กิจกรรมในระบบ'),
    );

    // 1.4 (auto) ความเห็นชอบ กก.สถานศึกษา — จาก finance_annual_attestation
    const attest = await this.attestRepo.findOne({
      where: { scId, budgetYear, del: 0 },
    });
    if (attest?.planCommitteeDate) {
      set(
        '1.4',
        yes(
          `แผนได้รับความเห็นชอบ กก.สถานศึกษา เมื่อ ${attest.planCommitteeDate}` +
            (attest.planCommitteeDocNo
              ? ` (เลขที่ ${attest.planCommitteeDocNo})`
              : ''),
        ),
      );
    } else {
      set(
        '1.4',
        unknown(
          'ยังไม่ได้บันทึกวันที่ กก.สถานศึกษาเห็นชอบแผน — กรอกในส่วนหัวแบบประเมิน หรือยืนยันเอง',
        ),
      );
    }

    // 4.4 (prefill) ใบเสร็จระบุรายละเอียดครบ — มีใบเสร็จที่ออกแล้ว
    const receiptCount = await this.receiptRepo.count({
      where: { scId, syId },
    });
    set(
      '4.4',
      receiptCount > 0
        ? yes(`มีใบเสร็จรับเงินที่ออกในระบบ ${receiptCount} ฉบับ (ข้อมูลครบตามแบบฟอร์ม)`)
        : unknown('ยังไม่มีใบเสร็จรับเงินในระบบ'),
    );

    // 1.3 (prefill) แผนครอบคลุมแหล่งเงินทุกประเภท — เทียบประเภทเงินในโครงการ vs ประเภทเงินของโรงเรียน
    const [projects, schoolTypes] = await Promise.all([
      this.projRepo.find({ where: { scId, syId, del: 0 } }),
      this.bitsRepo.find({ where: { scId, del: 0 } }),
    ]);
    const typeCount = new Set(schoolTypes.map((t) => t.bgTypeId)).size;
    const planTypeCount = new Set(
      projects.map((p) => p.projBudgetType).filter(Boolean),
    ).size;
    if (projects.length === 0) {
      set('1.3', unknown('ยังไม่มีโครงการในแผนให้ตรวจความครอบคลุม'));
    } else if (typeCount === 0) {
      set('1.3', unknown('ยังไม่ตั้งค่าประเภทเงินของโรงเรียน'));
    } else {
      set(
        '1.3',
        planTypeCount >= typeCount
          ? yes(
              `แผนใช้แหล่งเงิน ${planTypeCount} ประเภท ครอบคลุมประเภทเงินของโรงเรียน (${typeCount} ประเภท)`,
            )
          : no(
              `แผนใช้แหล่งเงิน ${planTypeCount}/${typeCount} ประเภท — โปรดตรวจว่าครอบคลุมทุกแหล่งเงินหรือไม่`,
            ),
      );
    }

    // 1.5 (auto) มีทะเบียน/เอกสารควบคุมการใช้จ่ายโครงการ — ระบบบันทึกจ่ายผ่านทะเบียนคุม+ใบขอเบิกเสมอ
    const payCount = await this.ftRepo.count({
      where: { scId, syId, del: 0, type: -1 },
    });
    set(
      '1.5',
      payCount > 0
        ? yes(
            `การใช้จ่ายถูกควบคุมผ่านทะเบียนคุม+เอกสารขอเบิกในระบบ (${payCount} รายการจ่าย)`,
          )
        : unknown('ยังไม่มีรายการจ่ายในระบบ'),
    );

    // 1.6 (prefill) ใช้จ่ายตามแผน — ระบบยังไม่เชื่อมยอดจ่ายรายโครงการ
    set(
      '1.6',
      unknown(
        'ระบบยังไม่เชื่อมยอดจ่ายจริงรายโครงการกับแผน — โปรดเทียบรายงานการใช้จ่ายกับแผนปฏิบัติการแล้วยืนยัน',
      ),
    );
  }

  // ── ประเด็น 2 เทียบยอดเงินคงเหลือ ──
  private async evalCashBalance(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId } = ctx;

    // 2.2 ยอดคงเหลือทะเบียนคุมแต่ละประเภทถูกต้อง — คำนวณยอดจริง (ยอดยกมา + รับ - จ่าย)
    //     ต่อประเภทเงิน แล้วตรวจ "ติดลบ" ซึ่งเป็นข้อผิดพลาดเชิงบัญชี (ทะเบียนคุมห้ามติดลบ)
    const balances = await this.typeBalances(scId, syId);
    if (balances.length === 0) {
      set('2.2', unknown('ยังไม่มีรายการเคลื่อนไหวให้เทียบยอด'));
    } else {
      const neg = balances.filter((b) => b.balance < -0.005);
      const total = balances.reduce((s, b) => s + b.balance, 0);
      set(
        '2.2',
        neg.length === 0
          ? yes(
              `ยอดคงเหลือทุกประเภทถูกต้อง (${balances.length} ประเภท รวม ${total.toLocaleString()} บาท ไม่มีประเภทใดติดลบ)`,
            )
          : no(
              `พบประเภทเงินยอดติดลบ ${neg.length} ประเภท (เช่น ประเภท ${neg[0].typeId} = ${neg[0].balance.toLocaleString()}) — ตรวจการบันทึกรับ-จ่าย`,
            ),
      );
    }

    // 2.4 ยอดเงินฝากธนาคารตรง Bank Statement — จากงบเทียบยอด (is_balanced)
    const recons = await this.reconRepo.find({ where: { scId, del: 0 } });
    if (recons.length === 0) {
      set('2.4', na('ไม่มีบัญชีกระแสรายวัน/งบเทียบยอดในระบบ'));
    } else {
      const unbalanced = recons.filter((r) => !r.isBalanced);
      set(
        '2.4',
        unbalanced.length === 0
          ? yes(`งบเทียบยอดเงินฝากธนาคารตรงกันทุกบัญชี (${recons.length} รายการ)`)
          : no(`มีงบเทียบยอดที่ยังไม่ลงตัว ${unbalanced.length} รายการ`),
      );
    }

    // 2.5 ยอดเงินฝากส่วนราชการผู้เบิก — คำนวณยอดจริง (ฝาก - ถอน) ตรวจติดลบ
    const smpRows = await this.smpRepo.find({ where: { scId, del: 0 } });
    if (smpRows.length === 0) {
      set('2.5', na('ไม่มีรายการเงินฝากส่วนราชการผู้เบิกในระบบ'));
    } else {
      const smpBal = smpRows.reduce(
        (s, r) => s + (r.entryType === 1 ? 1 : -1) * (Number(r.amount) || 0),
        0,
      );
      set(
        '2.5',
        smpBal >= -0.005
          ? yes(`ยอดเงินฝากส่วนราชการผู้เบิกคงเหลือ ${smpBal.toLocaleString()} บาท (ฝาก-ถอนสมดุล)`)
          : no(`ยอดเงินฝากส่วนราชการผู้เบิกติดลบ ${smpBal.toLocaleString()} บาท — ถอนเกินยอดฝาก`),
      );
    }
  }

  /** ยอดคงเหลือต่อประเภทเงิน = ยอดยกมา(opening) + Σ(รับ-จ่าย) ของปีงบ — ใช้ตรวจติดลบ */
  private async typeBalances(
    scId: number,
    syId: number,
  ): Promise<{ typeId: number; balance: number }[]> {
    const [openRows, ftRows] = await Promise.all([
      this.openingRepo
        .createQueryBuilder('o')
        .select('o.money_type_id', 'tid')
        .addSelect('SUM(o.amount)', 'amt')
        .where('o.sc_id = :scId AND o.sy_id = :syId AND o.del = 0', { scId, syId })
        .groupBy('o.money_type_id')
        .getRawMany<{ tid: number; amt: string }>(),
      this.ftRepo
        .createQueryBuilder('ft')
        .select('ft.bg_type_id', 'tid')
        .addSelect('SUM(ft.type * ft.amount)', 'amt') // type = 1 รับ / -1 จ่าย
        .where('ft.sc_id = :scId AND ft.sy_id = :syId AND ft.del = 0', { scId, syId })
        .groupBy('ft.bg_type_id')
        .getRawMany<{ tid: number; amt: string }>(),
    ]);
    const bal = new Map<number, number>();
    for (const r of openRows)
      bal.set(Number(r.tid), (bal.get(Number(r.tid)) ?? 0) + Number(r.amt || 0));
    for (const r of ftRows)
      bal.set(Number(r.tid), (bal.get(Number(r.tid)) ?? 0) + Number(r.amt || 0));
    return [...bal.entries()].map(([typeId, balance]) => ({ typeId, balance }));
  }

  // ── ประเด็น 3.5 นำส่งภาษีหัก ณ ที่จ่าย ──
  private async evalWithholding(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, budgetYear } = ctx;
    const certs = await this.whtRepo.find({
      where: { scId, year: budgetYear, del: 0 },
    });
    if (certs.length === 0) {
      set('3.5', na('ไม่มีการหักภาษี ณ ที่จ่ายในปีงบประมาณนี้'));
      return;
    }
    const withRemit = certs.filter((c) => c.remitDate && c.cerDate);
    if (withRemit.length === 0) {
      set(
        '3.5',
        unknown('ยังไม่ได้บันทึกวันที่นำส่งภาษี — โปรดยืนยันเอง'),
      );
      return;
    }
    // เกณฑ์: ในท้องที่ภายใน 7 วัน / ออนไลน์ภายใน 15 วัน นับจากสิ้นเดือนที่ออกหนังสือ
    const late = withRemit.filter((c) => {
      const monthEnd = endOfMonth(new Date(c.cerDate as unknown as string));
      const limitDays = c.remitChannel === 2 ? 15 : 7;
      const days = Math.floor(
        (new Date(c.remitDate as unknown as string).getTime() -
          monthEnd.getTime()) /
          MS_PER_DAY,
      );
      return days > limitDays;
    });
    set(
      '3.5',
      late.length === 0
        ? yes(`นำส่งภาษีหัก ณ ที่จ่ายตรงตามกำหนดครบ ${withRemit.length} รายการ`)
        : no(`มีการนำส่งภาษีเกินกำหนด ${late.length}/${withRemit.length} รายการ`),
    );
  }

  // ── ประเด็น 3.2/3.3/3.4 การเก็บรักษาเงิน ──
  private async evalCashKeeping(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId, budgetYear } = ctx;

    // 3.2 (prefill) กก.เก็บรักษาเงินปฏิบัติหน้าที่ — มีบันทึกรับเงินเพื่อเก็บรักษา
    const ckrCount = await this.ckrRepo.count({
      where: { scId, syId, del: 0 },
    });
    set(
      '3.2',
      ckrCount > 0
        ? yes(`มีบันทึกการรับเงินเพื่อเก็บรักษา ${ckrCount} ครั้ง`)
        : unknown(
            'ไม่มีบันทึกรับเงินเพื่อเก็บรักษาในระบบ (อาจไม่มีเงินสดค้างคืน) — โปรดยืนยัน',
          ),
    );

    // 3.3 (auto) เก็บรักษาเงินสดไม่เกินวงเงินอำนาจ
    const limit = await this.crlRepo.findOne({ where: { scId } });
    if (!limit) {
      set('3.3', unknown('ยังไม่ตั้งวงเงินเก็บรักษา (เมนูเงินคงเหลือประจำวัน)'));
    } else {
      const cashRows = await this.ftRepo.find({
        where: { scId, syId, del: 0, moneyChannel: 1 },
      });
      const cashBal = cashRows.reduce(
        (s, r) => s + (Number(r.type) || 0) * (Number(r.amount) || 0),
        0,
      );
      set(
        '3.3',
        cashBal <= limit.limitAmount
          ? yes(
              `เงินสดคงเหลือ ${cashBal.toLocaleString()} ≤ วงเงินเก็บรักษา ${limit.limitAmount.toLocaleString()} บาท`,
            )
          : no(
              `เงินสดคงเหลือ ${cashBal.toLocaleString()} เกินวงเงินเก็บรักษา ${limit.limitAmount.toLocaleString()} บาท`,
            ),
      );
    }

    // 3.4 (auto) นำส่งเงินรายได้แผ่นดิน ≥ เดือนละครั้ง / >10,000 ภายใน 3 วันทำการ
    const govRows = await this.govRepo.find({
      where: { scId, budgetYear, del: 0 },
    });
    if (govRows.length === 0) {
      set('3.4', unknown('ยังไม่มีรายการเงินรายได้แผ่นดินในระบบ'));
    } else {
      const received = govRows
        .filter((r) => r.entryType === 1)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const remitted = govRows
        .filter((r) => r.entryType === 2)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const outstanding = received - remitted;
      if (outstanding <= 0.005) {
        set('3.4', yes(`นำส่งเงินรายได้แผ่นดินครบถ้วน (รับ ${received.toLocaleString()} / นำส่ง ${remitted.toLocaleString()} บาท)`));
      } else {
        const lastReceive = govRows
          .filter((r) => r.entryType === 1 && r.docDate)
          .map((r) => new Date(r.docDate as unknown as string).getTime())
          .sort((a, b) => b - a)[0];
        const daysHeld = lastReceive
          ? Math.floor((Date.now() - lastReceive) / MS_PER_DAY)
          : 0;
        const limitDays = outstanding > 10000 ? 5 : 31; // >10k: 3 วันทำการ (≈5 วันปฏิทิน) | ปกติ: รอบเดือน
        set(
          '3.4',
          daysHeld <= limitDays
            ? yes(
                `มีเงินรายได้แผ่นดินรอนำส่ง ${outstanding.toLocaleString()} บาท ยังอยู่ในกรอบเวลานำส่ง (${daysHeld} วัน)`,
              )
            : no(
                `เงินรายได้แผ่นดินค้างนำส่ง ${outstanding.toLocaleString()} บาท นาน ${daysHeld} วัน เกินกำหนด`,
              ),
        );
      }
    }
  }

  // ── ประเด็น 4.3/4.5 การรับเงิน-ใบเสร็จ ──
  private async evalReceiveSide(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId } = ctx;

    // 4.3 (auto) ออกใบเสร็จทุกครั้งที่รับเงิน — ทุก pln_receive ที่ยืนยันแล้วต้องมีใบเสร็จผูก
    const [receives, receipts] = await Promise.all([
      this.prRepo.find({ where: { scId, syId, del: 0, cfTransaction: 1 } }),
      this.receiptRepo.find({ where: { scId, syId } }),
    ]);
    if (receives.length === 0) {
      set('4.3', unknown('ยังไม่มีรายการรับเงินที่ยืนยันแล้วในระบบ'));
    } else {
      // receipt.pr_id เป็น varchar / pln_receive.pr_id เป็น int — normalize เป็น string
      const receiptedPr = new Set(
        receipts.filter((r) => r.status !== '0').map((r) => String(r.prId)),
      );
      const missing = receives.filter(
        (rv) => !receiptedPr.has(String(rv.prId)),
      );
      set(
        '4.3',
        missing.length === 0
          ? yes(`รายการรับเงิน ${receives.length} รายการ มีใบเสร็จครบทุกรายการ`)
          : no(
              `มีรายการรับเงินที่ยังไม่ออกใบเสร็จ ${missing.length}/${receives.length} รายการ`,
            ),
      );
    }

    // 4.5 (auto) ยอดรวมใบเสร็จต่อวันตรงสรุปท้ายสำเนา — ระบบสรุปจากฐานข้อมูลเดียวกัน
    set(
      '4.5',
      receipts.length > 0
        ? yes('ระบบสรุปยอดรวมใบเสร็จรายวันจากฐานข้อมูลเดียวกับทะเบียนรับเงิน ยอดตรงกันอัตโนมัติ')
        : unknown('ยังไม่มีใบเสร็จรับเงินในระบบ'),
    );
  }

  // ── ประเด็น 5.1/5.2/5.3 การจ่ายเงิน ──
  private async evalPaySide(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId, budgetYear } = ctx;

    // 5.1 จ่ายตรงวัตถุประสงค์/ระเบียบ — สแกนความขัดแย้งข้ามงานจริงย้อนหลัง (cross-domain-guard)
    try {
      const alerts = await this.guard.inspect(scId, budgetYear);
      const violations = alerts.filter((a) => a.severity === 'error');
      set(
        '5.1',
        violations.length === 0
          ? yes('สแกนแล้วไม่พบการจ่ายเกินวงเงิน/ผิดวัตถุประสงค์ข้ามงาน (cross-domain-guard)')
          : no(
              `พบความขัดแย้งข้ามงาน ${violations.length} รายการ (เช่น ${violations[0].title}) — ตรวจการจ่ายให้ตรงวัตถุประสงค์`,
            ),
      );
    } catch {
      set('5.1', unknown('ตรวจความขัดแย้งข้ามงานไม่ได้ในขณะนี้ — โปรดยืนยันเอง'));
    }

    const rws = await this.rwRepo.find({ where: { scId, syId, del: 0 } });
    const paid = rws.filter((r) => r.status >= RW_APPROVED_MIN);

    // 5.2 (auto) ทุกการจ่ายได้รับอนุมัติ ผอ. — รายการจ่าย (FT) ต้องผูกใบขอเบิกที่ status ≥ 200
    const payRows = await this.ftRepo.find({
      where: { scId, syId, del: 0, type: -1 },
    });
    if (payRows.length === 0) {
      set('5.2', unknown('ยังไม่มีรายการจ่ายในระบบ'));
    } else {
      const statusByRw = new Map(rws.map((r) => [r.rwId, r.status]));
      const linked = payRows.filter((p) => p.rwId > 0);
      const notApproved = linked.filter(
        (p) => (statusByRw.get(p.rwId) ?? 0) < RW_APPROVED_MIN,
      );
      const unlinked = payRows.length - linked.length;
      if (notApproved.length > 0) {
        set(
          '5.2',
          no(
            `มีรายการจ่ายที่ใบขอเบิกยังไม่ผ่านอนุมัติ ผอ. ${notApproved.length}/${linked.length} รายการ`,
          ),
        );
      } else {
        set(
          '5.2',
          yes(
            `รายการจ่ายที่ผูกใบขอเบิก ${linked.length} รายการ ผ่านอนุมัติ ผอ. ครบ` +
              (unlinked > 0 ? ` (อีก ${unlinked} รายการเป็นรายการพิเศษ เช่น เงินยืม/ฝากถอน)` : ''),
          ),
        );
      }
    }

    // 5.3 (prefill) หลักฐานการจ่ายครบ — ใบขอเบิกที่จ่ายแล้วมีเลข/รูปใบสำคัญคู่จ่าย
    if (paid.length === 0) {
      set('5.3', unknown('ยังไม่มีใบขอเบิกที่จ่ายแล้วในระบบ'));
    } else {
      const noEvidence = paid.filter(
        (r) => !r.receiptNumber && !r.receiptPicture,
      );
      set(
        '5.3',
        noEvidence.length === 0
          ? yes(`ใบขอเบิกที่จ่ายแล้ว ${paid.length} รายการ มีใบสำคัญคู่จ่ายครบ`)
          : no(
              `มีใบขอเบิกจ่ายแล้วแต่ยังไม่แนบใบสำคัญคู่จ่าย ${noEvidence.length}/${paid.length} รายการ`,
            ),
      );
    }
  }

  // ── ประเด็น 7.5 รายงานรับ-จ่ายเงินรายได้สถานศึกษาประจำปี (ภายใน 30 วันหลังสิ้นปีงบ) ──
  private async evalYearEnd(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, budgetYear } = ctx;
    const deadline = yearEndReportDeadline(budgetYear);
    if (!deadline) {
      set('7.5', unknown('รูปแบบปีงบประมาณไม่ถูกต้อง'));
      return;
    }
    if (new Date() < fiscalYearEnd(budgetYear)!) {
      set('7.5', unknown('ยังไม่สิ้นปีงบประมาณ — ประเมินเมื่อปิดปีแล้ว'));
      return;
    }
    const closes = await this.fybRepo.find({ where: { scId, budgetYear } });
    if (closes.length === 0) {
      set(
        '7.5',
        new Date() <= deadline
          ? unknown(
              `ยังไม่ปิดปีงบประมาณในระบบ (กำหนดส่งรายงานภายใน ${deadline.toISOString().slice(0, 10)})`,
            )
          : no('พ้นกำหนด 30 วันหลังสิ้นปีงบแล้ว ยังไม่ปิดปี/จัดทำรายงานประจำปี'),
      );
      return;
    }
    const lateClose = closes.filter(
      (c) => c.closingDate && new Date(c.closingDate as unknown as string) > deadline,
    );
    set(
      '7.5',
      lateClose.length === 0
        ? yes('ปิดปี/จัดทำรายงานรับ-จ่ายประจำปีภายใน 30 วันหลังสิ้นปีงบประมาณ')
        : no(`ปิดปี/รายงานประจำปีช้ากว่ากำหนด 30 วัน (${lateClose.length} รายการ)`),
    );
  }
}

// ── helpers ──
function yes(detail: string): EvalOutcome {
  return { result: 'yes', detail };
}
function no(detail: string): EvalOutcome {
  return { result: 'no', detail };
}
function na(detail: string): EvalOutcome {
  return { result: 'na', detail };
}
function unknown(detail: string): EvalOutcome {
  return { result: 'unknown', detail };
}
function existence(count: number, name: string, unit: string): EvalOutcome {
  return count > 0
    ? yes(`มี${name} ${count} ${unit}`)
    : no(`ยังไม่มี${name}ในระบบ`);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

/** สิ้นปีงบประมาณ พ.ศ. B = 30 ก.ย. ของ ค.ศ. B-543 (เช่น ปีงบ 2569 → 30 ก.ย. 2026) */
function fiscalYearEnd(budgetYearBE: string): Date | null {
  const be = parseInt(budgetYearBE, 10);
  if (!be || be < 2400) return null;
  return new Date(be - 543, 8, 30, 23, 59, 59);
}

/** กำหนดส่งรายงานรับ-จ่ายประจำปี = 30 วันหลังสิ้นปีงบ (≈ 30 ต.ค.) */
function yearEndReportDeadline(budgetYearBE: string): Date | null {
  const end = fiscalYearEnd(budgetYearBE);
  return end ? new Date(end.getTime() + 30 * MS_PER_DAY) : null;
}

/** กำหนดรายงานการใช้ใบเสร็จ = 31 ต.ค. ของปีงบถัดไป (ค.ศ. B-543) */
function receiptReportDeadline(budgetYearBE: string): Date | null {
  const be = parseInt(budgetYearBE, 10);
  if (!be || be < 2400) return null;
  return new Date(be - 543, 9, 31, 23, 59, 59);
}
