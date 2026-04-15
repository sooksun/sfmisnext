import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportDailyBalanceService } from './report-daily-balance.service';

@Controller('ReportDailyBalance')
export class ReportDailyBalanceController {
  constructor(
    private readonly reportDailyBalanceService: ReportDailyBalanceService,
  ) {}

  @Get('loadDailyBalance/:scId/:date/:syId')
  @HttpCode(HttpStatus.OK)
  loadDailyBalance(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('date') date: string,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    return this.reportDailyBalanceService.loadDailyBalance(scId, date, syId);
  }

  @Get('printDailyBalanceReport/:scId/:date/:syId')
  @HttpCode(HttpStatus.OK)
  printDailyBalanceReport(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('date') date: string,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    // TODO: Implement PDF generation
    // For now, return the same data as loadDailyBalance
    // In the future, this should generate and return a PDF file
    return this.reportDailyBalanceService.loadDailyBalance(scId, date, syId);
  }
}
