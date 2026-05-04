import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAuditController } from './financial-audit.controller';
import { FinancialAuditService } from './financial-audit.service';
import { FinancialAuditLog } from './entities/financial-audit-log.entity';
import { Admin } from '../admin/entities/admin.entity';
import { ReportDailyBalanceModule } from '../report-daily-balance/report-daily-balance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialAuditLog, Admin]),
    ReportDailyBalanceModule,
  ],
  controllers: [FinancialAuditController],
  providers: [FinancialAuditService],
  exports: [FinancialAuditService],
})
export class FinancialAuditModule {}
