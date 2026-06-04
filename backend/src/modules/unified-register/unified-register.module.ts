import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedRegisterController } from './unified-register.controller';
import { UnifiedRegisterService } from './unified-register.service';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { Receipt } from '../receipt/entities/receipt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetIncomeType,
      FinancialTransactions,
      PlnReceive,
      PlnReceiveDetail,
      RequestWithdraw,
      OpeningBalance,
      Receipt,
    ]),
  ],
  controllers: [UnifiedRegisterController],
  providers: [UnifiedRegisterService],
  exports: [UnifiedRegisterService],
})
export class UnifiedRegisterModule {}
