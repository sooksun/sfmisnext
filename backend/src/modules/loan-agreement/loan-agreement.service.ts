import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LoanAgreement } from './entities/loan-agreement.entity';
import { LoanReturnEvidence } from './entities/loan-return-evidence.entity';
import { AddLoanAgreementDto } from './dto/add-loan-agreement.dto';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

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
    private readonly dataSource: DataSource,
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

  async addLoanAgreement(dto: AddLoanAgreementDto) {
    // G15: block ยืมใหม่ถ้าผู้ยืมคนเดิมยังมีสัญญาที่ค้างชำระอยู่
    const openLoan = await this.laRepo.findOne({
      where: {
        scId: dto.sc_id,
        borrowerId: dto.borrower_id,
        status: 1,
        del: 0,
      },
    });
    if (openLoan) {
      return {
        flag: false,
        ms: `ไม่สามารถยืมใหม่ได้ — ${openLoan.borrowerName ?? 'ผู้ยืม'} ยังมีสัญญายืมเงิน บย.${openLoan.laNo} (ยอด ${openLoan.amount?.toLocaleString('th-TH')} บาท) ที่ยังไม่ปิด กรุณาล้างรายการเก่าก่อน`,
      };
    }

    // auto-generate la_seq
    const lastLoan = await this.laRepo.findOne({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
      order: { laSeq: 'DESC' },
    });
    const laSeq = lastLoan ? lastLoan.laSeq + 1 : 1;
    const laNo = `${laSeq}/${dto.budget_year}`;

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

    const loan = this.laRepo.create({
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
      note: dto.note ?? null,
      upBy: dto.up_by ?? 0,
      del: 0,
    });

    await this.laRepo.save(loan);
    return { flag: true, ms: `สร้างสัญญายืมเงิน บย.${laNo} เรียบร้อยแล้ว` };
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

    // Wrap loan update + evidence insert ใน transaction เดียว
    // ป้องกัน inconsistent state ถ้า evidence insert fail แต่ loan status เปลี่ยนแล้ว
    await this.dataSource.transaction(async (manager) => {
      loan.returnedDate = dto.returned_date;
      loan.returnCash = dto.return_cash;
      loan.returnVoucherAmount = dto.return_voucher_amount;
      loan.status = 2;
      loan.upBy = dto.up_by ?? 0;
      await manager.save(LoanAgreement, loan);

      const evidence = manager.create(LoanReturnEvidence, {
        laId: dto.la_id,
        evidenceNo: dto.evidence_no ?? null,
        evidenceDate: dto.returned_date,
        cashAmount: dto.return_cash,
        voucherAmount: dto.return_voucher_amount,
        note: dto.note ?? null,
        upBy: dto.up_by ?? 0,
        del: 0,
      });
      await manager.save(LoanReturnEvidence, evidence);
    });

    return { flag: true, ms: `บันทึกการคืนเงิน บย.${loan.laNo} เรียบร้อยแล้ว` };
  }

  async cancelLoan(laId: number, note: string, upBy: number) {
    const loan = await this.laRepo.findOne({ where: { laId, del: 0 } });
    if (!loan) return { flag: false, ms: 'ไม่พบสัญญายืมเงิน' };
    if (loan.status === 2)
      return { flag: false, ms: 'ไม่สามารถยกเลิกสัญญาที่ชำระแล้ว' };

    loan.status = 3;
    loan.note = note || loan.note;
    loan.upBy = upBy;
    await this.laRepo.save(loan);
    return { flag: true, ms: 'ยกเลิกสัญญายืมเงินเรียบร้อยแล้ว' };
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
