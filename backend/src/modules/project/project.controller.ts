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
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('Project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('load_project/:scId/:userId/:page/:pageSize/:syId')
  @HttpCode(HttpStatus.OK)
  loadProject(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('addProject')
  @HttpCode(HttpStatus.OK)
  addProject(@Body() payload: CreateProjectDto) {
    return this.projectService.addProject(payload);
  }

  @Post('updateProject')
  @HttpCode(HttpStatus.OK)
  updateProject(@Body() payload: UpdateProjectDto) {
    return this.projectService.updateProject(payload);
  }

  @Post('removeProject')
  @HttpCode(HttpStatus.OK)
  removeProject(@Body() payload: { proj_id: number }) {
    return this.projectService.removeProject(payload.proj_id);
  }

  @Post('loadPLNBudgetCategory/:scId/:syId/:budgetYear')
  @HttpCode(HttpStatus.OK)
  loadPLNBudgetCategory(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('budgetYear') budgetYear: string,
  ) {
    return this.projectService.loadPLNBudgetCategory(scId, syId, budgetYear);
  }

  @Get('loadPLNBudgetCategory/:scId/:syId/:budgetYear')
  loadPLNBudgetCategoryGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('budgetYear') budgetYear: string,
  ) {
    return this.projectService.loadPLNBudgetCategory(scId, syId, budgetYear);
  }

  @Post('loadPLNBudgetCategory_rp')
  @HttpCode(HttpStatus.OK)
  loadPLNBudgetCategoryRp() {
    return this.projectService.loadPLNBudgetCategoryRp();
  }

  @Get('loadPLNBudgetCategory_rp')
  loadPLNBudgetCategoryRpGet() {
    return this.projectService.loadPLNBudgetCategoryRp();
  }

  @Post('master_sao_policy')
  @HttpCode(HttpStatus.OK)
  masterSaoPolicy() {
    return this.projectService.masterSaoPolicy();
  }

  @Post('master_moe_policy')
  @HttpCode(HttpStatus.OK)
  masterMoePolicy() {
    return this.projectService.masterMoePolicy();
  }

  @Post('master_obec_policy')
  @HttpCode(HttpStatus.OK)
  masterObecPolicy() {
    return this.projectService.masterObecPolicy();
  }

  @Post('master_quick_win')
  @HttpCode(HttpStatus.OK)
  masterQuickWin() {
    return this.projectService.masterQuickWin();
  }

  @Post('master_sc_policy/:scId')
  @HttpCode(HttpStatus.OK)
  masterScPolicy(@Param('scId', ParseIntPipe) scId: number) {
    return this.projectService.masterScPolicy(scId);
  }
}

@Controller('project')
export class ProjectLowerController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('load_project/:scId/:userId/:page/:pageSize/:syId')
  @HttpCode(HttpStatus.OK)
  loadProjectGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('load_project/:scId/:userId/:page/:pageSize/:syId')
  @HttpCode(HttpStatus.OK)
  loadProject(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('addProject')
  @HttpCode(HttpStatus.OK)
  addProject(@Body() payload: CreateProjectDto) {
    return this.projectService.addProject(payload);
  }

  @Post('updateProject')
  @HttpCode(HttpStatus.OK)
  updateProject(@Body() payload: UpdateProjectDto) {
    return this.projectService.updateProject(payload);
  }

  @Post('removeProject')
  @HttpCode(HttpStatus.OK)
  removeProject(@Body() payload: { proj_id: number }) {
    return this.projectService.removeProject(payload.proj_id);
  }
}
