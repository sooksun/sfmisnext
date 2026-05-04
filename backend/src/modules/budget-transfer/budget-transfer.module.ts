import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetTransfer } from './entities/budget-transfer.entity';
import { BudgetTransferController } from './budget-transfer.controller';
import { BudgetTransferService } from './budget-transfer.service';

@Module({
  imports: [TypeOrmModule.forFeature([BudgetTransfer])],
  controllers: [BudgetTransferController],
  providers: [BudgetTransferService],
  exports: [BudgetTransferService],
})
export class BudgetTransferModule {}
