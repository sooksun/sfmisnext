import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SchoolYearService } from './school-year.service';

@Controller('School_year')
export class SchoolYearUpperController {
  constructor(private readonly schoolYearService: SchoolYearService) {}

  @Post('check_year')
  @HttpCode(HttpStatus.OK)
  checkYear() {
    return this.schoolYearService.checkYear();
  }
}
