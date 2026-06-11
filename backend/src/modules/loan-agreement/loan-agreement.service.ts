import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LoanAgreement } from './entities/loan-agreement.entity';
import { LoanReturnEvidence } from './entities/loan-return-evidence.entity';
import { AddLoanAgreementDto } from './dto/add-loan-agreement.dto';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

const DUE_DAYS: Record<number, number> = { 1: 15, 2: 30, 3: 30, 4: 30 };
const CATEGORY_NAMES: Record<number, string> = {
  1: 'ค่าเดินทาง',
  2: 'โครงการ',
  3: 'กิจกรรม',
  4: 'อื่นๆ',
};

/**
 * สถานะสัญญายืมเงิน (workflow ตามสัญญายืมเงิน ตัวอย่างที่ 34)
 *   PENDING_VERIFY → PENDING_APPROVE → PENDING_DISBURSE → OUTSTANDING → RETURNED
 */
const STATUS = {
  PENDING_VERIFY: 10, // รอตรวจสอบ (ยังไม่ตัดยอดเงิน)
  PENDING_APPROVE: 11, // รออนุมัติ
  PENDING_DISBURSE: 12, // รอรับเงิน (อนุมัติแล้ว)
  OUTSTANDING: 1, // ค้างชำระ (รับเงินแล้ว ตัดยอดประเภทเงิน)
  RETURNED: 2, // คืนแล้ว
  CANCELLED: 3, // ยกเลิก
} as const;

const STATUS_NAMES: Record<number, string> = {
  10: 'รอตรวจสอบ',
  11: 'รออนุมัติ',
  12: 'รอรับเงิน',
  1: 'ค้างชำระ',
  2: 'คืนแล้ว',
  3: 'ยกเลิก',
};

// สถานะที่ถือว่า "สัญญายังเปิดอยู่" (กันยืมซ้ำ G15)
const OPEN_STATUSES = [
  STATUS.PENDING_VERIFY,
  STATUS.PENDING_APPROVE,
  STATUS.PENDING_DISBURSE,
  STATUS.OUTSTANDING,
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}

@Injectable()
export class LoanAgreementService {
  constructor(
    @InjectRepository(LoanAgreement)
    private readonly laRepo: Repository<LoanAgreement>,
    @InjectRepository(LoanReturnEvidence)
    private readonly lreRepo: Repository<LoanReturnEvidence>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    @InjectRepository(FinancialTransactions)
    private readonly ftRepo: Repository<FinancialTransactions>,
    private readonly docCounter: DocCounterService,
    private readonly dataSource: DataSource,
    private readonly fundBalance: FundBalanceService,
    private readonly regulatoryConfig: RegulatoryConfigService,
  ) {}

  /** กำหนดส่งใช้ (วัน) — ใช้ due_days ถ้าระบุ มิฉะนั้นใช้ค่าตามประเภทการยืม */
  private resolveDueDays(loan: {
    dueDays?: number | null;
    loanCategory: number;
  }): number {
    if (loan.dueDays && loan.dueDays > 0) return loan.dueDays;
    return DUE_DAYS[loan.loanCategory] ?? 30;
  }

  /** snapshot ชื่อ admin (ใช้กับผู้ตรวจสอบ/ผู้อนุมัติ) */
  private async adminName(adminId?: number | null): Promise<string | null> {
    if (!adminId) return null;
    const a = await this.adminRepo.findOne({ where: { adminId } });
    return a ? (a.name ?? a.username ?? null) : null;
  }

