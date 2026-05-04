import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YearEndReportController } from './year-end-report.controller';
import { YearEndReportService } from './year-end-report.service';
import { Receipt } from '../receipt/entities/receipt.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Receipt,
      PlnReceive,
      PlnReceiveDetail,
      BudgetIncomeType,
    ]),
  ],
  controllers: [YearEndReportController],
  providers: [YearEndReportService],
})
export class YearEndReportModule {}
