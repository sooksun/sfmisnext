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
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';

const DUE_DAYS: Record<number, number> = { 1: 15, 2: 30, 3: 30, 4: 30 };
const CATEGORY_NAMES: Record<number, string> = {
  1: 'ค่าเดินทาง',
  2: 'โครงการ',
  3: 'กิจกรรม',
  4: 'อื่นๆ',
};

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

  async loadLoanAgreements(scId: number, syId: number, budgetYear: string) {
    const loans = await this.laRepo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { laSeq: 'ASC' },
    });

    const today = new Date().toISOString().substring(0, 10);

    return {
      data: loans.map((l) => {
        const isOverdue =
          l.status === 1 && l.dueDate != null && l.dueDate < today;
        return {
          la_id: l.laId,
          la_no: l.laNo,
          la_seq: l.laSeq,
          borrower_id: l.borrowerId,
          borrower_name: l.borrowerName,
          borrower_position: l.borrowerPosition,
          money_type_id: l.moneyTypeId,
          money_type_name: l.moneyTypeName,
          loan_category: l.loanCategory,
          loan_category_name: CATEGORY_NAMES[l.loanCategory] ?? '',
          purpose: l.purpose,
          amount: l.amount,
          borrow_date: l.borrowDate,
          due_date: l.dueDate,
          returned_date: l.returnedDate,
          return_cash: l.returnCash,
          return_voucher_amount: l.returnVoucherAmount,
          return_total: (l.returnCash ?? 0) + (l.returnVoucherAmount ?? 0),
          status: l.status,
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
   * เตือนเงินยืมใกล้/เลยกำหนดคืน
   *  - overdue: เลยกำหนดแล้ว (status ค้างชำระ และ due_date < วันนี้)
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
      where: { scId, syId, status: 1, del: 0 },
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
    // G15: block ยืมใหม่ถ้าผู้ยืมคนเดิมยังมีสัญญาที่ค้างชำระอยู่
    const openLoan = await this.laRepo.findOne({
      where: {
        scId: dto.sc_id,
        syId: dto.sy_id,
        budgetYear: dto.budget_year,
        borrowerId: dto.borrower_id,
        status: 1,
        del: 0,
      },
    });
    if (openLoan) {
      return {
        flag: false,
        ms: `ไม่สามารถยืมใหม่ได้ — ${openLoan.borrowerName ?? 'ผู้ยืม'} ยังมีสัญญายืมเงิน ${openLoan.laNo} (ยอด ${openLoan.amount?.toLocaleString('th-TH')} บาท) ที่ยังไม่ปิด กรุณาล้างรายการเก่าก่อน`,
      };
    }

    // guard: ห้ามยืมเกินยอดคงเหลือของประเภทเงิน (เงินแต่ละประเภทห้ามติดลบ)
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
    const issued = await this.docCounter.issue(dto.sc_id, dto.budget_year, 'BY');
    const laSeq = issued.seq;
    const laNo = issued.formatted; // เช่น บย.5/2569

    // snapshot borrower — Admin entity ใช้ name field เดียว
    let borrowerName: string | null = null;
    let borrowerPosition: string | null = null;
    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.borrower_id },
    });
    if (admin) {
      borrowerName = admin.name ?? admin.username ?? null;
      // position เป็น number ใน Admin entity
      borrowerPosition = admin.position != null ? String(admin.position) : null;
    }

    // snapshot money type name
    let moneyTypeName: string | null = null;
    const bt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId: dto.money_type_id },
    });
    if (bt) moneyTypeName = bt.budgetType;

    // auto-calculate due_date
    const dueDays = DUE_DAYS[dto.loan_category] ?? 30;
    const dueDate = dto.borrow_date ? addDays(dto.borrow_date, dueDays) : null;

    // สร้างสัญญา + ตัดยอดทะเบียนคุมเงิน (financial_transactions) ใน transaction เดียว
    //   ระบบควบคุมเงินหน่วยงานย่อย 2544: การยืมเงินเป็น "ลูกหนี้เงินยืม" ที่ตัด
    //   ยอดเงินประเภทนั้นออก (ตย.8/11) — ตอนคืนเงินสดจึงค่อยคืนยอดกลับ
    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);

      const ftBorrow = await ftRepo.save(
        ftRepo.create({
          type: -1, // ตัดยอดออกจากประเภทเงิน (จ่ายเป็นเงินยืม)
          bgTypeId: dto.money_type_id,
          amount: dto.amount,
          scId: dto.sc_id,
          syId: dto.sy_id,
          moneyChannel: 2, // จ่ายผ่านเงินฝากธนาคาร (ตย.8)
          upBy: dto.up_by ?? 0,
          del: 0,
          createDate: dto.borrow_date ? new Date(dto.borrow_date) : new Date(),
        }),
      );

      const loan = await laRepo.save(
        laRepo.create({
          scId: dto.sc_id,
          syId: dto.sy_id,
          budgetYear: dto.budget_year,
          laSeq,
          laNo,
          borrowerId: dto.borrower_id,
          borrowerName,
          borrowerPosition,
          moneyTypeId: dto.money_type_id,
          moneyTypeName,
          purpose: dto.purpose ?? null,
          amount: dto.amount,
          borrowDate: dto.borrow_date,
          loanCategory: dto.loan_category,
          dueDate,
          status: 1,
          rwId: dto.rw_id ?? null,
          ftBorrowId: ftBorrow.ftId,
          note: dto.note ?? null,
          upBy: dto.up_by ?? 0,
          del: 0,
        }),
      );
      void loan;

      return { flag: true, ms: `สร้างสัญญายืมเงิน ${laNo} เรียบร้อยแล้ว` };
    });
  }

  async returnLoan(dto: {
    la_id: number;
    returned_date: string;
    return_cash: number;
    return_voucher_amount: number;
    evidence_no?: string;
    note?: string;
    up_by?: number;
  }) {
    const loan = await this.laRepo.findOne({
      where: { laId: dto.la_id, del: 0 },
    });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (loan.status === 2) return { flag: false, ms: 'สัญญานี้ชำระคืนแล้ว' };

    const total = Number(dto.return_cash) + Number(dto.return_voucher_amount);
    if (total < loan.amount) {
      return {
        flag: false,
        ms: `ยอดคืนรวม ${total.toLocaleString()} บาท น้อยกว่ายอดยืม ${loan.amount.toLocaleString()} บาท`,
      };
    }

    const returnCash = Number(dto.return_cash);

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);
      const lreRepo = em.getRepository(LoanReturnEvidence);

      // คืนเฉพาะ "เงินสดที่เหลือ" กลับเข้าประเภทเงิน (type=+1)
      //   ส่วนใบสำคัญ (voucher) = ค่าใช้จ่ายจริง → ถือว่าถูกตัดไปแล้วตอนยืม
      //   ผลสุทธิต่อประเภทเงิน = −ยอดยืม + เงินสดคืน = −(ใบสำคัญ) ตรงตามคู่มือ
      let ftReturnId: number | null = null;
      if (returnCash > 0) {
        const ftReturn = await ftRepo.save(
          ftRepo.create({
            type: 1, // คืนยอดเงินสดที่ไม่ได้ใช้กลับเข้าประเภทเงิน
            bgTypeId: loan.moneyTypeId,
            amount: returnCash,
            scId: loan.scId,
            syId: loan.syId,
            moneyChannel: 2,
            upBy: dto.up_by ?? 0,
            del: 0,
            createDate: dto.returned_date
              ? new Date(dto.returned_date)
              : new Date(),
          }),
        );
        ftReturnId = ftReturn.ftId;
      }

      // update loan
      loan.returnedDate = dto.returned_date;
      loan.returnCash = dto.return_cash;
      loan.returnVoucherAmount = dto.return_voucher_amount;
      loan.status = 2;
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

      return { flag: true, ms: `บันทึกการคืนเงิน ${loan.laNo} เรียบร้อยแล้ว` };
    });
  }

  async cancelLoan(laId: number, note: string, upBy: number) {
    const loan = await this.laRepo.findOne({ where: { laId, del: 0 } });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (loan.status === 2)
      return { flag: false, ms: 'ไม่สามารถยกเลิกสัญญาที่ชำระแล้ว' };

    return this.dataSource.transaction(async (em) => {
      const ftRepo = em.getRepository(FinancialTransactions);
      const laRepo = em.getRepository(LoanAgreement);

      // คืนยอดที่ตัดไปตอนยืม (soft-delete FT) — เงินยังไม่ได้ออกจริง/ยกเลิกการยืม
      if (loan.ftBorrowId) {
        await ftRepo.update({ ftId: loan.ftBorrowId }, { del: 1 });
      }

      loan.status = 3;
      loan.note = note || loan.note;
      loan.upBy = upBy;
      await laRepo.save(loan);
      return { flag: true, ms: 'ยกเลิกสัญญายืมเงินเรียบร้อยแล้ว' };
    });
  }

  async loadEvidence(laId: number) {
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
