import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashKeepingController } from './cash-keeping.controller';
import { CashKeepingService } from './cash-keeping.service';
import { CashKeepingRecord } from './entities/cash-keeping-record.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashKeepingRecord, Admin])],
  controllers: [CashKeepingController],
  providers: [CashKeepingService],
  exports: [CashKeepingService],
})
export class CashKeepingModule {}
