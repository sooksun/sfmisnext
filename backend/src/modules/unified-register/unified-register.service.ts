import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

/** จัดหมวดรายรับเงินรายได้สถานศึกษา ตามแบบ form-030 (heuristic จากข้อความรายการ) */
function classifyRevenueIncome(detail: string): string {
  const d = detail || '';
  if (/ราชพัสดุ|ค่าเช่า|ให้เช่า/.test(d)) return 'raachapasadu'; // 1
  if (/ปรับ/.test(d) && /ลาศึกษา|ลาเรียน/.test(d)) return 'fine_study'; // 2
  if (/เบี้ยปรับ|ค่าปรับ|ผิดสัญญา/.test(d)) return 'fine_contract'; // 3
  if (/บริจาค|มอบให้|ผ้าป่า|กฐิน|ทอดผ้าป่า/.test(d)) {
    return /ไม่ระบุ/.test(d) ? 'donation_unclear' : 'donation_clear'; // 4.1/4.2
  }
  if (/บำรุงการศึกษา|ค่าบำรุง|บำรุง/.test(d)) return 'edu_support'; // 5
  return 'other'; // 6
}

/** map request_withdraw.expense_type → หมวดรายจ่าย form-030 */
function classifyRevenueExpense(expenseType: number | null): string {
  switch (expenseType) {
    case 1:
      return 'personnel_wage'; // งบบุคลากร ค่าจ้างชั่วคราว
    case 2:
      return 'operate_remuneration'; // 2.1 ค่าตอบแทน
    case 3:
      return 'operate_service'; // 2.2 ค่าใช้สอย
    case 4:
      return 'operate_material'; // 2.3 ค่าวัสดุ
    case 5:
      return 'operate_utility'; // 2.4 ค่าสาธารณูปโภค
    case 6:
      return 'invest_durable'; // 3.1 ค่าครุภัณฑ์
    case 7:
      return 'invest_land'; // 3.2 ค่าที่ดินและสิ่งก่อสร้าง
    case 9:
      return 'subsidy'; // 4 งบเงินอุดหนุน
    default:
      return 'other'; // 5 อื่น ๆ
  }
}
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { Receipt } from '../receipt/entities/receipt.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';

/** จัดรูปเลขที่ใบเสร็จรับเงินเป็น "บร.{เล่มที่}/{เลขที่}" เช่น "บร.253ก/22" */
function formatReceiptNo(
  bookNo: string | null | undefined,
  receiptNo: number | null | undefined,
): string | null {
  const book = (bookNo ?? '').toString().trim();
  if (!book || receiptNo == null) return null;
  return `บร.${book}/${receiptNo}`;
}

export interface UnifiedSummaryItem {
  bg_type_id: number;
  budget_type: string;
  carry_forward: number;
  revenue: number;
  expenses: number;
  balance: number;
  entry_count: number;
}

/** ชนิดแถวในทะเบียนคุม (ขับเคลื่อนการอัปเดตยอดคงเหลือ) */
export type RegisterRowKind =
  | 'normal'
  | 'lend'
  | 'clear_voucher'
  | 'return_cash'
  | 'deposit';

export interface UnifiedTransactionRow {
  ft_id: number;
  type: number;
  amount: number;
  create_date: Date | null;
  doc_no: string | null;
  detail: string | null;
  balance: number; // คงเหลือรวม (เงินสด+ธนาคาร+สพป. ไม่รวมลูกหนี้)
  receive_money_type: number | null;
  // ── ทะเบียนคุมเงินยืม ──
  kind: RegisterRowKind;
  receive: number; // ช่อง "รับ"
  pay_debtor: number; // ช่อง จ่าย:"ลูกหนี้" (ติดลบ = contra ส่งใช้/คืน)
  pay_voucher: number; // ช่อง จ่าย:"ใบสำคัญ"
  cash: number; // คงเหลือเงินสด (running)
  bank: number; // คงเหลือเงินฝากธนาคาร (running)
  smp: number; // คงเหลือเงินฝากส่วนราชการผู้เบิก (running)
  debtor: number; // ลูกหนี้คงค้าง (running)
}

