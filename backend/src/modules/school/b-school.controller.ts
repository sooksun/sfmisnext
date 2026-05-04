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
import { SchoolService } from './school.service';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('B_school')
export class BSchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get('load_school/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchoolsGet(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Post('load_school/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  loadSchools(
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
  ) {
    return this.schoolService.loadSchools(page, pageSize);
  }

  @Post('add_school')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  addSchool(@Body() payload: any) {
    return this.schoolService.addSchool(payload);
  }

  @Post('update_school')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  updateSchool(@Body() payload: any) {
    return this.schoolService.updateSchool(payload);
  }

  @Post('remove_school')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1)
  removeSchool(@Body() payload: any) {
    return this.schoolService.removeSchool(payload);
  }
}
