import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SupplieController,
  SupplieLowerController,
} from './supplie.controller';
import { SupplieService } from './supplie.service';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { Supplies } from './entities/supplies.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReceiveParcelOrder,
      ReceiveParcelDetail,
      ParcelOrder,
      ParcelDetail,
      Supplies,
      TransactionSupplies,
      Admin,
    ]),
  ],
  controllers: [SupplieController, SupplieLowerController],
  providers: [SupplieService],
  exports: [SupplieService],
})
export class SupplieModule {}
