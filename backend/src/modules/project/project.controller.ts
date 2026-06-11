import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('load_project/:scId/:userId/:page/:pageSize/:syId')
  @HttpCode(HttpStatus.OK)
  loadProject(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('addProject')
  @HttpCode(HttpStatus.OK)
  addProject(@Body() payload: CreateProjectDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, payload.sc_id ?? user.sc_id);
    return this.projectService.addProject(payload);
  }

  @Post('updateProject')
  @HttpCode(HttpStatus.OK)
  updateProject(
    @Body() payload: UpdateProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.updateProject(payload, user);
  }

  @Post('removeProject')
  @HttpCode(HttpStatus.OK)
  removeProject(
    @Body() payload: { proj_id: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.removeProject(payload.proj_id, user);
  }

  @Post('loadPLNBudgetCategory/:scId/:syId/:budgetYear')
  @HttpCode(HttpStatus.OK)
  loadPLNBudgetCategory(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('budgetYear') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.projectService.loadPLNBudgetCategory(scId, syId, budgetYear);
  }

  @Get('loadPLNBudgetCategory/:scId/:syId/:budgetYear')
  loadPLNBudgetCategoryGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('budgetYear') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
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
  masterScPolicy(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
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
    @Param('pageSize', PageSizePipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('load_project/:scId/:userId/:page/:pageSize/:syId')
  @HttpCode(HttpStatus.OK)
  loadProject(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.projectService.loadProject(scId, userId, page, pageSize, syId);
  }

  @Post('addProject')
  @HttpCode(HttpStatus.OK)
  addProject(@Body() payload: CreateProjectDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, payload.sc_id ?? user.sc_id);
    return this.projectService.addProject(payload);
  }

  @Post('updateProject')
  @HttpCode(HttpStatus.OK)
  updateProject(
    @Body() payload: UpdateProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.updateProject(payload, user);
  }

  @Post('removeProject')
  @HttpCode(HttpStatus.OK)
  removeProject(
    @Body() payload: { proj_id: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.projectService.removeProject(payload.proj_id, user);
  }
}
