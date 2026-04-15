import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FinancialTransactions } from './entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class ReportDailyBalanceService {
  constructor(
    @InjectRepository(FinancialTransactions)
    private readonly financialTransactionsRepository: Repository<FinancialTransactions>,
    @InjectRepository(PlnReceive)
    private readonly plnReceiveRepository: Repository<PlnReceive>,
    @InjectRepository(PlnReceiveDetail)
    private readonly plnReceiveDetailRepository: Repository<PlnReceiveDetail>,
    @InjectRepository(RequestWithdraw)
    private readonly requestWithdrawRepository: Repository<RequestWithdraw>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  async loadDailyBalance(scId: number, date: string, _syId: number) {
    // Parse date string to Date object
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Load financial transactions for the date
    const transactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.create_date >= :startDate', { startDate: startOfDay })
      .andWhere('ft.create_date <= :endDate', { endDate: endOfDay })
      .orderBy('ft.ft_id', 'ASC')
      .getMany();

    // Calculate balance by budget type
    const balanceByType: Record<
      number,
      { income: number; expense: number; balance: number }
    > = {};

    // Initialize balance from previous transactions (before target date)
    const previousTransactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.create_date < :startDate', { startDate: startOfDay })
      .getMany();

    previousTransactions.forEach((trans) => {
      if (!balanceByType[trans.bgTypeId]) {
        balanceByType[trans.bgTypeId] = { income: 0, expense: 0, balance: 0 };
      }
      if (trans.type === 1) {
        balanceByType[trans.bgTypeId].income += trans.amount;
        balanceByType[trans.bgTypeId].balance += trans.amount;
      } else if (trans.type === -1) {
        balanceByType[trans.bgTypeId].expense += trans.amount;
        balanceByType[trans.bgTypeId].balance -= trans.amount;
      }
    });

    // Process transactions for the target date
    const dailyTransactions: any[] = [];

    for (const trans of transactions) {
      if (!balanceByType[trans.bgTypeId]) {
        balanceByType[trans.bgTypeId] = { income: 0, expense: 0, balance: 0 };
      }

      let detail: Record<string, unknown> | null = null;

      if (trans.type === 1 && trans.prId > 0) {
        // Income transaction - load receive detail
        const receive = await this.plnReceiveRepository.findOne({
          where: { prId: trans.prId },
        });
        const receiveDetail = await this.plnReceiveDetailRepository.findOne({
          where: { prdId: trans.prdId },
        });

        if (receive && receiveDetail) {
          detail = {
            type: 'receive',
            pr_no: receive.prNo,
            prd_detail: receiveDetail.prdDetail,
            amount: trans.amount,
          };
        }
      } else if (trans.type === -1 && trans.rwId > 0) {
        // Expense transaction - load request withdraw
        const requestWithdraw = await this.requestWithdrawRepository.findOne({
          where: { rwId: trans.rwId },
        });

        if (requestWithdraw) {
          detail = {
            type: 'withdraw',
            no_doc: requestWithdraw.noDoc,
            detail: requestWithdraw.detail,
            amount: trans.amount,
          };
        }
      }

      if (trans.type === 1) {
        balanceByType[trans.bgTypeId].income += trans.amount;
        balanceByType[trans.bgTypeId].balance += trans.amount;
      } else if (trans.type === -1) {
        balanceByType[trans.bgTypeId].expense += trans.amount;
        balanceByType[trans.bgTypeId].balance -= trans.amount;
      }

      dailyTransactions.push({
        ft_id: trans.ftId,
        type: trans.type,
        bg_type_id: trans.bgTypeId,
        amount: trans.amount,
        create_date: trans.createDate,
        detail,
        balance: balanceByType[trans.bgTypeId].balance,
      });
    }

    // Load budget type names
    const bgTypeIds = Object.keys(balanceByType).map((id) => parseInt(id));
    const budgetTypes =
      bgTypeIds.length > 0
        ? await this.budgetIncomeTypeRepository.find({
            where: { bgTypeId: In(bgTypeIds), del: 0 },
          })
        : [];

    const budgetTypeMap = new Map<number, string>();
    budgetTypes.forEach((bt) => budgetTypeMap.set(bt.bgTypeId, bt.budgetType));

    // Format summary for frontend
    const summary = Object.keys(balanceByType).map((bgTypeId) => {
      const typeId = parseInt(bgTypeId);
      const balance = balanceByType[typeId];
      return {
        bg_type_id: typeId,
        budget_type: budgetTypeMap.get(typeId) || `ประเภท ${typeId}`,
        income: balance.income,
        expense: balance.expense,
        balance: balance.balance,
        total_row: balance.balance, // สำหรับแสดงในตาราง
      };
    });

    // Calculate total
    const total = summary.reduce((sum, item) => sum + item.total_row, 0);

    return {
      date,
      daily: date,
      transactions: dailyTransactions,
      summary: summary,
      data: summary, // สำหรับ frontend ที่ใช้ daily_balace.data
      total: total,
    };
  }
}
