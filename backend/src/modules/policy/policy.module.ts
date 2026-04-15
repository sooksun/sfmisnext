import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from './entities/budget-income-type.entity';
import { PlnRealBudget } from './entities/pln-real-budget.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SchoolYear,
      Partner,
      BudgetIncomeType,
      PlnRealBudget,
    ]),
  ],
  controllers: [PolicyController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
