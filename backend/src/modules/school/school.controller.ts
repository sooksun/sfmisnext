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
import { SchoolService } from './school.service';

@Controller('School')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post('load_school/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchools(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Get('load_school/:page/:pageSize')
  loadSchoolsGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Post('loadBudgetIncomeTypeSchool/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeTypeSchool(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadBudgetIncomeTypeSchool(scId, page, pageSize);
  }

  @Get('loadBudgetIncomeTypeSchool/:scId/:page/:pageSize')
  loadBudgetIncomeTypeSchoolGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadBudgetIncomeTypeSchool(scId, page, pageSize);
  }

  @Post('loadProvice')
  @HttpCode(HttpStatus.OK)
  loadProvince() {
    return this.schoolService.loadProvince();
  }

  @Get('loadProvice')
  loadProvinceGet() {
    return this.schoolService.loadProvince();
  }
}
