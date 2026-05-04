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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SchoolYear,
      School,
      FinancialTransactions,
      BudgetIncomeType,
      TbEstimateAcadyear,
    ]),
  ],
  controllers: [DashboardController, DashboardTypoController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
