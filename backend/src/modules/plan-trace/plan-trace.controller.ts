import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PlanTraceService } from './plan-trace.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('PlanTrace')
export class PlanTraceController {
  constructor(private readonly svc: PlanTraceService) {}

  @Get('project/:project_id')
  @HttpCode(HttpStatus.OK)
  traceByProject(
    @Param('project_id', ParseIntPipe) projectId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.traceByProject(projectId, user);
  }

  @Get('overview/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  overview(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.overview(scId, budgetYear);
  }
}
