import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Explicit entity list (no glob) — กัน ghost .js ใน dist/ ที่ค้างจาก
// rename/delete แล้ว TypeORM โหลดมาด้วยและทำให้ schema/migration ผิด
// (เห็น nest-cli.json: deleteOutDir=false)
import { Admin } from './modules/admin/entities/admin.entity';
import { MasterLevel } from './modules/admin/entities/master-level.entity';
import { BankLedgerEntry } from './modules/bank-ledger/entities/bank-ledger-entry.entity';
import { BankReconciliation } from './modules/bank-reconciliation/entities/bank-reconciliation.entity';
import { BankReconciliationItem } from './modules/bank-reconciliation/entities/bank-reconciliation-item.entity';
import { BankDb } from './modules/bank/entities/bank-db.entity';
import { BankAccount } from './modules/bank/entities/bankaccount.entity';
import { BudgetIncomeTypeSchool } from './modules/bank/entities/budget-income-type-school.entity';
import { BudgetRequest } from './modules/budget-request/entities/budget-request.entity';
import { BudgetTransfer } from './modules/budget-transfer/entities/budget-transfer.entity';
import { MasterBudgetCategory } from './modules/budget/entities/master-budget-category.entity';
import { PlnBudgetCategory } from './modules/budget/entities/pln-budget-category.entity';
import { PlnBudgetCategoryDetail } from './modules/budget/entities/pln-budget-category-detail.entity';
import { TbEstimateAcadyear } from './modules/budget/entities/tb-estimate-acadyear.entity';
import { TbExpenses } from './modules/budget/entities/tb-expenses.entity';
import { CashKeepingRecord } from './modules/cash-keeping/entities/cash-keeping-record.entity';
import { CheckReceiveCommittee } from './modules/check/entities/check-receive-committee.entity';
import { ContractPenalty } from './modules/contract-security/entities/contract-penalty.entity';
import { ContractSecurity } from './modules/contract-security/entities/contract-security.entity';
import { DeleteLog } from './modules/delete-log/entities/delete-log.entity';
import { DocumentCounter } from './modules/doc-counter/entities/document-counter.entity';
import { EgpAnnouncement } from './modules/egp-announcement/entities/egp-announcement.entity';
import { FinancialAuditLog } from './modules/financial-audit/entities/financial-audit-log.entity';
import { FiscalYearBalance } from './modules/fiscal-year-balance/entities/fiscal-year-balance.entity';
import { FixedAsset } from './modules/fixed-asset/entities/fixed-asset.entity';
import { FixedAssetDepreciation } from './modules/fixed-asset/entities/fixed-asset-depreciation.entity';
import { MainRegister } from './modules/general-db/entities/main-register.entity';
import { Partner } from './modules/general-db/entities/partner.entity';
import { TypeSupplies } from './modules/general-db/entities/type-supplies.entity';
import { Unit } from './modules/general-db/entities/unit.entity';
import { GovRevenueEntry } from './modules/gov-revenue/entities/gov-revenue-entry.entity';
import { IntraBankTransfer } from './modules/intra-bank-transfer/entities/intra-bank-transfer.entity';
import { InvoicePreAudit } from './modules/invoice-pre-audit/entities/invoice-pre-audit.entity';
import { RequestWithdraw } from './modules/invoice/entities/request-withdraw.entity';
import { LoanAgreement } from './modules/loan-agreement/entities/loan-agreement.entity';
import { LoanReturnEvidence } from './modules/loan-agreement/entities/loan-return-evidence.entity';
import { MonthlySubmission } from './modules/monthly-submission/entities/monthly-submission.entity';
import { OpeningBalance } from './modules/opening-balance/entities/opening-balance.entity';
import { BudgetIncomeType } from './modules/policy/entities/budget-income-type.entity';
import { PlnRealBudget } from './modules/policy/entities/pln-real-budget.entity';
import { PlnProcurementPlan } from './modules/procurement-plan/entities/pln-procurement-plan.entity';
import { PlnProcurementPlanItem } from './modules/procurement-plan/entities/pln-procurement-plan-item.entity';
import { ParcelDetail } from './modules/project-approve/entities/parcel-detail.entity';
import { ParcelOrder } from './modules/project-approve/entities/parcel-order.entity';
import { PlnProjApprove } from './modules/project-approve/entities/pln-proj-approve.entity';
import { ProjectFollowup } from './modules/project-followup/entities/project-followup.entity';
import { Project } from './modules/project/entities/project.entity';
import { ReceiptBook } from './modules/receipt-book/entities/receipt-book.entity';
import { Receipt } from './modules/receipt/entities/receipt.entity';
import { PlnReceive } from './modules/receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from './modules/receive/entities/pln-receive-detail.entity';
import { WithholdingCertificate } from './modules/registration-certificate/entities/withholding-certificate.entity';
import { CashReserveLimit } from './modules/report-daily-balance/entities/cash-reserve-limit.entity';
import { FinancialTransactions } from './modules/report-daily-balance/entities/financial-transactions.entity';
import { SarReport } from './modules/sar-report/entities/sar-report.entity';
import { SchoolYear } from './modules/school-year/entities/school-year.entity';
import { School } from './modules/school/entities/school.entity';
import { MasterCbLevel } from './modules/settings/entities/master-cb-level.entity';
import { MasterMoePolicy } from './modules/settings/entities/master-moe-policy.entity';
import { MasterObecPolicy } from './modules/settings/entities/master-obec-policy.entity';
import { MasterQuickWin } from './modules/settings/entities/master-quick-win.entity';
import { MasterSaoPolicy } from './modules/settings/entities/master-sao-policy.entity';
import { MasterSao } from './modules/settings/entities/master-sao.entity';
import { MasterScPolicy } from './modules/settings/entities/master-sc-policy.entity';
import { SmpDepositEntry } from './modules/smp-deposit/entities/smp-deposit-entry.entity';
import { MasterClassroom } from './modules/student/entities/master-classroom.entity';
import { MasterClassroomBudget } from './modules/student/entities/master-classroom-budget.entity';
import { Student } from './modules/student/entities/student.entity';
import { SubmittingStudentRecords } from './modules/student/entities/submitting-student-records.entity';
import { SupplieRequest } from './modules/supplie-request/entities/supplie-request.entity';
import { SupplieRequestDetail } from './modules/supplie-request/entities/supplie-request-detail.entity';
import { ReceiveParcelDetail } from './modules/supplie/entities/receive-parcel-detail.entity';
import { ReceiveParcelOrder } from './modules/supplie/entities/receive-parcel-order.entity';
import { SupAnnualCheck } from './modules/supplie/entities/sup-annual-check.entity';
import { SupContract } from './modules/supplie/entities/sup-contract.entity';
import { SupDisposal } from './modules/supplie/entities/sup-disposal.entity';
import { SupInspection } from './modules/supplie/entities/sup-inspection.entity';
import { Supplies } from './modules/supplie/entities/supplies.entity';
import { TransactionSupplies } from './modules/supplie/entities/transaction-supplies.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sfmisystem',
  entities: [
    Admin,
    MasterLevel,
    BankLedgerEntry,
    BankReconciliation,
    BankReconciliationItem,
    BankDb,
    BankAccount,
    BudgetIncomeTypeSchool,
    BudgetRequest,
    BudgetTransfer,
    MasterBudgetCategory,
    PlnBudgetCategory,
    PlnBudgetCategoryDetail,
    TbEstimateAcadyear,
    TbExpenses,
    CashKeepingRecord,
    CheckReceiveCommittee,
    ContractPenalty,
    ContractSecurity,
    DeleteLog,
    DocumentCounter,
    EgpAnnouncement,
    FinancialAuditLog,
    FiscalYearBalance,
    FixedAsset,
    FixedAssetDepreciation,
    MainRegister,
    Partner,
    TypeSupplies,
    Unit,
    GovRevenueEntry,
    IntraBankTransfer,
    InvoicePreAudit,
    RequestWithdraw,
    LoanAgreement,
    LoanReturnEvidence,
    MonthlySubmission,
    OpeningBalance,
    BudgetIncomeType,
    PlnRealBudget,
    PlnProcurementPlan,
    PlnProcurementPlanItem,
    ParcelDetail,
    ParcelOrder,
    PlnProjApprove,
    ProjectFollowup,
    Project,
    ReceiptBook,
    Receipt,
    PlnReceive,
    PlnReceiveDetail,
    WithholdingCertificate,
    CashReserveLimit,
    FinancialTransactions,
    SarReport,
    SchoolYear,
    School,
    MasterCbLevel,
    MasterMoePolicy,
    MasterObecPolicy,
    MasterQuickWin,
    MasterSaoPolicy,
    MasterSao,
    MasterScPolicy,
    SmpDepositEntry,
    MasterClassroom,
    MasterClassroomBudget,
    Student,
    SubmittingStudentRecords,
    SupplieRequest,
    SupplieRequestDetail,
    ReceiveParcelDetail,
    ReceiveParcelOrder,
    SupAnnualCheck,
    SupContract,
    SupDisposal,
    SupInspection,
    Supplies,
    TransactionSupplies,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default AppDataSource;
