import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';
import { PlnReceive } from './entities/pln-receive.entity';
import { PlnReceiveDetail } from './entities/pln-receive-detail.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { FinancialAuditModule } from '../financial-audit/financial-audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnReceive,
      PlnReceiveDetail,
      Admin,
      BudgetIncomeType,
    ]),
    FinancialAuditModule,
  ],
  controllers: [ReceiveController],
  providers: [ReceiveService],
  exports: [ReceiveService],
})
export class ReceiveModule {}
