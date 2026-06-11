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
import { BudgetService } from './budget.service';
import { CheckBudgetCategoryOnYearDto } from './dto/check-budget-category-on-year.dto';
import { CheckBudgetCategoryOnYearsDto } from './dto/check-budget-category-on-years.dto';
import { AddPlnBudgetCategoryDto } from './dto/add-pln-budget-category.dto';
import { AddNewBudgetCategoryDto } from './dto/add-new-budget-category.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { AddEstimateAcadyearDto } from './dto/add-estimate-acadyear.dto';
import { ConfirmEstimateAcadyearDto } from './dto/confirm-estimate-acadyear.dto';
import { UpdateRealBudgetDto } from './dto/update-real-budget.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 6)
@Controller('Budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get('loadEstimateAcadyearGroup/:sc_id/:year/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadEstimateAcadyearGroup(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year', ParseIntPipe) year: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.budgetService.loadEstimateAcadyearGroup(scId, year, syId);
  }

  @Get('loadPLNBudgetCategory/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadPLNBudgetCategory(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.budgetService.loadPLNBudgetCategory(scId, syId, budgetYear);
  }

  @Post('checkBudgetCategoryOnYear')
  @HttpCode(HttpStatus.OK)
  checkBudgetCategoryOnYear(
    @Body() payload: CheckBudgetCategoryOnYearDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.checkBudgetCategoryOnYear(payload);
  }

  @Post('checkBudgetCategoryOnYears')
  @HttpCode(HttpStatus.OK)
  checkBudgetCategoryOnYears(
    @Body() payload: CheckBudgetCategoryOnYearsDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.checkBudgetCategoryOnYears(payload);
  }

  @Get('loadBudgetIncomeType')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeType() {
    return this.budgetService.loadBudgetIncomeType();
  }

  @Get('loadMasterBudgetCategories')
  @HttpCode(HttpStatus.OK)
  loadMasterBudgetCategories() {
    return this.budgetService.loadMasterBudgetCategories();
  }

  @Get('loadBudgetIncome/:pbc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncome(
    @Param('pbc_id', ParseIntPipe) pbcId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.budgetService.loadBudgetIncome(
      pbcId,
      syId,
      user.sc_id,
      user.type,
    );
  }

  @Get('loadBudgetIncomeTypeSummary/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeTypeSummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.budgetService.loadBudgetIncomeTypeSummary(
      scId,
      syId,
      budgetYear,
    );
  }

  /**
   * โหลด "งบประมาณการรายประเภท" จาก pln_real_budget
   * - acad_year ส่งเป็น CE (เช่น 2026)
   * - คืนเฉพาะประเภทที่มียอด > 0 — ใช้ในหน้า budget-category
   */
  @Get('loadEstimatedIncomeByType/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadEstimatedIncomeByType(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.budgetService.loadEstimatedIncomeByType(scId, syId);
  }

  @Post('addPLNBudgetCategory')
  @HttpCode(HttpStatus.OK)
  addPLNBudgetCategory(
    @Body() payload: AddPlnBudgetCategoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.budgetService.addPLNBudgetCategory(
      payload,
      user.sc_id,
      user.type,
    );
  }

  @Post('addNewBudgetCategory')
  @HttpCode(HttpStatus.OK)
  addNewBudgetCategory(
    @Body() payload: AddNewBudgetCategoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.addNewBudgetCategory(payload);
  }

  @Post('removeBudgetCategory')
  @HttpCode(HttpStatus.OK)
  removeBudgetCategory(
    @Body() body: { pbc_id: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.budgetService.removePLNBudgetCategory(
      body.pbc_id,
      user.sc_id,
      user.type,
      user.admin_id,
    );
  }

  @Post('updateEstimate')
  @HttpCode(HttpStatus.OK)
  updateEstimate(
    @Body() payload: UpdateEstimateDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.budgetService.updateEstimate(payload, user.sc_id, user.type);
  }

  @Post('addEstimateAcadyear')
  @HttpCode(HttpStatus.OK)
  addEstimateAcadyear(
    @Body() payload: AddEstimateAcadyearDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.addEstimateAcadyear(payload);
  }

  @Get('loadEstimateAcadyearStatus/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadEstimateAcadyearStatus(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.budgetService.loadEstimateAcadyearStatus(
      scId,
      syId,
      budgetYear,
    );
  }

  @Post('confirmEstimateAcadyear')
  @HttpCode(HttpStatus.OK)
  confirmEstimateAcadyear(
    @Body() payload: ConfirmEstimateAcadyearDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.confirmEstimateAcadyear(payload);
  }

  @Post('updateRealBudget')
  @HttpCode(HttpStatus.OK)
  updateRealBudget(
    @Body() payload: UpdateRealBudgetDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, payload.sc_id);
    return this.budgetService.updateRealBudget(payload);
  }
}
