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
import { PolicyService } from './policy.service';

@Controller('Policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post('loadRealBudget/:syId/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadRealBudget(
    @Param('syId', ParseIntPipe) syId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.policyService.loadRealBudget(syId, scId, page, pageSize);
  }

  @Get('loadRealBudget/:syId/:scId/:page/:pageSize')
  loadRealBudgetGet(
    @Param('syId', ParseIntPipe) syId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.policyService.loadRealBudget(syId, scId, page, pageSize);
  }

  @Post('loadExpenses/:scId/:year/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadExpenses(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.policyService.loadExpenses(scId, year, page, pageSize);
  }

  @Get('loadExpenses/:scId/:year/:page/:pageSize')
  loadExpensesGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.policyService.loadExpenses(scId, year, page, pageSize);
  }

  @Post('get_budget_income_type')
  @HttpCode(HttpStatus.OK)
  getBudgetIncomeType() {
    return this.policyService.getBudgetIncomeType();
  }

  @Post('get_school_year')
  @HttpCode(HttpStatus.OK)
  getSchoolYear() {
    return this.policyService.getSchoolYear();
  }

  @Post('get_partner/:scId')
  @HttpCode(HttpStatus.OK)
  getPartner(@Param('scId', ParseIntPipe) scId: number) {
    return this.policyService.getPartner(scId);
  }

  @Post('addRealBudget')
  @HttpCode(HttpStatus.OK)
  addRealBudget(@Body() payload: any) {
    return this.policyService.addRealBudget(payload);
  }

  @Post('updateRealBudget')
  @HttpCode(HttpStatus.OK)
  updateRealBudget(@Body() payload: any) {
    return this.policyService.updateRealBudget(payload);
  }

  @Post('removeRealBudget')
  @HttpCode(HttpStatus.OK)
  removeRealBudget(@Body() payload: any) {
    return this.policyService.removeRealBudget(payload);
  }

  @Post('addExpenses')
  @HttpCode(HttpStatus.OK)
  addExpenses(@Body() payload: any) {
    return this.policyService.addExpenses(payload);
  }

  @Post('updateExpenses')
  @HttpCode(HttpStatus.OK)
  updateExpenses(@Body() payload: any) {
    return this.policyService.updateExpenses(payload);
  }

  @Post('removeExpenses')
  @HttpCode(HttpStatus.OK)
  removeExpenses(@Body() payload: any) {
    return this.policyService.removeExpenses(payload);
  }
}