  async loadLoanAgreements(scId: number, syId: number, budgetYear: string) {
    // กรองด้วย sy_id เป็นหลัก (unique ต่อปีงบ) — เลี่ยงปัญหา budget_year เก็บเป็น
    // พ.ศ./ค.ศ. ไม่ตรงกัน (เหมือน dueReminder) ; ป้องกันหน้า 3.4 ว่างทั้งที่มีข้อมูล
    void budgetYear;
    const loans = await this.laRepo.find({
      where: { scId, syId, del: 0 },
      order: { laSeq: 'ASC' },
    });

    const today = new Date().toISOString().substring(0, 10);

    return {
      data: loans.map((l) => {
        const isOverdue =
          l.status === STATUS.OUTSTANDING &&
          l.dueDate != null &&
          l.dueDate < today;
        return {
          la_id: l.laId,
          la_no: l.laNo,
          la_seq: l.laSeq,
          borrower_id: l.borrowerId,
          borrower_name: l.borrowerName,
          borrower_position: l.borrowerPosition,
          affiliation: l.affiliation,
          province: l.province,
          money_type_id: l.moneyTypeId,
          money_type_name: l.moneyTypeName,
          loan_category: l.loanCategory,
          loan_category_name: CATEGORY_NAMES[l.loanCategory] ?? '',
          purpose: l.purpose,
          expense_detail: l.expenseDetail,
          amount: l.amount,
          due_days: l.dueDays,
          borrow_date: l.borrowDate,
          due_date: l.dueDate,
          // workflow อนุมัติ
          verify_by: l.verifyBy,
          verify_name: l.verifyName,
          verify_date: l.verifyDate,
          approve_by: l.approveBy,
          approve_name: l.approveName,
          approve_date: l.approveDate,
          approve_amount: l.approveAmount,
          receipt_date: l.receiptDate,
          // การส่งใช้
          returned_date: l.returnedDate,
          return_cash: l.returnCash,
          return_voucher_amount: l.returnVoucherAmount,
          return_total: (l.returnCash ?? 0) + (l.returnVoucherAmount ?? 0),
          status: l.status,
          status_name: STATUS_NAMES[l.status] ?? '',
          is_overdue: isOverdue,
          note: l.note,
          rw_id: l.rwId,
          create_date: l.createDate,
        };
      }),
      count: loans.length,
    };
  }

