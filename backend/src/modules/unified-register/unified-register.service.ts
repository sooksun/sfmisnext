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

export interface UnifiedTransactionRow {
  ft_id: number;
  type: number;
  amount: number;
  create_date: Date | null;
  doc_no: string | null;
  detail: string | null;
  balance: number;
  receive_money_type: number | null;
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
  ) {}

  /** ยอดยกมาต้นปี รวมต่อ money_type (กรองตาม sy_id ถ้ามี) */
  private async loadOpeningByType(
    scId: number,
    syId: number,
  ): Promise<Map<number, number>> {
    const rows = await this.openingBalanceRepository.find({
      where: syId ? { scId, syId, del: 0 } : { scId, del: 0 },
    });
    const map = new Map<number, number>();
    for (const ob of rows) {
      map.set(
        ob.moneyTypeId,
        (map.get(ob.moneyTypeId) ?? 0) + (Number(ob.amount) || 0),
      );
    }
    return map;
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
    revenue: number;
    expenses: number;
    balance: number;
    transactions: UnifiedTransactionRow[];
  }> {
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });

    // ยอดยกมาต้นปีของประเภทนี้ (ไม่ขึ้นกับ fromDate — เป็นยอดตั้งต้น)
    const openingByType = await this.loadOpeningByType(scId, syId);
    const carryForward = openingByType.get(bgTypeId) ?? 0;

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

    let balance = carryForward; // เริ่มจากยอดยกมาต้นปี
    let revenue = 0;
    let expenses = 0;
    const processed: UnifiedTransactionRow[] = [];

    for (const trans of transactions) {
      let docNo: string | null = null;
      let detail: string | null = null;
      let receiveMoneyType: number | null = null;

      if (trans.type === 1 && trans.prId > 0) {
        const receive = await this.plnReceiveRepository.findOne({
          where: { prId: trans.prId },
        });
        if (receive) {
          receiveMoneyType = receive.receiveMoneyType;
          // เลขที่ใบเสร็จรับเงินแบบ "บร.{เล่มที่}/{เลขที่}" จากตาราง receipt
          const receipt = await this.receiptRepository.findOne({
            where: { prId: String(trans.prId), status: '1' },
            order: { rId: 'DESC' },
          });
          docNo =
            formatReceiptNo(receipt?.bookNo, receipt?.receiptNo) ??
            receive.prNo;
          const receiveDetails = await this.plnReceiveDetailRepository.find({
            where: { prId: trans.prId, del: 0 },
          });
          detail =
            receiveDetails.length > 0 ? receiveDetails[0].prdDetail : null;
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
        balance += trans.amount;
        revenue += trans.amount;
      } else if (trans.type === -1) {
        balance -= trans.amount;
        expenses += trans.amount;
      }

      processed.push({
        ft_id: trans.ftId,
        type: trans.type,
        amount: trans.amount,
        create_date: trans.createDate,
        doc_no: docNo,
        detail,
        balance,
        receive_money_type: receiveMoneyType,
      });
    }

    return {
      bg_type_id: bgTypeId,
      budget_type: budgetType?.budgetType ?? '',
      carry_forward: carryForward,
      revenue,
      expenses,
      balance,
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
      ...new Set(fts.filter((f) => f.type === 1 && f.prId > 0).map((f) => f.prId)),
    ];
    const rwIds = [
      ...new Set(fts.filter((f) => f.type === -1 && f.rwId > 0).map((f) => f.rwId)),
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
