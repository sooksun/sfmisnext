import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectWorkspaceService } from './project-workspace.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { type JwtUser } from '../../common/utils/tenant-guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateExecutionDto } from './dto/update-execution.dto';
import { CloseProjectDto } from './dto/close-project.dto';

/**
 * Project Workspace (Phase 1) — พื้นที่ทำงานโครงการแบบ Minimal
 * route prefix `projects` (REST style) ไม่ชนกับ Project/project เดิม
 * ทุก endpoint ตรวจ tenant จาก record จริงใน service (assertSameSchool)
 */
@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 5, 6, 7, 8)
@Controller('projects')
export class ProjectWorkspaceController {
  constructor(private readonly svc: ProjectWorkspaceService) {}

  // ── dashboard & my-tasks (เส้นทางคงที่ ต้องมาก่อน :id เพื่อกัน route ชน) ──

  @Get('dashboard/:scId/:syId')
  dashboard(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getDashboard(scId, syId, user);
  }

  @Get('my-tasks/:scId')
  myTasks(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getMyTasks(scId, user);
  }

  // ── workspace ──

  @Get(':id/workspace')
  workspace(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getWorkspace(id, user);
  }

  @Patch(':id/execution')
  updateExecution(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExecutionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.updateExecution(id, dto, user);
  }

  // ── members ──

  @Get(':id/members')
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.listMembers(id, user);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMemberDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.addMember(id, dto, user);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.removeMember(id, memberId, user);
  }

  // ── tasks ──

  @Get(':id/tasks')
  listTasks(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.listTasks(id, user);
  }

  @Post(':id/tasks')
  @HttpCode(HttpStatus.OK)
  createTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.createTask(id, dto, user);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.updateTask(id, taskId, dto, user);
  }

  @Delete(':id/tasks/:taskId')
  removeTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.removeTask(id, taskId, user);
  }

  // ── budget / evidence / close ──

  @Get(':id/budget-summary')
  budgetSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getBudgetSummary(id, user);
  }

  @Get(':id/evidence')
  evidence(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getEvidence(id, user);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.closeProject(id, dto, user);
  }
}
