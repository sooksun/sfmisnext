import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmpDepositController } from './smp-deposit.controller';
import { SmpDepositService } from './smp-deposit.service';
import { SmpDepositEntry } from './entities/smp-deposit-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmpDepositEntry])],
  controllers: [SmpDepositController],
  providers: [SmpDepositService],
  exports: [SmpDepositService],
})
export class SmpDepositModule {}
