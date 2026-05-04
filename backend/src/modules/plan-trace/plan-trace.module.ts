import { Module } from '@nestjs/common';
import { PlanTraceController } from './plan-trace.controller';
import { PlanTraceService } from './plan-trace.service';

@Module({
  controllers: [PlanTraceController],
  providers: [PlanTraceService],
  exports: [PlanTraceService],
})
export class PlanTraceModule {}
