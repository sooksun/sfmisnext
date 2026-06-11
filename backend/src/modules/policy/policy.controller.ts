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
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('Policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post('loadRealBudget/:syId/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadRealBudget(
    @Param('syId', ParseIntPipe) syId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.policyService.loadRealBudget(syId, scId, page, pageSize);
  }

  @Get('loadRealBudget/:syId/:scId/:page/:pageSize')
  loadRealBudgetGet(
    @Param('syId', ParseIntPipe) syId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.policyService.loadRealBudget(syId, scId, page, pageSize);
  }

  @Post('loadExpenses/:scId/:year/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadExpenses(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.policyService.loadExpenses(scId, year, page, pageSize);
  }

  @Get('loadExpenses/:scId/:year/:page/:pageSize')
  loadExpensesGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.policyService.loadExpenses(scId, year, page, pageSize);
  }

  @Post('get_budget_income_type')
  @HttpCode(HttpStatus.OK)
  getBudgetIncomeType() {
    return this.policyService.getBudgetIncomeType();
  }

  @Get('loadBudgetIncomeType/:scId')
  async loadBudgetIncomeType(@Param('scId', ParseIntPipe) _scId: number) {
    const data = await this.policyService.getBudgetIncomeType();
    return { data };
  }

  @Post('get_school_year')
  @HttpCode(HttpStatus.OK)
  getSchoolYear() {
    return this.policyService.getSchoolYear();
  }

  @Post('get_partner/:scId')
  @HttpCode(HttpStatus.OK)
  getPartner(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.policyService.getPartner(scId);
  }

  @Post('addRealBudget')
  @HttpCode(HttpStatus.OK)
  addRealBudget(@Body() payload: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, Number(payload?.sc_id ?? user.sc_id));
    return this.policyService.addRealBudget(payload);
  }

  @Post('updateRealBudget')
  @HttpCode(HttpStatus.OK)
  updateRealBudget(@Body() payload: any, @CurrentUser() user: JwtUser) {
    return this.policyService.updateRealBudget(payload, user);
  }

  @Post('removeRealBudget')
  @HttpCode(HttpStatus.OK)
  removeRealBudget(@Body() payload: any, @CurrentUser() user: JwtUser) {
    return this.policyService.removeRealBudget(payload, user);
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
