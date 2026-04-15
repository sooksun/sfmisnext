import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { Receipt } from './entities/receipt.entity';
import { PlnReceive } from '../receive/entities/pln-receive.entity';
import { PlnReceiveDetail } from '../receive/entities/pln-receive-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Receipt, PlnReceive, PlnReceiveDetail])],
  controllers: [ReceiptController],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class ReceiptModule {}
