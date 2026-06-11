import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetRequest } from './entities/budget-request.entity';
import { BudgetExpenseType } from './entities/budget-expense-type.entity';
import { BudgetRequestService } from './budget-request.service';
import { BudgetRequestController } from './budget-request.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BudgetRequest, BudgetExpenseType])],
  controllers: [BudgetRequestController],
  providers: [BudgetRequestService],
})
export class BudgetRequestModule {}
