import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankLedgerController } from './bank-ledger.controller';
import { BankLedgerService } from './bank-ledger.service';
import { BankLedgerEntry } from './entities/bank-ledger-entry.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BankLedgerEntry, Admin])],
  controllers: [BankLedgerController],
  providers: [BankLedgerService],
  exports: [BankLedgerService],
})
export class BankLedgerModule {}
