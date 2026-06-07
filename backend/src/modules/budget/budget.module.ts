import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { PlnBudgetCategory } from './entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './entities/tb-estimate-acadyear.entity';
import { MasterBudgetCategory } from './entities/master-budget-category.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { PlnRealBudget } from '../policy/entities/pln-real-budget.entity';
import { TbExpenses } from './entities/tb-expenses.entity';
import { StudentModule } from '../student/student.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnBudgetCategory,
      PlnBudgetCategoryDetail,
      TbEstimateAcadyear,
      MasterBudgetCategory,
      BudgetIncomeType,
      PlnRealBudget,
      TbExpenses,
    ]),
    // ดึงยอดประมาณการสดจากการคำนวณรายหัว (StudentService.getPerheadTotal)
    StudentModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