  /**
   * เตือนเงินยืมใกล้/เลยกำหนดคืน (เฉพาะสัญญาที่รับเงินแล้ว = ค้างชำระ)
   *  - overdue: เลยกำหนดแล้ว (due_date < วันนี้)
   *  - due_soon: ใกล้กำหนด (อีก <= withinDays วัน)
   */
  async dueReminder(
    scId: number,
    syId: number,
    budgetYear: string,
    withinDays = 7,
  ) {
    // กรองด้วย sy_id เป็นหลัก (unique ต่อปีงบ) เลี่ยงปัญหา budget_year BE/CE
    void budgetYear;
    const loans = await this.laRepo.find({
      where: { scId, syId, status: STATUS.OUTSTANDING, del: 0 },
      order: { dueDate: 'ASC' },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MS = 24 * 60 * 60 * 1000;

    const items = loans
      .map((l) => {
        const due = l.dueDate ? new Date(l.dueDate) : null;
        if (due) due.setHours(0, 0, 0, 0);
        const daysToDue = due
          ? Math.round((due.getTime() - today.getTime()) / MS)
          : null;
        let flag: 'overdue' | 'due_soon' | 'ok' = 'ok';
        if (daysToDue != null) {
          if (daysToDue < 0) flag = 'overdue';
          else if (daysToDue <= withinDays) flag = 'due_soon';
        }
        return {
          la_id: l.laId,
          la_no: l.laNo,
          borrower_name: l.borrowerName,
          amount: l.amount,
          borrow_date: l.borrowDate,
          due_date: l.dueDate,
          days_to_due: daysToDue,
          flag,
        };
      })
      .filter((x) => x.flag !== 'ok');

    return {
      data: items,
      count: items.length,
      overdue: items.filter((x) => x.flag === 'overdue').length,
      due_soon: items.filter((x) => x.flag === 'due_soon').length,
    };
  }

  async addLoanAgreement(dto: AddLoanAgreementDto) {
    // G15: block ยืมใหม่ถ้าผู้ยืมคนเดิมยังมีสัญญาที่เปิดอยู่ (รอตรวจสอบ/อนุมัติ/รับเงิน/ค้างชำระ)
    const openLoan = await this.laRepo.findOne({
      where: OPEN_STATUSES.map((st) => ({
        scId: dto.sc_id,
        syId: dto.sy_id,
        budgetYear: dto.budget_year,
        borrowerId: dto.borrower_id,
        status: st,
        del: 0,
      })),
    });
    if (openLoan) {
      return {
        flag: false,
        ms: `ไม่สามารถยืมใหม่ได้ — ${openLoan.borrowerName ?? 'ผู้ยืม'} ยังมีสัญญายืมเงิน ${openLoan.laNo} (ยอด ${openLoan.amount?.toLocaleString('th-TH')} บาท, ${STATUS_NAMES[openLoan.status] ?? ''}) ที่ยังไม่ปิด กรุณาล้างรายการเก่าก่อน`,
      };
    }

    // pre-check: ห้ามตั้งเรื่องยืมเกินยอดคงเหลือของประเภทเงิน (ตรวจซ้ำอีกครั้งตอนรับเงิน)
    const blockOverspend = await this.regulatoryConfig.getThreshold(
      dto.sc_id,
      'finance.block_overspend',
    );
    if (blockOverspend >= 1) {
      const available = await this.fundBalance.available(
        dto.sc_id,
        dto.sy_id,
        dto.money_type_id,
      );
      if (Number(dto.amount) - available > 0.005) {
        return {
          flag: false,
          ms: `ยืมไม่ได้ — ยอดคงเหลือประเภทเงินนี้ ${available.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ไม่พอให้ยืม ${Number(dto.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        };
      }
    }

    // ออกเลขที่เอกสารอัตโนมัติ บย. (atomic ผ่าน doc-counter)
    const issued = await this.docCounter.issue(
      dto.sc_id,
      dto.budget_year,
      'BY',
    );
    const laSeq = issued.seq;
    const laNo = issued.formatted; // เช่น บย.5/2569

    // snapshot borrower — ใช้ค่าจากฟอร์มก่อน (ตามสัญญา) ถ้าไม่ระบุค่อย fallback admin
    let borrowerName: string | null = null;
    let borrowerPosition: string | null = dto.borrower_position ?? null;
    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.borrower_id },
    });
    if (admin) {
      borrowerName = admin.name ?? admin.username ?? null;
      if (!borrowerPosition) {
        borrowerPosition =
          admin.position != null ? String(admin.position) : null;
      }
    }

    // snapshot money type name
    let moneyTypeName: string | null = null;
    const bt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.money_type_id },
    });
    if (bt) moneyTypeName = bt.budgetType;

    // สร้างสัญญาในสถานะ "รอตรวจสอบ" — ยังไม่ตัดยอดเงิน (ตัดตอนรับเงินจริง)
    const loan = await this.laRepo.save(
      this.laRepo.create({
        scId: dto.sc_id,
        syId: dto.sy_id,
        budgetYear: dto.budget_year,
        laSeq,
        laNo,
        borrowerId: dto.borrower_id,
        borrowerName,
        borrowerPosition,
        affiliation: dto.affiliation ?? null,
        province: dto.province ?? null,
        moneyTypeId: dto.money_type_id,
        moneyTypeName,
        purpose: dto.purpose ?? null,
        expenseDetail: dto.expense_detail ?? null,
        amount: dto.amount,
        borrowDate: dto.borrow_date,
        loanCategory: dto.loan_category,
        dueDays: dto.due_days ?? 0,
        dueDate: null, // คำนวณตอนรับเงิน
        status: STATUS.PENDING_VERIFY,
        rwId: dto.rw_id ?? null,
        note: dto.note ?? null,
        upBy: dto.up_by ?? 0,
        del: 0,
      }),
    );
    void loan;

    return {
      flag: true,
      ms: `สร้างสัญญายืมเงิน ${laNo} เรียบร้อยแล้ว (รอตรวจสอบ)`,
    };
  }

  /** ขั้นที่ 1 — ผู้ตรวจสอบ (เจ้าหน้าที่การเงิน) ตรวจสอบสัญญา */
  async verifyLoan(
    dto: {
      la_id: number;
      verify_by: number;
      verify_name?: string;
      verify_date: string;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const loan = await this.laRepo.findOne({
      where: { laId: dto.la_id, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (user && loan.scId != null) assertSameSchool(user, loan.scId);
    if (loan.status !== STATUS.PENDING_VERIFY) {
      return {
        flag: false,
        ms: `ตรวจสอบไม่ได้ — สัญญาอยู่ในสถานะ "${STATUS_NAMES[loan.status] ?? ''}"`,
      };
    }

    loan.verifyBy = dto.verify_by;
    loan.verifyName = dto.verify_name ?? (await this.adminName(dto.verify_by));
    loan.verifyDate = dto.verify_date;
    loan.status = STATUS.PENDING_APPROVE;
    loan.upBy = dto.up_by ?? dto.verify_by;
    await this.laRepo.save(loan);
    return {
      flag: true,
      ms: `ตรวจสอบสัญญา ${loan.laNo} เรียบร้อยแล้ว (รออนุมัติ)`,
    };
  }

  /** ขั้นที่ 2 — ผู้อนุมัติ (ผอ.) อนุมัติให้ยืม */
  async approveLoan(
    dto: {
      la_id: number;
      approve_by: number;
      approve_name?: string;
      approve_date: string;
      approve_amount?: number;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const loan = await this.laRepo.findOne({
      where: { laId: dto.la_id, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (user && loan.scId != null) assertSameSchool(user, loan.scId);
    if (loan.status !== STATUS.PENDING_APPROVE) {
      return {
        flag: false,
        ms: `อนุมัติไม่ได้ — สัญญาอยู่ในสถานะ "${STATUS_NAMES[loan.status] ?? ''}" (ต้องตรวจสอบก่อน)`,
      };
    }

    loan.approveBy = dto.approve_by;
    loan.approveName =
      dto.approve_name ?? (await this.adminName(dto.approve_by));
    loan.approveDate = dto.approve_date;
    loan.approveAmount =
      dto.approve_amount != null ? Number(dto.approve_amount) : loan.amount;
    loan.status = STATUS.PENDING_DISBURSE;
    loan.upBy = dto.up_by ?? dto.approve_by;
    await this.laRepo.save(loan);
    return {
      flag: true,
      ms: `อนุมัติสัญญา ${loan.laNo} เรียบร้อยแล้ว (รอรับเงิน)`,
    };
  }

  /**
   * ขั้นที่ 3 — รับเงิน (จ่ายเงินยืม): ตัดยอดประเภทเงิน (FT type=-1) +
   * คำนวณกำหนดส่งใช้ (วันรับเงิน + due_days) → สถานะ "ค้างชำระ"
   */
  async disburseLoan(
    dto: {
      la_id: number;
      receipt_date: string;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const loan = await this.laRepo.findOne({
      where: { laId: dto.la_id, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (user && loan.scId != null) assertSameSchool(user, loan.scId);
    if (loan.status !== STATUS.PENDING_DISBURSE) {
      return {
        flag: false,
        ms: `รับเงินไม่ได้ — สัญญาอยู่ในสถานะ "${STATUS_NAMES[loan.status] ?? ''}" (ต้องอนุมัติก่อน)`,
      };
    }

    // re-check ยอดคงเหลือ ณ วันรับเงิน (กันติดลบ)
    const blockOverspend = await this.regulatoryConfig.getThreshold(
      loan.scId,
      'finance.block_overspend',
    );

    const dueDays = this.resolveDueDays(loan);
    const dueDate = dto.receipt_date
      ? addDays(dto.receipt_date, dueDays)
      : null;

    return this.dataSource.transaction(async (em) => {
      if (blockOverspend >= 1) {
        const available = await this.fundBalance.availableInTx(
          em,
          loan.scId,
          loan.syId,
          loan.moneyTypeId,
        );
        if (Number(loan.amount) - available > 0.005) {
          return {
            flag: false,
            ms: `จ่ายเงินยืมไม่ได้ — ยอดคงเหลือประเภทเงินนี้ ${available.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ไม่พอให้ยืม ${Number(loan.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
          };
        }
      }

      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);

      // ตัดยอดออกจากประเภทเงิน (จ่ายเป็นเงินยืม) — ระบบควบคุมเงินหน่วยงานย่อย 2544
      //   ลงช่อง "ลูกหนี้" ในทะเบียนคุม (register_kind=lend) ; เงินฝากธนาคาร−ยอดยืม
      const ftBorrow = await ftRepo.save(
        ftRepo.create({
          type: -1,
          bgTypeId: loan.moneyTypeId,
          amount: loan.amount,
          scId: loan.scId,
          syId: loan.syId,
          moneyChannel: 2, // จ่ายผ่านเงินฝากธนาคาร (ตย.8)
          registerKind: 'lend',
          laId: loan.laId,
          refNo: loan.laNo, // เช่น บย.3/2569
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: dto.receipt_date
            ? new Date(dto.receipt_date)
            : new Date(),
        }),
      );

      loan.receiptDate = dto.receipt_date;
      loan.dueDate = dueDate;
      loan.status = STATUS.OUTSTANDING;
      loan.ftBorrowId = ftBorrow.ftId;
      loan.upBy = dto.up_by ?? 0;
      await laRepo.save(loan);

      return {
        flag: true,
        ms: `จ่ายเงินยืม ${loan.laNo} เรียบร้อยแล้ว (กำหนดส่งใช้ภายใน ${dueDays} วัน)`,
      };
    });
  }

  async returnLoan(
    dto: {
      la_id: number;
      returned_date: string;
      return_cash: number;
      return_voucher_amount: number;
      evidence_no?: string;
      note?: string;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const loan = await this.laRepo.findOne({
      where: { laId: dto.la_id, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (user && loan.scId != null) assertSameSchool(user, loan.scId);
    if (loan.status === STATUS.RETURNED)
      return { flag: false, ms: 'สัญญานี้ชำระคืนแล้ว' };
    if (loan.status !== STATUS.OUTSTANDING) {
      return {
        flag: false,
        ms: `ส่งใช้ไม่ได้ — สัญญาอยู่ในสถานะ "${STATUS_NAMES[loan.status] ?? ''}" (ต้องรับเงินก่อน)`,
      };
    }

    const total = Number(dto.return_cash) + Number(dto.return_voucher_amount);
    if (total < loan.amount) {
      return {
        flag: false,
        ms: `ยอดคืนรวม ${total.toLocaleString()} บาท น้อยกว่ายอดยืม ${loan.amount.toLocaleString()} บาท`,
      };
    }

    const returnCash = Number(dto.return_cash);
    const returnVoucher = Number(dto.return_voucher_amount) || 0;

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);
      const lreRepo = em.getRepository(LoanReturnEvidence);

      const createDate = dto.returned_date
        ? new Date(dto.returned_date)
        : new Date();
      let ftReturnId: number | null = null;

      // 1) ส่งใช้ด้วย "ใบสำคัญ" → ล้างลูกหนี้ส่วนที่ใช้จริง
      //    ลงช่อง ลูกหนี้(−) / ใบสำคัญ(+) ในทะเบียน ; เงินฝากธนาคารไม่เปลี่ยน
      //    type=0 → ไม่กระทบยอดคงเหลือประเภทเงิน (ตัดไปแล้วตอนยืม)
      if (returnVoucher > 0) {
        await ftRepo.save(
          ftRepo.create({
            type: 0,
            bgTypeId: loan.moneyTypeId,
            amount: returnVoucher,
            scId: loan.scId,
            syId: loan.syId,
            moneyChannel: 2,
            registerKind: 'clear_voucher',
            laId: loan.laId,
            refNo: dto.evidence_no ?? loan.laNo,
            upBy: dto.up_by ?? 0,
            del: 0,
            createDate,
          }),
        );
      }

      // 2) คืน "เงินสด" ที่เหลือ → รับเข้าเป็นเงินสดในมือ (ต้องทำบันทึกการเก็บรักษาเงิน)
      //    ลงช่อง รับ(+) / ลูกหนี้(−) ในทะเบียน ; เงินสดคงเหลือ+ , ธนาคารไม่เปลี่ยน
      //    type=+1 channel=1(เงินสด) → ผลสุทธิ = −ยอดยืม + เงินสดคืน = −(ใบสำคัญ)
      if (returnCash > 0) {
        const ftReturn = await ftRepo.save(
          ftRepo.create({
            type: 1,
            bgTypeId: loan.moneyTypeId,
            amount: returnCash,
            scId: loan.scId,
            syId: loan.syId,
            moneyChannel: 1, // เงินสดในมือ
            registerKind: 'return_cash',
            laId: loan.laId,
            refNo: dto.evidence_no ?? null,
            upBy: dto.up_by ?? 0,
            del: 0,
            createDate,
          }),
        );
        ftReturnId = ftReturn.ftId;
      }

      // update loan
      loan.returnedDate = dto.returned_date;
      loan.returnCash = dto.return_cash;
      loan.returnVoucherAmount = dto.return_voucher_amount;
      loan.status = STATUS.RETURNED;
      loan.ftReturnId = ftReturnId;
      loan.upBy = dto.up_by ?? 0;
      await laRepo.save(loan);

      // save evidence
      await lreRepo.save(
        lreRepo.create({
          laId: dto.la_id,
          evidenceNo: dto.evidence_no ?? null,
          evidenceDate: dto.returned_date,
          cashAmount: dto.return_cash,
          voucherAmount: dto.return_voucher_amount,
          note: dto.note ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
        }),
      );

      // ── อัตโนมัติ: คืนเงินสดเงินยืม → สร้างบันทึกการเก็บรักษาเงินสด ─────────
      //    (จนท.การเงินรับเงินสดคืนมาถือไว้ → ผอ.รับเก็บรักษา) กันซ้ำ 1 ฉบับ/สัญญา
      if (returnCash > 0) {
        await this.createLoanReturnCashKeeping(
          em,
          loan,
          returnCash,
          dto.returned_date,
          dto.up_by ?? 0,
        );
      }

      return { flag: true, ms: `บันทึกการคืนเงิน ${loan.laNo} เรียบร้อยแล้ว` };
    });
  }

  /**
   * สร้างบันทึกการเก็บรักษาเงินสดอัตโนมัติ เมื่อคืนเงินยืมเป็น "เงินสด"
   *  ผู้ส่งมอบ = เจ้าหน้าที่การเงิน (ผู้บันทึกการคืน) ; ผู้รับเก็บรักษา = ผอ. (type 1/2)
   *  กันซ้ำ: 1 ฉบับต่อสัญญายืม (ผูกใน note `[auto la:<id>]`)
   */
  private async createLoanReturnCashKeeping(
    em: import('typeorm').EntityManager,
    loan: LoanAgreement,
    amount: number,
    returnedDate: string,
    upBy: number,
  ): Promise<void> {
    const ckRepo = em.getRepository(CashKeepingRecord);
    const refNote = `[auto la:${loan.laId}]`;
    const exists = await ckRepo
      .createQueryBuilder('ck')
      .where('ck.sc_id = :sc', { sc: loan.scId })
      .andWhere('ck.note LIKE :n', { n: `%${refNote}%` })
      .andWhere('ck.del = 0')
      .getCount();
    if (exists > 0) return;

    const senderId = upBy || loan.upBy || 0;
    // ผู้รับเก็บรักษา = ผู้อำนวยการ (admin type 1 หรือ 2) ของโรงเรียน
    const director = await this.adminRepo.findOne({
      where: [
        { scId: loan.scId ?? 0, type: 1, del: 0 },
        { scId: loan.scId ?? 0, type: 2, del: 0 },
      ],
      order: { type: 'ASC', adminId: 'ASC' },
    });
    const receiverId = director?.adminId || senderId;

    const snap = async (id: number) => {
      if (!id)
        return { name: null as string | null, pos: null as string | null };
      const a = await this.adminRepo.findOne({ where: { adminId: id } });
      return {
        name: a?.name ?? a?.username ?? null,
        pos: a?.position != null ? String(a.position) : null,
      };
    };
    const s = await snap(senderId);
    const r = await snap(receiverId);

    const recordDate = (returnedDate ? new Date(returnedDate) : new Date())
      .toISOString()
      .slice(0, 10);

    await ckRepo.save(
      ckRepo.create({
        scId: loan.scId ?? 0,
        syId: loan.syId ?? 0,
        recordDate,
        amount,
        moneyDetail:
          `คืนเงินสดเงินยืม ${loan.laNo ?? ''} (${loan.borrowerName ?? ''})`.trim(),
        senderId,
        senderName: s.name,
        senderPosition: s.pos,
        receiverId,
        receiverName: r.name,
        receiverPosition: r.pos,
        note: `สร้างอัตโนมัติจากการคืนเงินสดเงินยืม ${refNote}`,
        status: 1,
        upBy,
        del: 0,
      }),
    );
  }

  async cancelLoan(laId: number, note: string, upBy: number, user?: JwtUser) {
    const loan = await this.laRepo.findOne({ where: { laId, del: 0 } });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (user && loan.scId != null) assertSameSchool(user, loan.scId);
    if (loan.status === STATUS.RETURNED)
      return { flag: false, ms: 'ไม่สามารถยกเลิกสัญญาที่ชำระแล้ว' };
    if (loan.status === STATUS.CANCELLED)
      return { flag: false, ms: 'สัญญานี้ถูกยกเลิกแล้ว' };

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);

      // คืนยอดที่ตัดไปตอนรับเงิน (soft-delete FT) — เฉพาะกรณีจ่ายเงินไปแล้ว
      if (loan.ftBorrowId) {
        await ftRepo.update({ ftId: loan.ftBorrowId }, { del: 1 });
      }

      loan.status = STATUS.CANCELLED;
      loan.note = note || loan.note;
      loan.upBy = upBy;
      await laRepo.save(loan);
      return { flag: true, ms: 'ยกเลิกสัญญายืมเงินเรียบร้อยแล้ว' };
    });
  }

  async loadEvidence(laId: number, user?: JwtUser) {
    // Multi-tenant guard: หลักฐานส่งใช้ต้องเป็นของสัญญาในโรงเรียนผู้ใช้
    if (user) {
      const loan = await this.laRepo.findOne({ where: { laId, del: 0 } });
      if (loan && loan.scId != null) assertSameSchool(user, loan.scId);
    }
    const items = await this.lreRepo.find({
      where: { laId, del: 0 },
      order: { lreId: 'ASC' },
    });
    return items.map((e) => ({
      lre_id: e.lreId,
      la_id: e.laId,
      evidence_no: e.evidenceNo,
      evidence_date: e.evidenceDate,
      cash_amount: e.cashAmount,
      voucher_amount: e.voucherAmount,
      total: e.cashAmount + e.voucherAmount,
      note: e.note,
      create_date: e.createDate,
    }));
  }
}
