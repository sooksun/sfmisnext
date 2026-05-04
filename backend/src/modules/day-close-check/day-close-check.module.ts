import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DayCloseCheckController } from './day-close-check.controller';
import { DayCloseCheckService } from './day-close-check.service';
import { CashKeepingRecord } from '../cash-keeping/entities/cash-keeping-record.entity';
import { FinancialAuditLog } from '../financial-audit/entities/financial-audit-log.entity';
import { LoanAgreement } from '../loan-agreement/entities/loan-agreement.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashKeepingRecord,
      FinancialAuditLog,
      LoanAgreement,
      RequestWithdraw,
      PlnReceive,
      FinancialTransactions,
    ]),
  ],
  controllers: [DayCloseCheckController],
  providers: [DayCloseCheckService],
  exports: [DayCloseCheckService],
})
export class DayCloseCheckModule {}
