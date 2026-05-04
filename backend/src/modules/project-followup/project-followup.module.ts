import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFollowup } from './entities/project-followup.entity';
import { ProjectFollowupController } from './project-followup.controller';
import { ProjectFollowupService } from './project-followup.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectFollowup])],
  controllers: [ProjectFollowupController],
  providers: [ProjectFollowupService],
  exports: [ProjectFollowupService],
})
export class ProjectFollowupModule {}
