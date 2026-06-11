import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntraBankTransfer } from './entities/intra-bank-transfer.entity';
import { BankLedgerEntry } from '../bank-ledger/entities/bank-ledger-entry.entity';
import { IntraBankTransferController } from './intra-bank-transfer.controller';
import { IntraBankTransferService } from './intra-bank-transfer.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntraBankTransfer, BankLedgerEntry])],
  controllers: [IntraBankTransferController],
  providers: [IntraBankTransferService],
  exports: [IntraBankTransferService],
})
export class IntraBankTransferModule {}
