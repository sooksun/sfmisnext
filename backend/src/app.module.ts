import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SchoolYearModule } from './modules/school-year/school-year.module';
import { SchoolModule } from './modules/school/school.module';
import { GeneralDbModule } from './modules/general-db/general-db.module';
import { PolicyModule } from './modules/policy/policy.module';
import { StudentModule } from './modules/student/student.module';
import { BudgetModule } from './modules/budget/budget.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ProjectModule } from './modules/project/project.module';
import { ProjectApproveModule } from './modules/project-approve/project-approve.module';
import { ProcurementPlanModule } from './modules/procurement-plan/procurement-plan.module';
import { ReceiveModule } from './modules/receive/receive.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { CheckModule } from './modules/check/check.module';
import { BankModule } from './modules/bank/bank.module';
import { SupplieModule } from './modules/supplie/supplie.module';
import { AuditCommitteeModule } from './modules/audit-committee/audit-committee.module';
import { ReportDailyBalanceModule } from './modules/report-daily-balance/report-daily-balance.module';
import { ReportCheckControlModule } from './modules/report-check-control/report-check-control.module';
import { ReportBookbankModule } from './modules/report-bookbank/report-bookbank.module';
import { RegisterMoneyTypeModule } from './modules/register-money-type/register-money-type.module';
import { RegistrationCertificateModule } from './modules/registration-certificate/registration-certificate.module';
import { HealthModule } from './modules/health/health.module';
import { FinancialAuditModule } from './modules/financial-audit/financial-audit.module';
import { GovRevenueModule } from './modules/gov-revenue/gov-revenue.module';
import { LoanAgreementModule } from './modules/loan-agreement/loan-agreement.module';
import { TravelReimbursementModule } from './modules/travel-reimbursement/travel-reimbursement.module';
import { CashKeepingModule } from './modules/cash-keeping/cash-keeping.module';
import { SmpDepositModule } from './modules/smp-deposit/smp-deposit.module';
import { BankLedgerModule } from './modules/bank-ledger/bank-ledger.module';
import { FiscalYearBalanceModule } from './modules/fiscal-year-balance/fiscal-year-balance.module';
import { BankReconciliationModule } from './modules/bank-reconciliation/bank-reconciliation.module';
import { MonthlySubmissionModule } from './modules/monthly-submission/monthly-submission.module';
import { ReceiptBookModule } from './modules/receipt-book/receipt-book.module';
import { DocCounterModule } from './modules/doc-counter/doc-counter.module';
import { YearEndReportModule } from './modules/year-end-report/year-end-report.module';
import { UnifiedRegisterModule } from './modules/unified-register/unified-register.module';
import { GlobalSearchModule } from './modules/global-search/global-search.module';
import { DayCloseCheckModule } from './modules/day-close-check/day-close-check.module';
import { AiModule } from './modules/ai/ai.module';
import { DeleteLogModule } from './modules/delete-log/delete-log.module';
import { BudgetRequestModule } from './modules/budget-request/budget-request.module';
import { CashCommitteeModule } from './modules/cash-committee/cash-committee.module';
import { DepositRegisterModule } from './modules/deposit-register/deposit-register.module';
import { OpeningBalanceModule } from './modules/opening-balance/opening-balance.module';
import { PlanPrevBalanceModule } from './modules/plan-prev-balance/plan-prev-balance.module';
import { FixedAssetModule } from './modules/fixed-asset/fixed-asset.module';
import { ContractSecurityModule } from './modules/contract-security/contract-security.module';
import { BudgetTransferModule } from './modules/budget-transfer/budget-transfer.module';
import { ProjectFollowupModule } from './modules/project-followup/project-followup.module';
import { EgpAnnouncementModule } from './modules/egp-announcement/egp-announcement.module';
import { FinancialAssessmentModule } from './modules/financial-assessment/financial-assessment.module';
import { WorkAlertModule } from './modules/work-alert/work-alert.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { AnomalyModule } from './modules/anomaly/anomaly.module';
import { AiAssistModule } from './modules/ai-assist/ai-assist.module';
import { InvoicePreAuditModule } from './modules/invoice-pre-audit/invoice-pre-audit.module';
import { PlanTraceModule } from './modules/plan-trace/plan-trace.module';
import { IntraBankTransferModule } from './modules/intra-bank-transfer/intra-bank-transfer.module';
import { SupplieRequestModule } from './modules/supplie-request/supplie-request.module';
import { SchoolResetModule } from './modules/school-reset/school-reset.module';
import { RegulatoryConfigModule } from './modules/regulatory-config/regulatory-config.module';
import { CrossDomainGuardModule } from './modules/cross-domain-guard/cross-domain-guard.module';
import { FundBorrowingModule } from './modules/fund-borrowing/fund-borrowing.module';
import { FundBalanceModule } from './modules/fund-balance/fund-balance.module';
import { AttachmentModule } from './modules/attachment/attachment.module';

@Module({
  imports: [
    ...(process.env.SENTRY_DSN ? [SentryModule.forRoot()] : []),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60000,
        limit: 5,
      },
      {
        // AI endpoints — กัน Gemini cost spike
        name: 'ai',
        ttl: 60000,
        limit: 30,
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'sfmisystem',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        migrationsRun: false,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    AdminModule,
    DashboardModule,
    SchoolYearModule,
    SchoolModule,
    GeneralDbModule,
    PolicyModule,
    StudentModule,
    BudgetModule,
    SettingsModule,
    ProjectModule,
    ProjectApproveModule,
    ProcurementPlanModule,
    ReceiveModule,
    ReceiptModule,
    InvoiceModule,
    CheckModule,
    BankModule,
    SupplieModule,
    AuditCommitteeModule,
    ReportDailyBalanceModule,
    ReportCheckControlModule,
    ReportBookbankModule,
    RegisterMoneyTypeModule,
    RegistrationCertificateModule,
    HealthModule,
    FinancialAuditModule,
    GovRevenueModule,
    LoanAgreementModule,
    TravelReimbursementModule,
    CashKeepingModule,
    SmpDepositModule,
    BankLedgerModule,
    FiscalYearBalanceModule,
    BankReconciliationModule,
    MonthlySubmissionModule,
    ReceiptBookModule,
    DocCounterModule,
    YearEndReportModule,
    UnifiedRegisterModule,
    GlobalSearchModule,
    DayCloseCheckModule,
    AiModule,
    DeleteLogModule,
    BudgetRequestModule,
    CashCommitteeModule,
    DepositRegisterModule,
    OpeningBalanceModule,
    PlanPrevBalanceModule,
    FixedAssetModule,
    ContractSecurityModule,
    BudgetTransferModule,
    ProjectFollowupModule,
    EgpAnnouncementModule,
    FinancialAssessmentModule,
    WorkAlertModule,
    ActivityLogModule,
    AnomalyModule,
    AiAssistModule,
    InvoicePreAuditModule,
    PlanTraceModule,
    IntraBankTransferModule,
    SchoolResetModule,
    SupplieRequestModule,
    RegulatoryConfigModule,
    FundBorrowingModule,
    FundBalanceModule,
    CrossDomainGuardModule,
    AttachmentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Sentry exception filter — captures unhandled exceptions when SENTRY_DSN is set
    ...(process.env.SENTRY_DSN
      ? [{ provide: APP_FILTER, useClass: SentryGlobalFilter }]
      : []),
    // Global JWT guard — ทุก endpoint ต้อง authenticate ยกเว้นที่มี @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
