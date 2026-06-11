import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovRevenueController } from './gov-revenue.controller';
import { GovRevenueService } from './gov-revenue.service';
import { GovRevenueEntry } from './entities/gov-revenue-entry.entity';
import { OpeningBalance } from '../opening-balance/entities/opening-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GovRevenueEntry, OpeningBalance])],
  controllers: [GovRevenueController],
  providers: [GovRevenueService],
  exports: [GovRevenueService],
})
export class GovRevenueModule {}
