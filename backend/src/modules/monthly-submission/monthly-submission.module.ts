import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlySubmissionController } from './monthly-submission.controller';
import { MonthlySubmissionService } from './monthly-submission.service';
import { MonthlySubmission } from './entities/monthly-submission.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlySubmission, Admin])],
  controllers: [MonthlySubmissionController],
  providers: [MonthlySubmissionService],
  exports: [MonthlySubmissionService],
})
export class MonthlySubmissionModule {}
