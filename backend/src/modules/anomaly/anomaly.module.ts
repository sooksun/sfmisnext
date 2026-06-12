import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnomalyController } from './anomaly.controller';
import { AnomalyService } from './anomaly.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransactions])],
  controllers: [AnomalyController],
  providers: [AnomalyService],
  exports: [AnomalyService],
})
export class AnomalyModule {}
