import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpeningBalance } from './entities/opening-balance.entity';
import { FiscalYearBalance } from '../fiscal-year-balance/entities/fiscal-year-balance.entity';
import { OpeningBalanceService } from './opening-balance.service';
import { OpeningBalanceController } from './opening-balance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OpeningBalance, FiscalYearBalance])],
  controllers: [OpeningBalanceController],
  providers: [OpeningBalanceService],
  exports: [OpeningBalanceService],
})
export class OpeningBalanceModule {}
