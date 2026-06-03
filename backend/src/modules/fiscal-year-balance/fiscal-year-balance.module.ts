import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalYearBalanceController } from './fiscal-year-balance.controller';
import { FiscalYearBalanceService } from './fiscal-year-balance.service';
import { FiscalYearBalance } from './entities/fiscal-year-balance.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalYearBalance,
      Admin,
      BudgetIncomeType,
      OpeningBalance,
      SchoolYear,
    ]),
  ],
  controllers: [FiscalYearBalanceController],
  providers: [FiscalYearBalanceService],
  exports: [FiscalYearBalanceService],
})
export class FiscalYearBalanceModule {}
