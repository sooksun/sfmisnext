import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { RequestWithdraw } from './entities/request-withdraw.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestWithdraw,
      ParcelOrder,
      Partner,
      Admin,
      BudgetIncomeType,
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