/** ยอดยกมาต้นปีแยกตามที่เก็บเงิน (storage_type 1/2/3/4) */
export interface OpeningSplit {
  cash: number; // 1
  bank: number; // 2
  smp: number; // 3
  debtor: number; // 4 = ลูกหนี้ยกมา
}

@Injectable()
export class UnifiedRegisterService {
  constructor(
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(OpeningBalance)
    private readonly openingBalanceRepository: Repository<OpeningBalance>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(LoanAgreement)
    private readonly loanAgreementRepository: Repository<LoanAgreement>,
  ) {}

  /** ยอดยกมาต้นปี รวมต่อ money_type (กรองตาม sy_id ถ้ามี) — ไม่รวมลูกหนี้ยกมา (storage 4) */
  private async loadOpeningByType(
    scId: number,
    syId: number,
  ): Promise<Map<number, number>> {
    const rows = await this.openingBalanceRepository.find({
      where: syId ? { scId, syId, del: 0 } : { scId, del: 0 },
    });
    const map = new Map<number, number>();
    for (const ob of rows) {
      // storage_type 4 = ลูกหนี้ยกมา → ไม่นับรวมเป็นยอดเงินคงเหลือ
      if (ob.storageType === 4) continue;
      map.set(
        ob.moneyTypeId,
        (map.get(ob.moneyTypeId) ?? 0) + (Number(ob.amount) || 0),
      );
    }
    return map;
  }

  /** ยอดยกมาต้นปีของประเภทเงิน แยกตามที่เก็บ (เงินสด/ธนาคาร/สพป./ลูกหนี้) */
  private async loadOpeningSplit(
    scId: number,
    syId: number,
    bgTypeId: number,
  ): Promise<OpeningSplit> {
    const rows = await this.openingBalanceRepository.find({
      where: syId
        ? { scId, syId, moneyTypeId: bgTypeId, del: 0 }
        : { scId, moneyTypeId: bgTypeId, del: 0 },
    });
    const split: OpeningSplit = { cash: 0, bank: 0, smp: 0, debtor: 0 };
    for (const ob of rows) {
      const amt = Number(ob.amount) || 0;
      switch (ob.storageType) {
        case 1:
          split.cash += amt;
          break;
        case 3:
          split.smp += amt;
          break;
        case 4:
          split.debtor += amt;
          break;
        default:
          split.bank += amt; // 2 = ธนาคาร (และ legacy)
      }
    }
    return split;
  }

  async getSummary(
    scId: number,
    syId: number,
    _year: string,
  ): Promise<UnifiedSummaryItem[]> {
    // Load all active budget types
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    const openingByType = await this.loadOpeningByType(scId, syId);
    const results: UnifiedSummaryItem[] = [];

    for (const bt of budgetTypes) {
      const rows = await this.financialTransactionsRepository
        .createQueryBuilder('ft')
        .select('ft.type', 'type')
        .addSelect('SUM(ft.amount)', 'total')
        .addSelect('COUNT(ft.ft_id)', 'cnt')
        .where('ft.sc_id = :scId', { scId })
        .andWhere('ft.del = :del', { del: '0' })
        // กรองตามปีงบ (sy_id) กัน transaction ข้ามปีปนกัน
        .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
        .andWhere('ft.bg_type_id = :bgTypeId', { bgTypeId: bt.bgTypeId })
        // กัน "นำฝาก" (transfer ภายใน) ปนยอดรับ/จ่าย
        .andWhere("(ft.register_kind IS NULL OR ft.register_kind <> 'deposit')")
        .groupBy('ft.type')
        .getRawMany<{ type: number; total: string; cnt: string }>();

      let revenue = 0;
      let expenses = 0;
      let entry_count = 0;

      for (const row of rows) {
        const total = parseFloat(row.total ?? '0');
        const cnt = parseInt(row.cnt ?? '0', 10);
        entry_count += cnt;
        if (Number(row.type) === 1) {
          revenue += total;
        } else if (Number(row.type) === -1) {
          expenses += total;
        }
      }

      const carryForward = openingByType.get(bt.bgTypeId) ?? 0;

      // include types ที่มีรายการ หรือมียอดยกมา
      if (entry_count > 0 || carryForward !== 0) {
        results.push({
          bg_type_id: bt.bgTypeId,
          budget_type: bt.budgetType,
          carry_forward: carryForward,
          revenue,
          expenses,
          balance: carryForward + revenue - expenses,
          entry_count,
        });
      }
    }

    return results;
  }

