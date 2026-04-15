import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { TbExpenses } from './entities/tb-expenses.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnBudgetCategory,
      PlnBudgetCategoryDetail,
      TbEstimateAcadyear,
      MasterBudgetCategory,
      BudgetIncomeType,
      TbExpenses,
    ]),
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
