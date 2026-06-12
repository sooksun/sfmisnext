import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAssessmentController } from './financial-assessment.controller';
import { FinancialAssessmentService } from './financial-assessment.service';
import { RuleEngineService } from './rules/rule-engine.service';
import { FinancialAssessment } from './entities/financial-assessment.entity';
import { FinancialAssessmentItem } from './entities/financial-assessment-item.entity';
// ── source entities (read-only) สำหรับ Rule Engine ──
import { GovRevenueEntry } from '../gov-revenue/entities/gov-revenue-entry.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { BudgetRequest } from '../budget-request/entities/budget-request.entity';
import { BankLedgerEntry } from '../bank-ledger/entities/bank-ledger-entry.entity';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';
import { DepositRegister } from '../deposit-register/entities/deposit-register.entity';
import { CashKeepingCommittee } from '../cash-committee/entities/cash-keeping-committee.entity';
import { BankReconciliation } from '../bank-reconciliation/entities/bank-reconciliation.entity';
import { MonthlySubmission } from '../monthly-submission/entities/monthly-submission.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';
import { Project } from '../project/entities/project.entity';
import { Receipt } from '../receipt/entities/receipt.entity';
import { WithholdingCertificate } from '../registration-certificate/entities/withholding-certificate.entity';
import { CashReserveLimit } from '../report-daily-balance/entities/cash-reserve-limit.entity';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { FinanceAnnualAttestation } from './entities/finance-annual-attestation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialAssessment,
      FinancialAssessmentItem,
      FinanceAnnualAttestation,
      // read-only source tables
      GovRevenueEntry,
      FinancialTransactions,
      BudgetRequest,
      BankLedgerEntry,
      SmpDepositEntry,
      DepositRegister,
      CashKeepingCommittee,
      BankReconciliation,
      MonthlySubmission,
      FinancialAuditLog,
      LoanAgreement,
      ReceiptBook,
      Project,
      Receipt,
      WithholdingCertificate,
      CashReserveLimit,
      CashKeepingRecord,
      RequestWithdraw,
      PlnReceive,
      BudgetIncomeTypeSchool,
      FiscalYearBalance,
    ]),
  ],
  controllers: [FinancialAssessmentController],
  providers: [FinancialAssessmentService, RuleEngineService],
  exports: [FinancialAssessmentService],
})
export class FinancialAssessmentModule {}
