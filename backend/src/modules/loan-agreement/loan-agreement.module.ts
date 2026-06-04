import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanAgreementController } from './loan-agreement.controller';
import { LoanAgreementService } from './loan-agreement.service';
import { LoanAgreement } from './entities/loan-agreement.entity';
import { LoanReturnEvidence } from './entities/loan-return-evidence.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanAgreement,
      LoanReturnEvidence,
      Admin,
      BudgetIncomeType,
      FinancialTransactions,
    ]),
  ],
  controllers: [LoanAgreementController],
  providers: [LoanAgreementService],
  exports: [LoanAgreementService],
})
export class LoanAgreementModule {}
