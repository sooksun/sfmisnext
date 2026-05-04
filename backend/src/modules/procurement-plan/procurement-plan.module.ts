import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementPlanController } from './procurement-plan.controller';
import { ProcurementPlanService } from './procurement-plan.service';
import { PlnProcurementPlan } from './entities/pln-procurement-plan.entity';
import { PlnProcurementPlanItem } from './entities/pln-procurement-plan-item.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnProcurementPlan,
      PlnProcurementPlanItem,
      ParcelOrder,
    ]),
  ],
  controllers: [ProcurementPlanController],
  providers: [ProcurementPlanService],
  exports: [ProcurementPlanService],
})
export class ProcurementPlanModule {}
