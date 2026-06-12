import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectWorkspaceController } from './project-workspace.controller';
import { ProjectWorkspaceService } from './project-workspace.service';
import { Project } from '../project/entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { ProjectFollowup } from '../project-followup/entities/project-followup.entity';
import { Admin } from '../admin/entities/admin.entity';
import { AttachmentModule } from '../attachment/attachment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectTask,
      ParcelOrder,
      RequestWithdraw,
      ProjectFollowup,
      Admin,
    ]),
    AttachmentModule,
  ],
  controllers: [ProjectWorkspaceController],
  providers: [ProjectWorkspaceService],
  exports: [ProjectWorkspaceService],
})
export class ProjectWorkspaceModule {}
