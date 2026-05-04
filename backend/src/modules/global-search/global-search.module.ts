import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSearchController } from './global-search.controller';
import { GlobalSearchService } from './global-search.service';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestWithdraw,
      PlnReceive,
      FinancialTransactions,
    ]),
  ],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService],
  exports: [GlobalSearchService],
})
export class GlobalSearchModule {}
