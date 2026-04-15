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

@Controller('B_school')
export class BSchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get('load_school/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchoolsGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Post('load_school/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchools(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Post('add_school')
  @HttpCode(HttpStatus.OK)
  addSchool(@Body() payload: any) {
    return this.schoolService.addSchool(payload);
  }

  @Post('update_school')
  @HttpCode(HttpStatus.OK)
  updateSchool(@Body() payload: any) {
    return this.schoolService.updateSchool(payload);
  }

  @Post('remove_school')
  @HttpCode(HttpStatus.OK)
  removeSchool(@Body() payload: any) {
    return this.schoolService.removeSchool(payload);
  }
}
