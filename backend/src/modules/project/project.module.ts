import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProjectController,
  ProjectLowerController,
} from './project.controller';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ProjectPolicy } from './entities/project-policy.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { MasterScPolicy } from '../settings/entities/master-sc-policy.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectPolicy,
      ParcelOrder,
      SchoolYear,
      MasterScPolicy,
      Admin,
    ]),
  ],
  controllers: [ProjectController, ProjectLowerController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
