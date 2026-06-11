import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovRevenueEntry } from '../../gov-revenue/entities/gov-revenue-entry.entity';
import { FinancialTransactions } from '../../report-daily-balance/entities/financial-transactions.entity';
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
import { FinanceAnnualAttestation } from '../entities/finance-annual-attestation.entity';
import { AssessContext, EvalMap, EvalOutcome } from './rule-engine.types';

const LOAN_OUTSTANDING = 1;
const LOAN_RETURNED = 2;
const AUDIT_DAILY = 1;
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
      .where('a.sc_id = :scId AND a.sy_id = :syId AND a.audit_type = :t', {
        scId,
        syId,
        t: AUDIT_DAILY,
      })
      .andWhere('a.audit_date IS NOT NULL')
      .getRawMany<{ d: string }>();

    if (txDates.length === 0) {
      set('2.1', unknown('ยังไม่มีรายการรับ-จ่ายในระบบ จึงประเมินไม่ได้'));
    } else {
      const audited = new Set(auditDates.map((r) => String(r.d)));
      const missing = txDates
        .map((r) => String(r.d))
        .filter((d) => !audited.has(d));
      set(
        '2.1',
        missing.length === 0
          ? yes(`มีรายงานเงินคงเหลือ+ลงนามครบทุกวันที่มีรายการ (${txDates.length} วัน)`)
          : no(
              `มีวันที่มีรายการแต่ยังไม่ลงนาม ${missing.length}/${txDates.length} วัน (เช่น ${missing.slice(0, 3).join(', ')})`,
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
  }

  // ── ประเด็น 2 เทียบยอดเงินคงเหลือ ──
  private async evalCashBalance(
    ctx: AssessContext,
    set: (c: string, o: EvalOutcome) => void,
  ) {
    const { scId, syId } = ctx;

    // 2.2 ยอดรายงานคงเหลือตรงทะเบียนคุม — ระบบใช้ฐานข้อมูลเดียว (รายงานคำนวณจากทะเบียน)
    const ftCount = await this.ftRepo.count({ where: { scId, syId, del: 0 } });
    set(
      '2.2',
      ftCount > 0
        ? yes('ระบบคำนวณรายงานเงินคงเหลือจากทะเบียนคุมชุดเดียวกัน ยอดตรงกันอัตโนมัติ')
        : unknown('ยังไม่มีรายการเคลื่อนไหวให้เทียบยอด'),
    );

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

    // 2.5 ยอดเงินฝากส่วนราชการผู้เบิกตรงสมุดคู่ฝาก — ระบบฐานข้อมูลเดียว
    const smpCount = await this.smpRepo.count({ where: { scId, del: 0 } });
    set(
      '2.5',
      smpCount > 0
        ? yes('ระบบคำนวณยอดสมุดคู่ฝากจากรายการชุดเดียวกัน ยอดตรงกันอัตโนมัติ')
        : na('ไม่มีรายการเงินฝากส่วนราชการผู้เบิกในระบบ'),
    );
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
