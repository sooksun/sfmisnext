import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanPrevBalanceController } from './plan-prev-balance.controller';
import { PlanPrevBalanceService } from './plan-prev-balance.service';
import { PlanPrevBalance } from './entities/plan-prev-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';

@Module({
  imports: [
    // FundBalanceService เป็น @Global — inject ได้โดยไม่ต้อง import ที่นี่
    TypeOrmModule.forFeature([
      PlanPrevBalance,
      FiscalYearBalance,
      BudgetIncomeType,
      SchoolYear,
    ]),
  ],
  controllers: [PlanPrevBalanceController],
  providers: [PlanPrevBalanceService],
  exports: [PlanPrevBalanceService],
})
export class PlanPrevBalanceModule {}
