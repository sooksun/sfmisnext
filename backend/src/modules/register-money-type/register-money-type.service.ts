import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

export interface RegisterTransaction {
  ft_id: number;
  type: number;
  amount: number;
  create_date: Date | null;
  update_date: Date | null;
  receive_general: Record<string, unknown> | null;
  receive: Record<string, unknown> | null;
  pay: Record<string, unknown> | null;
  receive_money_type: number | null;
  balance: number;
  cash: number;
  receive_bank: number;
}

@Injectable()
export class RegisterMoneyTypeService {
  private readonly logger = new Logger(RegisterMoneyTypeService.name);

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
  ) {}

  async loadBudgetType() {
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      budget_borrow_type: type.budgetBorrowType, // Frontend needs this for template selection
    }));
  }

  async loadRegisterControlMoneyType(
    bgTypeId: number,
    scId: number,
    syId: number,
    year: string,
  ) {
    // Load financial transactions for this budget type
    const transactions = await this.financialTransactionsRepository
      .createQueryBuilder('ft')
      .where('ft.sc_id = :scId', { scId })
      .andWhere('ft.del = :del', { del: '0' })
      .andWhere('ft.bg_type_id = :bgTypeId', { bgTypeId })
      .orderBy('ft.create_date', 'ASC')
      .addOrderBy('ft.ft_id', 'ASC')
      .getMany();

    // Get budget type name
    const budgetType = await this.budgetIncomeTypeRepository.findOne({
      where: { bgTypeId },
    });

    // ── ยอดยกมาต้นปี (opening_balance) ของประเภทเงินนี้ ─────────────────────
    // money_type_id = bg_type_id ; storage_type 1=เงินสด 2=ธนาคาร 3=ฝากสพป.
    const openingRows = await this.openingBalanceRepository.find({
      where: syId
        ? { scId, syId, moneyTypeId: bgTypeId, del: 0 }
        : { scId, moneyTypeId: bgTypeId, del: 0 },
    });
    const openingCash = openingRows
      .filter((o) => o.storageType === 1)
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const openingBank = openingRows
      .filter((o) => o.storageType === 2 || o.storageType === 3)
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const openingTotal = openingCash + openingBank;

    // Return empty data if no transactions (แต่ยังแสดงยอดยกมา ถ้ามี)
    if (transactions.length === 0) {
      this.logger.debug(
        `No transactions found for bgTypeId: ${bgTypeId}, scId: ${scId}`,
      );
      return {
        bg_type_id: bgTypeId,
        sc_id: scId,
        sy_id: syId,
        year,
        carry_forward: openingTotal,
        data: [
          {
            budget_type: budgetType?.budgetType || '',
            transaction: [],
          },
        ],
      };
    }

    // Process transactions — เริ่มจากยอดยกมาต้นปี
    let balance = openingTotal;
    let cashBalance = openingCash;
    let bankBalance = openingBank;
    const processedTransactions: RegisterTransaction[] = [];

    for (const trans of transactions) {
      let receiveDetail: Record<string, unknown> | null = null;
      let payDetail: Record<string, unknown> | null = null;
      let receiveMoneyType: number | null = null;

      if (trans.type === 1 && trans.prId > 0) {
        // Income - load receive and detail
        const receive = await this.plnReceiveRepository.findOne({
          where: { prId: trans.prId },
        });
        if (receive) {
          receiveMoneyType = receive.receiveMoneyType;
          // Load receive detail for prd_detail
          const receiveDetails = await this.plnReceiveDetailRepository.find({
            where: { prId: trans.prId, del: 0 },
          });
          const prdDetail =
            receiveDetails.length > 0 ? receiveDetails[0].prdDetail : null;

          receiveDetail = {
            pr_no: receive.prNo,
            receive_date: receive.receiveDate,
            receive_money_type: receive.receiveMoneyType,
            prd_detail: prdDetail,
            ft_id: trans.ftId, // Frontend expects ft_id
          };
        }
      } else if (trans.type === -1 && trans.rwId > 0) {
        // Expense - load request withdraw
        const requestWithdraw = await this.requestWithdrawRepository.findOne({
          where: { rwId: trans.rwId },
        });
        if (requestWithdraw) {
          payDetail = {
            no_doc: requestWithdraw.noDoc,
            date_request: requestWithdraw.dateRequest,
            amount: trans.amount,
            detail: requestWithdraw.detail,
            check_no_doc: requestWithdraw.checkNoDoc,
            ft_id: trans.ftId, // Frontend expects ft_id
          };
        }
      }

      if (trans.type === 1) {
        balance += trans.amount;
        // Calculate cash/bank balance based on receive_money_type
        // 1 = เช็ค, 2 = เงินสด, 3 = เงินฝากธนาคาร
        if (receiveMoneyType === 2) {
          cashBalance += trans.amount;
        } else if (receiveMoneyType === 1 || receiveMoneyType === 3) {
          bankBalance += trans.amount;
        }
      } else if (trans.type === -1) {
        balance -= trans.amount;
        bankBalance -= trans.amount; // Payment usually from bank
      }

      processedTransactions.push({
        ft_id: trans.ftId,
        type: trans.type,
        amount: trans.amount,
        create_date: trans.createDate,
        update_date: trans.updateDate || trans.createDate, // Frontend expects update_date
        receive_general: receiveDetail, // Frontend expects receive_general
        receive: receiveDetail,
        pay: payDetail,
        receive_money_type: receiveMoneyType, // Add receive_money_type for frontend
        balance,
        cash: cashBalance,
        receive_bank: bankBalance,
      });
    }

    // Calculate totals
    const totalIncome = processedTransactions
      .filter((t) => t.type === 1)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = processedTransactions
      .filter((t) => t.type === -1)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCash = processedTransactions
      .filter((t) => t.receive_money_type === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDeposit = processedTransactions
      .filter(
        (t) =>
          t.receive_money_type === null ||
          t.receive_money_type === 1 ||
          t.receive_money_type === 3,
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      bg_type_id: bgTypeId,
      sc_id: scId,
      sy_id: syId,
      year,
      carry_forward: openingTotal, // ยอดยกมาต้นปี
      revenue: totalIncome, // Frontend expects revenue
      expenses: totalExpense, // Frontend expects expenses
      cash: totalCash, // Frontend expects cash
      deposit: totalDeposit, // Frontend expects deposit
      total: totalIncome - totalExpense, // Frontend expects total
      data: [
        {
          budget_type: budgetType?.budgetType || '',
          transaction: processedTransactions,
        },
      ],
    };
  }
}
