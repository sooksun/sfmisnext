import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptBookController } from './receipt-book.controller';
import { ReceiptBookService } from './receipt-book.service';
import { ReceiptBook } from './entities/receipt-book.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReceiptBook, Admin])],
  controllers: [ReceiptBookController],
  providers: [ReceiptBookService],
  exports: [ReceiptBookService],
})
export class ReceiptBookModule {}
