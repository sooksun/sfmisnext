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
import { SettingsService } from './settings.service';
import { CreateSchoolPolicyDto } from './dto/create-school-policy.dto';
import { UpdateSchoolPolicyDto } from './dto/update-school-policy.dto';
import { CreateObecPolicyDto } from './dto/create-obec-policy.dto';
import { UpdateObecPolicyDto } from './dto/update-obec-policy.dto';

@Controller('Settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // School Policy
  @Get('loadSchoolPolicy/:sc_id/:page/:page_size')
  @HttpCode(HttpStatus.OK)
  loadSchoolPolicy(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSchoolPolicy(scId, page, pageSize);
  }

  @Post('addSchoolPolicy')
  @HttpCode(HttpStatus.OK)
  addSchoolPolicy(@Body() payload: CreateSchoolPolicyDto) {
    return this.settingsService.addSchoolPolicy(payload);
  }

  @Post('updateSchoolPolicy')
  @HttpCode(HttpStatus.OK)
  updateSchoolPolicy(@Body() payload: UpdateSchoolPolicyDto) {
    return this.settingsService.updateSchoolPolicy(payload);
  }

  @Post('removeSchoolPolicy')
  @HttpCode(HttpStatus.OK)
  removeSchoolPolicy(@Body() payload: { scp_id: number }) {
    return this.settingsService.removeSchoolPolicy(payload);
  }

  // SAO Policy
  @Post('load_SaoPolicy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSaoPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Get('load_SaoPolicy/:page/:pageSize')
  loadSaoPolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Post('addSaoPolicy')
  @HttpCode(HttpStatus.OK)
  addSaoPolicy(@Body() payload: any) {
    return this.settingsService.addSaoPolicy(payload);
  }

  @Post('updateSaoPolicy')
  @HttpCode(HttpStatus.OK)
  updateSaoPolicy(@Body() payload: any) {
    return this.settingsService.updateSaoPolicy(payload);
  }

  @Post('removeSaoPolicy')
  @HttpCode(HttpStatus.OK)
  removeSaoPolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeSaoPolicy(payload);
  }

  // MOE Policy
  @Post('load_MoePolicy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadMoePolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Get('load_MoePolicy/:page/:pageSize')
  loadMoePolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Post('addMoePolicy')
  @HttpCode(HttpStatus.OK)
  addMoePolicy(@Body() payload: any) {
    return this.settingsService.addMoePolicy(payload);
  }

  @Post('updateMoePolicy')
  @HttpCode(HttpStatus.OK)
  updateMoePolicy(@Body() payload: any) {
    return this.settingsService.updateMoePolicy(payload);
  }

  @Post('removeMoePolicy')
  @HttpCode(HttpStatus.OK)
  removeMoePolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeMoePolicy(payload);
  }

  // OBEC Policy
  @Get('load_ObecPolicy/:page/:page_size')
  @HttpCode(HttpStatus.OK)
  loadObecPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadObecPolicy(page, pageSize);
  }

  @Post('addObecPolicy')
  @HttpCode(HttpStatus.OK)
  addObecPolicy(@Body() payload: CreateObecPolicyDto) {
    return this.settingsService.addObecPolicy(payload);
  }

  @Post('updateObecPolicy')
  @HttpCode(HttpStatus.OK)
  updateObecPolicy(@Body() payload: UpdateObecPolicyDto) {
    return this.settingsService.updateObecPolicy(payload);
  }

  @Post('removeObecPolicy')
  @HttpCode(HttpStatus.OK)
  removeObecPolicy(@Body() payload: { id: number }) {
    return this.settingsService.removeObecPolicy(payload);
  }

  // Quick Win
  @Post('load_QuickWin/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadQuickWin(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Get('load_QuickWin/:page/:pageSize')
  loadQuickWinGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Post('addQuickWin')
  @HttpCode(HttpStatus.OK)
  addQuickWin(@Body() payload: any) {
    return this.settingsService.addQuickWin(payload);
  }

  @Post('updateQuickWin')
  @HttpCode(HttpStatus.OK)
  updateQuickWin(@Body() payload: any) {
    return this.settingsService.updateQuickWin(payload);
  }

  @Post('removeQuickWin')
  @HttpCode(HttpStatus.OK)
  removeQuickWin(@Body() payload: { id: number }) {
    return this.settingsService.removeQuickWin(payload);
  }

  // SAO
  @Post('load_Sao/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSao(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSao(page, pageSize);
  }

  @Get('load_Sao/:page/:pageSize')
  loadSaoGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
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
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  @Get('load_classroom_budget/:page/:pageSize')
  loadClassroomBudgetGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  // Budget Income Type
  @Post('load_budgetType/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadBudgetType(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetType(scId, page, pageSize);
  }

  @Get('load_budgetType/:scId/:page/:pageSize')
  loadBudgetTypeGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetType(scId, page, pageSize);
  }
}
