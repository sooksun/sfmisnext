import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistController } from './ai-assist.controller';
import { AiAssistService } from './ai-assist.service';
import { AiAssistCron } from './ai-assist.cron';
import { WorkAlert } from '../work-alert/entities/work-alert.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { School } from '../school/entities/school.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkAlert, ActivityLog, School]),
    AiModule, // ใช้ AiRouterService (มี fallback chain)
  ],
  controllers: [AiAssistController],
  providers: [AiAssistService, AiAssistCron],
  exports: [AiAssistService],
})
export class AiAssistModule {}