  async getRegisterDetail(
    bgTypeId: number,
    scId: number,
    syId: number,
    _year: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    bg_type_id: number;
    budget_type: string;
    carry_forward: number;
    opening: OpeningSplit;
    revenue: number;
    expenses: number;
    balance: number;
    transactions: UnifiedTransactionRow[];
  }> {
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });

    // ยอดยกมาต้นปีของประเภทนี้ แยกตามที่เก็บ (ไม่ขึ้นกับ fromDate — เป็นยอดตั้งต้น)
    const opening = await this.loadOpeningSplit(scId, syId, bgTypeId);
    const carryForward = opening.cash + opening.bank + opening.smp;

    const qb = this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
      .andWhere('ft.bg_type_id = :bgTypeId', { bgTypeId })
      .orderBy('ft.create_date', 'ASC')
      .addOrderBy('ft.ft_id', 'ASC');

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      qb.andWhere('ft.create_date >= :fromDate', { fromDate: from });
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('ft.create_date <= :toDate', { toDate: to });
    }

    const transactions = await qb.getMany();

    // batch-load สัญญายืม (ใช้ประกอบรายละเอียดแถวเงินยืม)
    const laIds = [
      ...new Set(transactions.filter((t) => t.laId > 0).map((t) => t.laId)),
    ];
    const loanById = new Map<number, LoanAgreement>();
    if (laIds.length) {
      const loans = await this.loanAgreementRepository.find({
        where: { laId: In(laIds) },
      });
      for (const l of loans) loanById.set(l.laId, l);
    }

    // running ledgers แยกที่เก็บ + ลูกหนี้คงค้าง
    let cash = opening.cash;
    let bank = opening.bank;
    const smp = opening.smp;
    let debtor = opening.debtor;
    let revenue = 0;
    let expenses = 0;
    const processed: UnifiedTransactionRow[] = [];

    for (const trans of transactions) {
      const kind = (trans.registerKind ?? 'normal') as RegisterRowKind;
      const amt = Number(trans.amount) || 0;

      // ข้าม FT คู่ "เงินฝากธนาคารเข้า" ของการนำฝาก (type=+1) — รวมเป็นแถวเดียวกับ cash-out
      if (kind === 'deposit' && trans.type === 1) continue;

      let docNo: string | null = trans.refNo ?? null;
      let detail: string | null = null;
      let receiveMoneyType: number | null = null;
      let receive = 0;
      let payDebtor = 0;
      let payVoucher = 0;
      const loan = trans.laId > 0 ? loanById.get(trans.laId) : undefined;

      switch (kind) {
        case 'lend': {
          // จ่ายเงินยืม → ลูกหนี้+ , ธนาคาร−
          payDebtor = amt;
          bank -= amt;
          debtor += amt;
          expenses += amt;
          // ที่เอกสาร = เลขที่เงินยืม บย.{N}/{พ.ศ.} (อ้างอิงสัญญายืมเสมอ)
          docNo = loan?.laNo ?? docNo ?? null;
          detail = loan
            ? `${loan.borrowerName ?? ''} ยืมเงิน${loan.purpose ? `เพื่อ${loan.purpose}` : ''}`.trim()
            : 'จ่ายเงินยืม';
          break;
        }
        case 'clear_voucher': {
          // ส่งใช้ด้วยใบสำคัญ → ลูกหนี้− / ใบสำคัญ+ ; เงินฝากไม่เปลี่ยน
          payDebtor = -amt;
          payVoucher = amt;
          debtor -= amt;
          // ที่เอกสาร = เลขที่เงินยืม บย.{N}/{พ.ศ.} (อ้างอิงสัญญายืมเสมอ)
          docNo = loan?.laNo ?? docNo ?? null;
          detail = loan
            ? `${loan.borrowerName ?? ''} ส่งใช้หลักฐานเงินยืม`.trim()
            : 'ส่งใช้ใบสำคัญเงินยืม';
          break;
        }
        case 'return_cash': {
          // คืนเงินสด → รับ+ / ลูกหนี้− ; เงินสดในมือ+
          receive = amt;
          payDebtor = -amt;
          cash += amt;
          debtor -= amt;
          revenue += amt;
          // ที่เอกสาร = เลขที่เงินยืม บย.{N}/{พ.ศ.} (อ้างอิงสัญญายืมเสมอ)
          docNo = loan?.laNo ?? docNo ?? null;
          detail = loan
            ? `${loan.borrowerName ?? ''} ส่งใช้เงินสดล้างหนี้เงินยืม`.trim()
            : 'ส่งคืนเงินสดเงินยืม';
          break;
        }
        case 'deposit': {
          // นำเงินสดฝากธนาคาร → เงินสด− / ธนาคาร+ (ลงช่องใบสำคัญตามคู่มือ)
          payVoucher = amt;
          cash -= amt;
          bank += amt;
          detail = 'นำเงินฝากธนาคาร';
          break;
        }
        default: {
          // รายการปกติ (รับเงิน / จ่ายใบสำคัญ)
          if (trans.type === 1 && trans.prId > 0) {
            const recv = await this.plnReceiveRepository.findOne({
              where: { prId: trans.prId },
            });
            if (recv) {
              receiveMoneyType = recv.receiveMoneyType;
              const receipt = await this.receiptRepository.findOne({
                where: { prId: String(trans.prId), status: '1' },
                order: { rId: 'DESC' },
              });
              docNo =
                formatReceiptNo(receipt?.bookNo, receipt?.receiptNo) ??
                recv.prNo;
              const rds = await this.plnReceiveDetailRepository.find({
                where: { prId: trans.prId, del: 0 },
              });
              detail = rds.length > 0 ? rds[0].prdDetail : null;
            }
          } else if (trans.type === -1 && trans.rwId > 0) {
            const rw = await this.requestWithdrawRepository.findOne({
              where: { rwId: trans.rwId },
            });
            if (rw) {
              docNo = rw.noDoc ?? rw.checkNoDoc;
              detail = rw.detail;
            }
          }

          if (trans.type === 1) {
            receive = amt;
            revenue += amt;
            // รับเข้าเงินสดเฉพาะใบเสร็จเงินสด (receive_money_type=2) ; อื่น ๆ เข้าธนาคาร
            if (receiveMoneyType === 2) cash += amt;
            else bank += amt;
          } else if (trans.type === -1) {
            // ใบสำคัญ (จ่าย) ตัดจากเงินฝากธนาคารเสมอ ตามคู่มือ
            // (ช่อง "เงินสด" สงวนไว้สำหรับวงจรยืม-คืน-นำฝากเท่านั้น — กันยอดติดลบ)
            payVoucher = amt;
            expenses += amt;
            bank -= amt;
          }
        }
      }

      const balance = cash + bank + smp;
      processed.push({
        ft_id: trans.ftId,
        type: trans.type,
        amount: amt,
        create_date: trans.createDate,
        doc_no: docNo,
        detail,
        balance,
        receive_money_type: receiveMoneyType,
        kind,
        receive,
        pay_debtor: payDebtor,
        pay_voucher: payVoucher,
        cash,
        bank,
        smp,
        debtor,
      });
    }

    return {
      bg_type_id: bgTypeId,
      budget_type: budgetType?.budgetType ?? '',
      carry_forward: carryForward,
      opening,
      revenue,
      expenses,
      balance: cash + bank + smp,
      transactions: processed,
    };
  }

  /**
   * รายงานการรับ-จ่ายเงินรายได้สถานศึกษา (form-030) แบบจัดหมวดอัตโนมัติ
   *  - รายรับ: จัดหมวดจากข้อความรายการ (heuristic)
   *  - รายจ่าย: จัดหมวดจาก request_withdraw.expense_type (แม่นยำ)
   */
  async getSchoolRevenueReport(
    scId: number,
    syId: number,
    _year: string,
    bgTypeId: number,
  ) {
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });
    const openingByType = await this.loadOpeningByType(scId, syId);
    const opening = openingByType.get(bgTypeId) ?? 0;

    const fts = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere(syId ? 'ft.sy_id = :syId' : '1=1', { syId })
      .andWhere('ft.bg_type_id = :bgTypeId', { bgTypeId })
      // กัน "นำฝาก" (transfer ภายใน) ปนยอดรับ/จ่าย form-030
      .andWhere("(ft.register_kind IS NULL OR ft.register_kind <> 'deposit')")
      .getMany();

    const income: Record<string, number> = {
      raachapasadu: 0,
      fine_study: 0,
      fine_contract: 0,
      donation_clear: 0,
      donation_unclear: 0,
      edu_support: 0,
      other: 0,
    };
    const expense: Record<string, number> = {
      personnel_wage: 0,
      operate_remuneration: 0,
      operate_service: 0,
      operate_material: 0,
      operate_utility: 0,
      invest_durable: 0,
      invest_land: 0,
      subsidy: 0,
      other: 0,
    };

    // batch-load รายละเอียดรายรับ + ประเภทรายจ่าย
    const prIds = [
      ...new Set(
        fts.filter((f) => f.type === 1 && f.prId > 0).map((f) => f.prId),
      ),
    ];
    const rwIds = [
      ...new Set(
        fts.filter((f) => f.type === -1 && f.rwId > 0).map((f) => f.rwId),
      ),
    ];
    const detailByPr = new Map<number, string>();
    if (prIds.length) {
      const rds = await this.plnReceiveDetailRepository.find({
        where: { prId: In(prIds), del: 0 },
      });
      for (const d of rds) {
        if (!detailByPr.has(d.prId)) detailByPr.set(d.prId, d.prdDetail ?? '');
      }
    }
    const expTypeByRw = new Map<number, number | null>();
    if (rwIds.length) {
      const ws = await this.requestWithdrawRepository.find({
        where: { rwId: In(rwIds) },
      });
      for (const w of ws) expTypeByRw.set(w.rwId, w.expenseType ?? null);
    }

    let totalReceive = 0;
    let totalPay = 0;
    for (const f of fts) {
      const amt = Number(f.amount) || 0;
      if (f.type === 1) {
        totalReceive += amt;
        income[classifyRevenueIncome(detailByPr.get(f.prId) ?? '')] += amt;
      } else if (f.type === -1) {
        totalPay += amt;
        expense[classifyRevenueExpense(expTypeByRw.get(f.rwId) ?? null)] += amt;
      }
    }

    return {
      bg_type_id: bgTypeId,
      budget_type: budgetType?.budgetType ?? '',
      opening,
      income,
      total_receive: totalReceive,
      expense,
      total_pay: totalPay,
      carry_forward: opening + totalReceive - totalPay, // ยอดยกไป
    };
  }
}
