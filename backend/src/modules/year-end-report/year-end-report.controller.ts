import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { YearEndReportService } from './year-end-report.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('YearEndReport')
export class YearEndReportController {
  constructor(private readonly yearEndReportService: YearEndReportService) {}

  @Get('receiptUsage/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  async getReceiptUsage(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.yearEndReportService.getReceiptUsageReport(
      scId,
      syId,
      budgetYear,
    );
  }

  @Get('schoolRevenue/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  async getSchoolRevenue(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.yearEndReportService.getSchoolRevenueReport(
      scId,
      syId,
      budgetYear,
    );
  }
}
