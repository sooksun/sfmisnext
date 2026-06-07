import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProjectController,
  ProjectLowerController,
} from './project.controller';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { SchoolYear } from '../school-year/entities/school-year.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ParcelOrder, SchoolYear])],
  controllers: [ProjectController, ProjectLowerController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
