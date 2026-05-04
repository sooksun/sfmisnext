import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';

export interface UnifiedSummaryItem {
  bg_type_id: number;
  budget_type: string;
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
  ) {}

  async getSummary(
    scId: number,
    _syId: number,
    _year: string,
  ): Promise<UnifiedSummaryItem[]> {
    // Load all active budget types
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    const results: UnifiedSummaryItem[] = [];

    for (const bt of budgetTypes) {
      const rows = await this.financialTransactionsRepository
        .createQueryBuilder('ft')
        .select('ft.type', 'type')
        .addSelect('SUM(ft.amount)', 'total')
        .addSelect('COUNT(ft.ft_id)', 'cnt')
        .where('ft.sc_id = :scId', { scId })
        .andWhere('ft.del = :del', { del: '0' })
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

      // Only include types that have transactions
      if (entry_count > 0) {
        results.push({
          bg_type_id: bt.bgTypeId,
          budget_type: bt.budgetType,
          revenue,
          expenses,
          balance: revenue - expenses,
          entry_count,
        });
      }
    }

    return results;
  }

  async getRegisterDetail(
    bgTypeId: number,
    scId: number,
    _syId: number,
    _year: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    bg_type_id: number;
    budget_type: string;
    revenue: number;
    expenses: number;
    balance: number;
    transactions: UnifiedTransactionRow[];
  }> {
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });

    const qb = this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
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

    let balance = 0;
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
          docNo = receive.prNo;
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
      revenue,
      expenses,
      balance,
      transactions: processed,
    };
  }
}
