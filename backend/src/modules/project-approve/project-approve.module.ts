import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectApproveController } from './project-approve.controller';
import { ProjectApproveService } from './project-approve.service';
import { PlnProjApprove } from './entities/pln-proj-approve.entity';
import { ParcelOrder } from './entities/parcel-order.entity';
import { ParcelDetail } from './entities/parcel-detail.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { PlnProcurementPlanItem } from '../procurement-plan/entities/pln-procurement-plan-item.entity';
import { PlnProcurementPlan } from '../procurement-plan/entities/pln-procurement-plan.entity';
import { Supplies } from '../supplie/entities/supplies.entity';
import { Unit } from '../general-db/entities/unit.entity';
import { Project } from '../project/entities/project.entity';
import { School } from '../school/entities/school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnProjApprove,
      ParcelOrder,
      ParcelDetail,
      Partner,
      Admin,
      RequestWithdraw,
      PlnProcurementPlanItem,
      PlnProcurementPlan,
      Supplies,
      Unit,
      Project,
      School,
    ]),
  ],
  controllers: [ProjectApproveController],
  providers: [ProjectApproveService],
  exports: [ProjectApproveService],
})
export class ProjectApproveModule {}
