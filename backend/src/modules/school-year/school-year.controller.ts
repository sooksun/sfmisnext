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
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';

@Controller('school_year')
export class SchoolYearController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  @Post('getSchoolYear/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  getSchoolYear(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolYearService.getSchoolYear(scId, page, pageSize);
  }

  @Get('getSchoolYear/:scId/:page/:pageSize')
  getSchoolYearGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolYearService.getSchoolYear(scId, page, pageSize);
  }

  @Post('saveSchoolYear')
  @HttpCode(HttpStatus.OK)
  saveSchoolYear(@Body() payload: CreateSchoolYearDto) {
    return this.schoolYearService.saveSchoolYear(payload);
  }

  @Post('updateSchoolYear')
  @HttpCode(HttpStatus.OK)
  updateSchoolYear(@Body() payload: UpdateSchoolYearDto) {
    return this.schoolYearService.updateSchoolYear(payload);
  }

  @Post('removeSchoolYear')
  @HttpCode(HttpStatus.OK)
  removeSchoolYear(@Body() payload: { sy_id: number }) {
    return this.schoolYearService.removeSchoolYear(payload.sy_id);
  }

  @Post('loadScoolYearByYear/:scId')
  @HttpCode(HttpStatus.OK)
  loadSchoolYearByYearPost(@Param('scId', ParseIntPipe) scId: number) {
    return this.schoolYearService.loadSchoolYearByYear(scId);
  }

  @Get('loadScoolYearByYear/:scId')
  @HttpCode(HttpStatus.OK)
  loadSchoolYearByYear(@Param('scId', ParseIntPipe) scId: number) {
    return this.schoolYearService.loadSchoolYearByYear(scId);
  }

  @Get('LoadScoolYearByYear/:scId')
  @HttpCode(HttpStatus.OK)
  loadSchoolYearByYearUpper(@Param('scId', ParseIntPipe) scId: number) {
    return this.schoolYearService.loadSchoolYearByYear(scId);
  }

  @Post('change_year')
  @HttpCode(HttpStatus.OK)
  changeYear(
    @Body()
    payload: {
      sy_id: number | string;
      budget_id?: number | string;
      sc_id?: number;
    },
  ) {
    // Validate sy_id
    if (!payload.sy_id || payload.sy_id === '' || payload.sy_id === 0) {
      return { flag: false, ms: 'กรุณาเลือกปีการศึกษา' };
    }

    // Convert sy_id to number if it's a string
    const syId =
      typeof payload.sy_id === 'string'
        ? parseInt(payload.sy_id, 10)
        : payload.sy_id;
    if (isNaN(syId) || syId <= 0) {
      return { flag: false, ms: 'ปีการศึกษาไม่ถูกต้อง' };
    }

    // If budget_id is provided, use it; otherwise use sy_id
    const budgetSyId = payload.budget_id
      ? typeof payload.budget_id === 'string'
        ? parseInt(payload.budget_id, 10)
        : payload.budget_id
      : syId;

    return this.schoolYearService.changeYear(
      syId,
      payload.sc_id || 0,
      budgetSyId,
    );
  }

  @Post('check_year')
  @HttpCode(HttpStatus.OK)
  checkYear() {
    return this.schoolYearService.checkYear();
  }
}
