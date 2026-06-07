import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelReimbursementController } from './travel-reimbursement.controller';
import { TravelReimbursementService } from './travel-reimbursement.service';
import { TravelReimbursement } from './entities/travel-reimbursement.entity';
import { TravelReimbursementTraveler } from './entities/travel-reimbursement-traveler.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TravelReimbursement,
      TravelReimbursementTraveler,
      Admin,
      BudgetIncomeType,
      LoanAgreement,
      FinancialTransactions,
    ]),
  ],
  controllers: [TravelReimbursementController],
  providers: [TravelReimbursementService],
  exports: [TravelReimbursementService],
})
export class TravelReimbursementModule {}
