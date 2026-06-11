import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ProjectFollowupService } from './project-followup.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('ProjectFollowup')
export class ProjectFollowupController {
  constructor(private readonly svc: ProjectFollowupService) {}

  @Get('load/:project_id')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('project_id', ParseIntPipe) projectId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.loadByProject(projectId, user);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.update(dto, user);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @Body() dto: { pf_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.submit(dto.pf_id, dto.up_by, user);
  }

  @Post('acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledge(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.acknowledge(dto, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() dto: { pf_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.remove(dto.pf_id, dto.up_by, user);
  }

  @Get('summary/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  summary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.summary(scId, budgetYear);
  }
}
