import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportBookbankController } from './report-bookbank.controller';
import { ReportBookbankService } from './report-bookbank.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialTransactions,
      BudgetIncomeTypeSchool,
      PlnReceive,
      RequestWithdraw,
    ]),
  ],
  controllers: [ReportBookbankController],
  providers: [ReportBookbankService],
  exports: [ReportBookbankService],
})
export class ReportBookbankModule {}
