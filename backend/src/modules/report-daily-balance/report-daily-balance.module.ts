import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportDailyBalanceController } from './report-daily-balance.controller';
import { ReportDailyBalanceService } from './report-daily-balance.service';
import { FinancialTransactions } from './entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialTransactions,
      PlnReceive,
      PlnReceiveDetail,
      RequestWithdraw,
      BudgetIncomeType,
    ]),
  ],
  controllers: [ReportDailyBalanceController],
  providers: [ReportDailyBalanceService],
  exports: [ReportDailyBalanceService],
})
export class ReportDailyBalanceModule {}
