import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundBorrowingController } from './fund-borrowing.controller';
import { FundBorrowingService } from './fund-borrowing.service';
import { FundBorrowing } from './entities/fund-borrowing.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FundBorrowing,
      FinancialTransactions,
      OpeningBalance,
      BudgetIncomeType,
    ]),
  ],
  controllers: [FundBorrowingController],
  providers: [FundBorrowingService],
  exports: [FundBorrowingService],
})
export class FundBorrowingModule {}
