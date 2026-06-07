import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardTypoController } from './dashboard-typo.controller';
import { DashboardService } from './dashboard.service';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { School } from '../school/entities/school.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { TbEstimateAcadyear } from '../budget/entities/tb-estimate-acadyear.entity';
import { GovRevenueModule } from '../gov-revenue/gov-revenue.module';
import { RegisterMoneyTypeModule } from '../register-money-type/register-money-type.module';
import { LoanAgreementModule } from '../loan-agreement/loan-agreement.module';
import { ReportDailyBalanceModule } from '../report-daily-balance/report-daily-balance.module';
import { CashKeepingModule } from '../cash-keeping/cash-keeping.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SchoolYear,
      School,
      FinancialTransactions,
      BudgetIncomeType,
      TbEstimateAcadyear,
    ]),
    GovRevenueModule,
    RegisterMoneyTypeModule,
    LoanAgreementModule,
    ReportDailyBalanceModule,
    CashKeepingModule,
  ],
  controllers: [DashboardController, DashboardTypoController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
