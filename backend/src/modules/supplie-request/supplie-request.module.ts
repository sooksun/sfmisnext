import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplieRequestController } from './supplie-request.controller';
import { SupplieRequestService } from './supplie-request.service';
import { SupplieRequest } from './entities/supplie-request.entity';
import { SupplieRequestDetail } from './entities/supplie-request-detail.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplieRequest,
      SupplieRequestDetail,
      TransactionSupplies,
    ]),
  ],
  controllers: [SupplieRequestController],
  providers: [SupplieRequestService],
})
export class SupplieRequestModule {}
