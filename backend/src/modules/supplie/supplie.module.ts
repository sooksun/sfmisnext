import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SupplieController,
  SupplieLowerController,
} from './supplie.controller';
import { SupplieService } from './supplie.service';
import { SupplieExtService } from './supplie-ext.service';
import {
  SupplieContractController,
  SupplieInspectionController,
  SupplieAnnualCheckController,
  SupplieDisposalController,
} from './supplie-ext.controller';
import { ReceiveParcelOrder } from './entities/receive-parcel-order.entity';
import { ReceiveParcelDetail } from './entities/receive-parcel-detail.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { ParcelDetail } from '../project-approve/entities/parcel-detail.entity';
import { Supplies } from './entities/supplies.entity';
import { TransactionSupplies } from './entities/transaction-supplies.entity';
import { SupContract } from './entities/sup-contract.entity';
import { SupInspection } from './entities/sup-inspection.entity';
import { SupAnnualCheck } from './entities/sup-annual-check.entity';
import { SupDisposal } from './entities/sup-disposal.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ReceiveParcelOrder,
      ReceiveParcelDetail,
      ParcelOrder,
      ParcelDetail,
      Supplies,
      TransactionSupplies,
      SupContract,
      SupInspection,
      SupAnnualCheck,
      SupDisposal,
      Admin,
    ]),
  ],
  controllers: [
    SupplieController,
    SupplieLowerController,
    SupplieContractController,
    SupplieInspectionController,
    SupplieAnnualCheckController,
    SupplieDisposalController,
  ],
  providers: [SupplieService, SupplieExtService],
  exports: [SupplieService, SupplieExtService],
})
export class SupplieModule {}
