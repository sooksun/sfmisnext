import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

export type DayCloseStatus = 'pass' | 'fail' | 'warn' | 'info';

export interface DayCloseItem {
  id: string;
  label: string;
  status: DayCloseStatus;
  detail: string;
}

export interface DayCloseResult {
  check_date: string;
  items: DayCloseItem[];
  all_passed: boolean;
}

// ── Timeline ────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  event_type: string;
  label: string;
  date: string | null;
  amount: number;
  status: string;
  detail: string;
}

export interface TimelineResult {
  ref_type: string;
  ref_id: number;
  events: TimelineEvent[];
}

@Injectable()
export class DayCloseCheckService {
  constructor(
    @InjectRepository(CashKeepingRecord)
    private readonly ckrRepo: Repository<CashKeepingRecord>,

    @InjectRepository(FinancialAuditLog)
    private readonly auditLogRepo: Repository<FinancialAuditLog>,

    @InjectRepository(LoanAgreement)
    private readonly loanAgreementRepo: Repository<LoanAgreement>,

    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepo: Repository<RequestWithdraw>,

    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepo: Repository<PlnReceive>,

    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepo: Repository<FinancialTransactions>,
  ) {}

  async runDayCloseCheck(
    scId: number,
    syId: number,
    checkDate: string,
  ): Promise<DayCloseResult> {
    const items: DayCloseItem[] = [];

    // ── 1. cash_keeping: ยังมีเงินที่ผอ.เก็บรักษา ─────────────────────────────
    try {
      const pendingCash = await this.ckrRepo.find({
        where: { scId, syId, del: 0, status: 1, recordDate: checkDate },
      });

      if (pendingCash.length === 0) {
        items.push({
          id: 'cash_keeping',
          label: 'บันทึกรับเงินเพื่อเก็บรักษา',
          status: 'pass',
          detail: 'ไม่มีรายการที่รับเก็บรักษาค้างอยู่',
        });
      } else {
        const totalAmount = pendingCash.reduce(
          (sum, r) => sum + (r.amount ?? 0),
          0,
        );
        items.push({
          id: 'cash_keeping',
          label: 'บันทึกรับเงินเพื่อเก็บรักษา',
          status: 'fail',
          detail: `พบ ${pendingCash.length} รายการที่ยังไม่ได้ส่งคืน รวม ${totalAmount.toLocaleString('th-TH')} บาท`,
        });
      }
    } catch {
      items.push({
        id: 'cash_keeping',
        label: 'บันทึกรับเงินเพื่อเก็บรักษา',
        status: 'warn',
        detail: 'ไม่สามารถตรวจสอบได้ในขณะนี้',
      });
    }

    // ── 2. audit_receive: ลงนามรายวัน (audit_type = 1) ─────────────────────────
    try {
      const dailyAudit = await this.auditLogRepo.findOne({
        where: { scId, syId, auditType: 1, auditDate: checkDate },
      });

      if (dailyAudit) {
        items.push({
          id: 'audit_receive',
          label: 'ตรวจสอบการรับ-จ่ายเงิน',
          status: 'pass',
          detail: `ลงนามโดย ${dailyAudit.signedName ?? 'ผู้ใช้งาน'} แล้ว`,
        });
      } else {
        items.push({
          id: 'audit_receive',
          label: 'ตรวจสอบการรับ-จ่ายเงิน',
          status: 'warn',
          detail: 'ยังไม่ได้ลงนามรับรองรายวันสำหรับวันนี้',
        });
      }
    } catch {
      items.push({
        id: 'audit_receive',
        label: 'ตรวจสอบการรับ-จ่ายเงิน',
        status: 'warn',
        detail: 'ไม่สามารถตรวจสอบได้ในขณะนี้',
      });
    }

    // ── 3. audit_register: ลงนามทะเบียน (audit_type = 2) ──────────────────────
    // audit_type=2 คือรายเดือน ให้ตรวจเดือนปัจจุบัน
    try {
      const yearMonth = checkDate.substring(0, 7); // YYYY-MM
      const monthlyAudit = await this.auditLogRepo.findOne({
        where: { scId, syId, auditType: 2, auditMonth: yearMonth },
      });

      if (monthlyAudit) {
        items.push({
          id: 'audit_register',
          label: 'ตรวจสอบทะเบียน',
          status: 'pass',
          detail: `ผู้อำนวยการลงนามรายเดือน ${yearMonth} แล้ว`,
        });
      } else {
        items.push({
          id: 'audit_register',
          label: 'ตรวจสอบทะเบียน',
          status: 'warn',
          detail: `ผู้อำนวยการยังไม่ได้ลงนามรายเดือน ${yearMonth}`,
        });
      }
    } catch {
      items.push({
        id: 'audit_register',
        label: 'ตรวจสอบทะเบียน',
        status: 'warn',
        detail: 'ไม่สามารถตรวจสอบได้ในขณะนี้',
      });
    }

    // ── 4. loan_overdue: เงินยืมเกินกำหนด ──────────────────────────────────────
    try {
      const overdueLoans = await this.loanAgreementRepo.find({
        where: { scId, del: 0, status: 1, dueDate: LessThan(checkDate) },
      });

      if (overdueLoans.length === 0) {
        items.push({
          id: 'loan_overdue',
          label: 'เงินยืมเกินกำหนด',
          status: 'pass',
          detail: 'ไม่มีรายการเงินยืมเกินกำหนดส่งคืน',
        });
      } else {
        const totalOverdue = overdueLoans.reduce(
          (sum, l) => sum + (l.amount ?? 0),
          0,
        );
        items.push({
          id: 'loan_overdue',
          label: 'เงินยืมเกินกำหนด',
          status: 'warn',
          detail: `พบ ${overdueLoans.length} รายการเกินกำหนด รวม ${totalOverdue.toLocaleString('th-TH')} บาท`,
        });
      }
    } catch {
      items.push({
        id: 'loan_overdue',
        label: 'เงินยืมเกินกำหนด',
        status: 'info',
        detail: 'ไม่สามารถตรวจสอบข้อมูลเงินยืมได้ในขณะนี้',
      });
    }

    const all_passed = items.every(
      (item) => item.status === 'pass' || item.status === 'info',
    );

    return { check_date: checkDate, items, all_passed };
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  async getTimeline(
    scId: number,
    refType: string,
    refId: number,
  ): Promise<TimelineResult> {
    const events: TimelineEvent[] = [];

    try {
      if (refType === 'invoice' || refType === 'check') {
        const rw = await this.requestWithdrawRepo.findOne({
          where: { rwId: refId, scId, del: 0 },
        });

        if (rw) {
          // สร้างใบเบิก
          events.push({
            event_type: 'created',
            label: 'สร้างใบขอเบิก',
            date: rw.dateRequest
              ? new Date(rw.dateRequest).toISOString().split('T')[0]
              : null,
            amount: rw.amount ?? 0,
            status: 'สร้าง',
            detail: `เลขที่ ${rw.noDoc ?? '-'} | ${rw.detail ?? '-'}`,
          });

          // ส่งหัวหน้า
          if (rw.status >= 100) {
            events.push({
              event_type: 'submitted',
              label: 'ส่งหัวหน้าการเงิน',
              date: rw.dateRequest
                ? new Date(rw.dateRequest).toISOString().split('T')[0]
                : null,
              amount: rw.amount ?? 0,
              status: rw.status === 101 ? 'ไม่อนุมัติ' : 'ส่งแล้ว',
              detail: rw.remark ?? '-',
            });
          }

          // หัวหน้าอนุมัติ
          if (rw.status >= 102) {
            events.push({
              event_type: 'approved',
              label: 'หัวหน้าการเงินอนุมัติ',
              date: rw.offerCheckDate
                ? new Date(rw.offerCheckDate).toISOString().split('T')[0]
                : null,
              amount: rw.amount ?? 0,
              status: 'อนุมัติ',
              detail: '-',
            });
          }

          // ผอ.อนุมัติ
          if (rw.status >= 200) {
            events.push({
              event_type: 'director_approved',
              label: 'ผู้อำนวยการอนุมัติ',
              date: rw.offerCheckDate
                ? new Date(rw.offerCheckDate).toISOString().split('T')[0]
                : null,
              amount: rw.amount ?? 0,
              status: 'อนุมัติ',
              detail: '-',
            });
          }

          // ออกเช็ค
          if (rw.status === 202 && rw.checkNoDoc) {
            events.push({
              event_type: 'check_issued',
              label: 'ออกเช็ค',
              date: rw.offerCheckDate
                ? new Date(rw.offerCheckDate).toISOString().split('T')[0]
                : null,
              amount: rw.amount ?? 0,
              status: 'ออกเช็คแล้ว',
              detail: `เช็คเลขที่ ${rw.checkNoDoc}`,
            });
          }

          // ยกเลิก
          if (rw.status === 201) {
            events.push({
              event_type: 'cancelled',
              label: 'ยกเลิกเช็ค',
              date: null,
              amount: rw.amount ?? 0,
              status: 'ยกเลิก',
              detail: rw.remark ?? '-',
            });
          }
        }
      } else if (refType === 'receipt') {
        const pr = await this.plnReceiveRepo.findOne({
          where: { prId: refId, scId, del: 0 },
        });

        if (pr) {
          // สร้างใบรับเงิน
          const moneyTypeName =
            pr.receiveMoneyType === 1
              ? 'เช็ค'
              : pr.receiveMoneyType === 2
                ? 'เงินสด'
                : 'เงินฝากธนาคาร';

          events.push({
            event_type: 'created',
            label: 'สร้างใบรับเงิน',
            date: pr.receiveDate
              ? new Date(pr.receiveDate).toISOString().split('T')[0]
              : null,
            amount: 0,
            status: 'สร้าง',
            detail: `เลขที่ ${pr.prNo ?? '-'} | ประเภท: ${moneyTypeName}`,
          });

          // Transaction confirmed
          if (pr.cfTransaction === 1) {
            // ดึงยอดรวมจาก financial_transactions
            const ftRow = await this.financialTransactionsRepo
              .createQueryBuilder('ft')
              .select('SUM(ft.amount)', 'total')
              .where('ft.sc_id = :scId', { scId })
              .andWhere('ft.pr_id = :prId', { prId: pr.prId })
              .andWhere('ft.del = :del', { del: '0' })
              .getRawOne<{ total: string }>();
            const total = parseFloat(ftRow?.total ?? '0');

            events.push({
              event_type: 'confirmed',
              label: 'ยืนยัน Transaction',
              date: pr.createDate
                ? new Date(pr.createDate).toISOString().split('T')[0]
                : null,
              amount: total,
              status: 'ยืนยันแล้ว',
              detail: `รับเงินรวม ${total.toLocaleString('th-TH')} บาท`,
            });
          }
        }
      } else if (refType === 'loan') {
        const loan = await this.loanAgreementRepo.findOne({
          where: { laId: refId, scId, del: 0 },
        });

        if (loan) {
          events.push({
            event_type: 'created',
            label: 'สร้างสัญญายืมเงิน',
            date: loan.borrowDate,
            amount: loan.amount ?? 0,
            status: 'สร้าง',
            detail: `สัญญาเลขที่ ${loan.laNo ?? '-'} | ${loan.purpose ?? '-'}`,
          });

          if (loan.dueDate) {
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = loan.status === 1 && loan.dueDate < today;
            events.push({
              event_type: 'due',
              label: 'กำหนดส่งคืน',
              date: loan.dueDate,
              amount: loan.amount ?? 0,
              status: isOverdue
                ? 'เกินกำหนด'
                : loan.status === 2
                  ? 'คืนแล้ว'
                  : 'รอคืน',
              detail: isOverdue ? `เกินกำหนดมาแล้ว` : '-',
            });
          }

          if (loan.status === 2 && loan.returnedDate) {
            const returnTotal =
              (loan.returnCash ?? 0) + (loan.returnVoucherAmount ?? 0);
            events.push({
              event_type: 'returned',
              label: 'ส่งคืนเงินยืม',
              date: loan.returnedDate,
              amount: returnTotal,
              status: 'คืนแล้ว',
              detail: `เงินสด ${(loan.returnCash ?? 0).toLocaleString('th-TH')} บาท + ใบสำคัญ ${(loan.returnVoucherAmount ?? 0).toLocaleString('th-TH')} บาท`,
            });
          }
        }
      }
    } catch {
      // return empty events gracefully
    }

    return { ref_type: refType, ref_id: refId, events };
  }
}
