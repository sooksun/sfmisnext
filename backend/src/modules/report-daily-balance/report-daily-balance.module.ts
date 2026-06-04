import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportDailyBalanceController } from './report-daily-balance.controller';
import { ReportDailyBalanceService } from './report-daily-balance.service';
import { FinancialTransactions } from './entities/financial-transactions.entity';
import { CashReserveLimit } from './entities/cash-reserve-limit.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialTransactions,
      CashReserveLimit,
      PlnReceive,
      PlnReceiveDetail,
      RequestWithdraw,
      BudgetIncomeType,
      OpeningBalance,
      SmpDepositEntry,
    ]),
  ],
  controllers: [ReportDailyBalanceController],
  providers: [ReportDailyBalanceService],
  exports: [ReportDailyBalanceService],
})
export class ReportDailyBalanceModule {}
