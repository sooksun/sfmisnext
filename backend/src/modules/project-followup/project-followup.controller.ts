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

@Controller('ProjectFollowup')
export class ProjectFollowupController {
  constructor(private readonly svc: ProjectFollowupService) {}

  @Get('load/:project_id')
  @HttpCode(HttpStatus.OK)
  load(@Param('project_id', ParseIntPipe) projectId: number) {
    return this.svc.loadByProject(projectId);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any) {
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any) {
    return this.svc.update(dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: { pf_id: number; up_by: number }) {
    return this.svc.submit(dto.pf_id, dto.up_by);
  }

  @Post('acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledge(@Body() dto: any) {
    return this.svc.acknowledge(dto);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() dto: { pf_id: number; up_by: number }) {
    return this.svc.remove(dto.pf_id, dto.up_by);
  }

  @Get('summary/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  summary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
  ) {
    return this.svc.summary(scId, budgetYear);
  }
}
