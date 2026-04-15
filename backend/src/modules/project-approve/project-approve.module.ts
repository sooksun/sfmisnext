import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectApproveController } from './project-approve.controller';
import { ProjectApproveService } from './project-approve.service';
import { PlnProjApprove } from './entities/pln-proj-approve.entity';
import { ParcelOrder } from './entities/parcel-order.entity';
import { ParcelDetail } from './entities/parcel-detail.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlnProjApprove,
      ParcelOrder,
      ParcelDetail,
      Partner,
      Admin,
    ]),
  ],
  controllers: [ProjectApproveController],
  providers: [ProjectApproveService],
  exports: [ProjectApproveService],
})
export class ProjectApproveModule {}
