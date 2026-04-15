import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralDbController } from './general-db.controller';
import { GeneralDbService } from './general-db.service';
import { Unit } from './entities/unit.entity';
import { TypeSupplies } from './entities/type-supplies.entity';
import { Partner } from './entities/partner.entity';
import { Supplies } from '../supplie/entities/supplies.entity';
import { TransactionSupplies } from '../supplie/entities/transaction-supplies.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Unit,
      TypeSupplies,
      Partner,
      Supplies,
      TransactionSupplies,
    ]),
  ],
  controllers: [GeneralDbController],
  providers: [GeneralDbService],
  exports: [GeneralDbService],
})
export class GeneralDbModule {}
