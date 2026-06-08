import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditCommitteeController } from './audit-committee.controller';
import { AuditCommitteeService } from './audit-committee.service';
import { ParcelOrder } from '../project-approve/entities/parcel-order.entity';
import { Project } from '../project/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParcelOrder, Project])],
  controllers: [AuditCommitteeController],
  providers: [AuditCommitteeService],
  exports: [AuditCommitteeService],
})
export class AuditCommitteeModule {}
