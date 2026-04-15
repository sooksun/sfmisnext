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

@Controller('B_settings')
export class BSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // SAO (สพท.)
  @Get('load_sao/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSaoGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSao(page, pageSize);
  }

  @Post('load_sao/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSao(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSao(page, pageSize);
  }

  @Post('add_sao')
  @HttpCode(HttpStatus.OK)
  addSao(@Body() payload: any) {
    return this.settingsService.addSao(payload);
  }

  @Post('update_sao')
  @HttpCode(HttpStatus.OK)
  updateSao(@Body() payload: any) {
    return this.settingsService.updateSao(payload);
  }

  @Post('remove_sao')
  @HttpCode(HttpStatus.OK)
  removeSao(@Body() payload: any) {
    return this.settingsService.removeSao(payload);
  }

  // SAO Policy
  @Get('load_sao_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSaoPolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Post('load_sao_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSaoPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadSaoPolicy(page, pageSize);
  }

  @Post('add_sao_policy')
  @HttpCode(HttpStatus.OK)
  addSaoPolicy(@Body() payload: any) {
    return this.settingsService.addSaoPolicy(payload);
  }

  @Post('update_sao_policy')
  @HttpCode(HttpStatus.OK)
  updateSaoPolicy(@Body() payload: any) {
    return this.settingsService.updateSaoPolicy(payload);
  }

  @Post('remove_sao_policy')
  @HttpCode(HttpStatus.OK)
  removeSaoPolicy(@Body() payload: any) {
    return this.settingsService.removeSaoPolicy(payload);
  }

  // MOE Policy
  @Get('load_moe_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadMoePolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Post('load_moe_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadMoePolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadMoePolicy(page, pageSize);
  }

  @Post('add_moe_policy')
  @HttpCode(HttpStatus.OK)
  addMoePolicy(@Body() payload: any) {
    return this.settingsService.addMoePolicy(payload);
  }

  @Post('update_moe_policy')
  @HttpCode(HttpStatus.OK)
  updateMoePolicy(@Body() payload: any) {
    return this.settingsService.updateMoePolicy(payload);
  }

  @Post('remove_moe_policy')
  @HttpCode(HttpStatus.OK)
  removeMoePolicy(@Body() payload: any) {
    return this.settingsService.removeMoePolicy(payload);
  }

  // OBEC Policy
  @Get('load_obec_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadObecPolicyGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadObecPolicy(page, pageSize);
  }

  @Post('load_obec_policy/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadObecPolicy(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadObecPolicy(page, pageSize);
  }

  @Post('add_obec_policy')
  @HttpCode(HttpStatus.OK)
  addObecPolicy(@Body() payload: any) {
    return this.settingsService.addObecPolicy(payload);
  }

  @Post('update_obec_policy')
  @HttpCode(HttpStatus.OK)
  updateObecPolicy(@Body() payload: any) {
    return this.settingsService.updateObecPolicy(payload);
  }

  @Post('remove_obec_policy')
  @HttpCode(HttpStatus.OK)
  removeObecPolicy(@Body() payload: any) {
    return this.settingsService.removeObecPolicy(payload);
  }

  // Quick Win
  @Get('load_quick_win/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadQuickWinGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Post('load_quick_win/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadQuickWin(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadQuickWin(page, pageSize);
  }

  @Post('add_quick_win')
  @HttpCode(HttpStatus.OK)
  addQuickWin(@Body() payload: any) {
    return this.settingsService.addQuickWin(payload);
  }

  @Post('update_quick_win')
  @HttpCode(HttpStatus.OK)
  updateQuickWin(@Body() payload: any) {
    return this.settingsService.updateQuickWin(payload);
  }

  @Post('remove_quick_win')
  @HttpCode(HttpStatus.OK)
  removeQuickWin(@Body() payload: any) {
    return this.settingsService.removeQuickWin(payload);
  }

  // Classroom Budget
  @Get('load_classroom_budget/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadClassroomBudgetGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  @Post('load_classroom_budget/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadClassroomBudget(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadClassroomBudget(page, pageSize);
  }

  @Post('add_classroom_budget')
  @HttpCode(HttpStatus.OK)
  addClassroomBudget(@Body() payload: any) {
    return this.settingsService.addClassroomBudget(payload);
  }

  @Post('update_classroom_budget')
  @HttpCode(HttpStatus.OK)
  updateClassroomBudget(@Body() payload: any) {
    return this.settingsService.updateClassroomBudget(payload);
  }

  @Post('remove_classroom_budget')
  @HttpCode(HttpStatus.OK)
  removeClassroomBudget(@Body() payload: any) {
    return this.settingsService.removeClassroomBudget(payload);
  }

  // Budget Income Type
  @Get('load_budget_income_type/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeTypeGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetIncomeType(page, pageSize);
  }

  @Post('load_budget_income_type/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeType(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.settingsService.loadBudgetIncomeType(page, pageSize);
  }

  @Post('add_budget_income_type')
  @HttpCode(HttpStatus.OK)
  addBudgetIncomeType(@Body() payload: any) {
    return this.settingsService.addBudgetIncomeType(payload);
  }

  @Post('update_budget_income_type')
  @HttpCode(HttpStatus.OK)
  updateBudgetIncomeType(@Body() payload: any) {
    return this.settingsService.updateBudgetIncomeType(payload);
  }

  @Post('remove_budget_income_type')
  @HttpCode(HttpStatus.OK)
  removeBudgetIncomeType(@Body() payload: any) {
    return this.settingsService.removeBudgetIncomeType(payload);
  }
}
