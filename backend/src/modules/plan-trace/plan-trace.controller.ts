import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PlanTraceService } from './plan-trace.service';

@Controller('PlanTrace')
export class PlanTraceController {
  constructor(private readonly svc: PlanTraceService) {}

  @Get('project/:project_id')
  @HttpCode(HttpStatus.OK)
  traceByProject(@Param('project_id', ParseIntPipe) projectId: number) {
    return this.svc.traceByProject(projectId);
  }

  @Get('overview/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  overview(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
  ) {
    return this.svc.overview(scId, budgetYear);
  }
}
