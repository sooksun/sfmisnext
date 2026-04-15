import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterMoneyTypeController } from './register-money-type.controller';
import { RegisterMoneyTypeService } from './register-money-type.service';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetIncomeType,
      FinancialTransactions,
      PlnReceive,
      PlnReceiveDetail,
      RequestWithdraw,
    ]),
  ],
  controllers: [RegisterMoneyTypeController],
  providers: [RegisterMoneyTypeService],
  exports: [RegisterMoneyTypeService],
})
export class RegisterMoneyTypeModule {}
