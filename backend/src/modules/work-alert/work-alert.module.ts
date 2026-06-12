import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkAlertController } from './work-alert.controller';
import { WorkAlertService } from './work-alert.service';
import { DeadlineEngineService } from './deadline-engine.service';
import { DailyCheckService } from './daily-check.service';
import { WorkAlertCron } from './work-alert.cron';
import { WorkAlert } from './entities/work-alert.entity';
import { School } from '../school/entities/school.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { CashReserveLimit } from '../report-daily-balance/entities/cash-reserve-limit.entity';
// ── source entities (read-only) สำหรับ smart-resolve ──
import { WithholdingCertificate } from '../registration-certificate/entities/withholding-certificate.entity';
import { GovRevenueEntry } from '../gov-revenue/entities/gov-revenue-entry.entity';
import { MonthlySubmission } from '../monthly-submission/entities/monthly-submission.entity';
import { BankReconciliation } from '../bank-reconciliation/entities/bank-reconciliation.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { ReceiptBook } from '../receipt-book/entities/receipt-book.entity';
import { FinancialAssessment } from '../financial-assessment/entities/financial-assessment.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { DepositRegister } from '../deposit-register/entities/deposit-register.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkAlert,
      School,
      WithholdingCertificate,
      GovRevenueEntry,
      MonthlySubmission,
      BankReconciliation,
      FiscalYearBalance,
      ReceiptBook,
      FinancialAssessment,
      LoanAgreement,
      DepositRegister,
      FinancialTransactions,
      FinancialAuditLog,
      CashReserveLimit,
    ]),
  ],
  controllers: [WorkAlertController],
  providers: [
    WorkAlertService,
    DeadlineEngineService,
    DailyCheckService,
    WorkAlertCron,
  ],
  exports: [WorkAlertService],
})
export class WorkAlertModule {}
