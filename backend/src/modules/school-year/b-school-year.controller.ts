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
import { SchoolYearService } from './school-year.service';

@Controller('B_school_year')
export class BSchoolYearController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  @Get('load_school_year/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchoolYearGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolYearService.loadAllSchoolYears(page, pageSize);
  }

  @Post('load_school_year/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchoolYear(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolYearService.loadAllSchoolYears(page, pageSize);
  }

  @Post('add_school_year')
  @HttpCode(HttpStatus.OK)
  addSchoolYear(@Body() payload: any) {
    // Map frontend field names to DTO field names
    return this.schoolYearService.saveSchoolYear({
      sy_year: payload.sy_year,
      sy_date_s: payload.sy_start ?? payload.sy_date_s,
      sy_date_e: payload.sy_end ?? payload.sy_date_e,
      sc_id: payload.sc_id,
      budget_year: payload.budget_year,
      budget_date_s: payload.budget_date_s,
      budget_date_e: payload.budget_date_e,
      up_by: payload.up_by,
    });
  }

  @Post('update_school_year')
  @HttpCode(HttpStatus.OK)
  updateSchoolYear(@Body() payload: any) {
    // Map frontend field names to DTO field names
    return this.schoolYearService.updateSchoolYear({
      sy_id: payload.sy_id,
      sy_year: payload.sy_year,
      sy_date_s: payload.sy_start ?? payload.sy_date_s,
      sy_date_e: payload.sy_end ?? payload.sy_date_e,
      sc_id: payload.sc_id,
      budget_year: payload.budget_year,
      budget_date_s: payload.budget_date_s,
      budget_date_e: payload.budget_date_e,
      up_by: payload.up_by,
    });
  }

  @Post('remove_school_year')
  @HttpCode(HttpStatus.OK)
  removeSchoolYear(@Body() payload: any) {
    return this.schoolYearService.removeSchoolYear(payload.sy_id);
  }
}
