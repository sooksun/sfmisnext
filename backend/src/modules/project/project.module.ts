import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProjectController,
  ProjectLowerController,
} from './project.controller';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectController, ProjectLowerController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
