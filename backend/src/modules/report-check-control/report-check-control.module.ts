import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportCheckControlController } from './report-check-control.controller';
import { ReportCheckControlService } from './report-check-control.service';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestWithdraw,
      Admin,
      Partner,
      BudgetIncomeType,
    ]),
  ],
  controllers: [ReportCheckControlController],
  providers: [ReportCheckControlService],
  exports: [ReportCheckControlService],
})
export class ReportCheckControlModule {}
