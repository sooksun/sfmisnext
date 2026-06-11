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
import { SettingsService } from './settings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateSchoolPolicyDto } from './dto/create-school-policy.dto';
import { UpdateSchoolPolicyDto } from './dto/update-school-policy.dto';
import { CreateObecPolicyDto } from './dto/create-obec-policy.dto';
import { UpdateObecPolicyDto } from './dto/update-obec-policy.dto';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Controller('Settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // School Policy
  @Get('loadSchoolPolicy/:sc_id/:page/:page_size')
  @HttpCode(HttpStatus.OK)
  loadSchoolPolicy(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadSchoolPolicy(scId, page, pageSize);
  }

  @Post('addSchoolPolicy')
  @Roles(1, 2)
  @HttpCode(HttpStatus.OK)
  addSchoolPolicy(
    @Body() payload: CreateSchoolPolicyDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.settingsService.addSchoolPolicy(payload);
  }

  @Post('updateSchoolPolicy')
  @Roles(1, 2)
  @HttpCode(HttpStatus.OK)
  updateSchoolPolicy(
    @Body() payload: UpdateSchoolPolicyDto,
    @CurrentUser() user: JwtUser,
  ) {
    if (payload.sc_id !== undefined) assertSameSchool(user, payload.sc_id);
    return this.settingsService.updateSchoolPolicy(payload);
  }

  @Post('removeSchoolPolicy')
  @Roles(1, 2)
  @HttpCode(HttpStatus.OK)
  removeSchoolPolicy(@Body() payload: { scp_id: number }) {
    return this.settingsService.removeSchoolPolicy(payload);
  }

  // SAO Policy
  @Post('load_SaoPolicy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSaoPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Get('load_SaoPolicy/:page/:pageSize')
  loadSaoPolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Post('addSaoPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  addSaoPolicy(@Body() payload: any) {
    return this.settingsService.addSaoPolicy(payload);
  }

  @Post('updateSaoPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  updateSaoPolicy(@Body() payload: any) {
    return this.settingsService.updateSaoPolicy(payload);
  }

  @Post('removeSaoPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  removeSaoPolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeSaoPolicy(payload);
  }

  // MOE Policy
  @Post('load_MoePolicy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadMoePolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Get('load_MoePolicy/:page/:pageSize')
  loadMoePolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Post('addMoePolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  addMoePolicy(@Body() payload: any) {
    return this.settingsService.addMoePolicy(payload);
  }

  @Post('updateMoePolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  updateMoePolicy(@Body() payload: any) {
    return this.settingsService.updateMoePolicy(payload);
  }

  @Post('removeMoePolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  removeMoePolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeMoePolicy(payload);
  }

  // OBEC Policy
  @Get('load_ObecPolicy/:page/:page_size')
  @HttpCode(HttpStatus.OK)
  loadObecPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadObecPolicy(page, pageSize);
  }

  @Post('addObecPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  addObecPolicy(@Body() payload: CreateObecPolicyDto) {
    return this.settingsService.addObecPolicy(payload);
  }

  @Post('updateObecPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  updateObecPolicy(@Body() payload: UpdateObecPolicyDto) {
    return this.settingsService.updateObecPolicy(payload);
  }

  @Post('removeObecPolicy')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  removeObecPolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeObecPolicy(payload);
  }

  // Quick Win
  @Post('load_QuickWin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadQuickWin(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Get('load_QuickWin/:page/:pageSize')
  loadQuickWinGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Post('addQuickWin')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  addQuickWin(@Body() payload: any) {
    return this.settingsService.addQuickWin(payload);
  }

  @Post('updateQuickWin')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  updateQuickWin(@Body() payload: any) {
    return this.settingsService.updateQuickWin(payload);
  }

  @Post('removeQuickWin')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  removeQuickWin(@Body() payload: { id: number }) {
    return this.settingsService.removeQuickWin(payload);
  }

  // SAO
  @Post('load_Sao/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSao(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadSao(page, pageSize);
  }

  @Get('load_Sao/:page/:pageSize')
  loadSaoGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadSao(page, pageSize);
  }

  @Post('loadSaoGroup')
  @HttpCode(HttpStatus.OK)
  loadSaoGroup() {
    return this.settingsService.loadSaoGroup();
  }

  @Get('loadSaoGroup')
  loadSaoGroupGet() {
    return this.settingsService.loadSaoGroup();
  }

  // Classroom Budget
  @Post('load_classroom_budget/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadClassroomBudget(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  @Get('load_classroom_budget/:page/:pageSize')
  loadClassroomBudgetGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  // Budget Income Type
  @Post('load_budgetType/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadBudgetType(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetType(scId, page, pageSize);
  }

  @Get('load_budgetType/:scId/:page/:pageSize')
  loadBudgetTypeGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetType(scId, page, pageSize);
  }
}
