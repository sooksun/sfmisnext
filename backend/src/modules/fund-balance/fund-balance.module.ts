import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundBalanceService } from './fund-balance.service';
import { FinancialTransactions } from '../report-daily-balance/entities/financial-transactions.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

/**
 * @Global — ให้ทุกโมดูล inject FundBalanceService ได้โดยไม่ต้อง import ซ้ำ
 * (ใช้เป็น guard กันจ่าย/ยืมเกินยอดคงเหลือของประเภทเงิน)
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransactions, OpeningBalance])],
  providers: [FundBalanceService],
  exports: [FundBalanceService],
})
export class FundBalanceModule {}
