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
import { BudgetService } from './budget.service';
import { CheckBudgetCategoryOnYearDto } from './dto/check-budget-category-on-year.dto';
import { CheckBudgetCategoryOnYearsDto } from './dto/check-budget-category-on-years.dto';
import { AddPlnBudgetCategoryDto } from './dto/add-pln-budget-category.dto';
import { AddNewBudgetCategoryDto } from './dto/add-new-budget-category.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { AddEstimateAcadyearDto } from './dto/add-estimate-acadyear.dto';
import { UpdateRealBudgetDto } from './dto/update-real-budget.dto';

@Controller('Budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get('loadEstimateAcadyearGroup/:sc_id/:year/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadEstimateAcadyearGroup(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year', ParseIntPipe) year: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.budgetService.loadEstimateAcadyearGroup(scId, year, syId);
  }

  @Get('loadPLNBudgetCategory/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadPLNBudgetCategory(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.budgetService.loadPLNBudgetCategory(scId, syId, budgetYear);
  }

  @Post('checkBudgetCategoryOnYear')
  @HttpCode(HttpStatus.OK)
  checkBudgetCategoryOnYear(@Body() payload: CheckBudgetCategoryOnYearDto) {
    return this.budgetService.checkBudgetCategoryOnYear(payload);
  }

  @Post('checkBudgetCategoryOnYears')
  @HttpCode(HttpStatus.OK)
  checkBudgetCategoryOnYears(@Body() payload: CheckBudgetCategoryOnYearsDto) {
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
  ) {
    return this.budgetService.loadBudgetIncome(pbcId, syId);
  }

  @Post('addPLNBudgetCategory')
  @HttpCode(HttpStatus.OK)
  addPLNBudgetCategory(@Body() payload: AddPlnBudgetCategoryDto) {
    return this.budgetService.addPLNBudgetCategory(payload);
  }

  @Post('addNewBudgetCategory')
  @HttpCode(HttpStatus.OK)
  addNewBudgetCategory(@Body() payload: AddNewBudgetCategoryDto) {
    return this.budgetService.addNewBudgetCategory(payload);
  }

  @Post('updateEstimate')
  @HttpCode(HttpStatus.OK)
  updateEstimate(@Body() payload: UpdateEstimateDto) {
    return this.budgetService.updateEstimate(payload);
  }

  @Post('addEstimateAcadyear')
  @HttpCode(HttpStatus.OK)
  addEstimateAcadyear(@Body() payload: AddEstimateAcadyearDto) {
    return this.budgetService.addEstimateAcadyear(payload);
  }

  @Post('updateRealBudget')
  @HttpCode(HttpStatus.OK)
  updateRealBudget(@Body() payload: UpdateRealBudgetDto) {
    return this.budgetService.updateRealBudget(payload);
  }
}
