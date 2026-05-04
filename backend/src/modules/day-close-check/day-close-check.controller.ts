import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DayCloseCheckService } from './day-close-check.service';

@Controller('DayCloseCheck')
export class DayCloseCheckController {
  constructor(private readonly dayCloseCheckService: DayCloseCheckService) {}

  /**
   * GET DayCloseCheck/runCheck/:sc_id/:sy_id/:check_date
   * ตรวจสอบก่อนปิดวัน — check_date = YYYY-MM-DD
   */
  @Get('runCheck/:sc_id/:sy_id/:check_date')
  @HttpCode(HttpStatus.OK)
  async runCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('check_date') checkDate: string,
  ) {
    return this.dayCloseCheckService.runDayCloseCheck(scId, syId, checkDate);
  }

  /**
   * GET DayCloseCheck/timeline/:sc_id/:ref_type/:ref_id
   * โหลด timeline ของเอกสาร — ref_type: receipt | check | invoice | loan
   */
  @Get('timeline/:sc_id/:ref_type/:ref_id')
  @HttpCode(HttpStatus.OK)
  async getTimeline(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('ref_type') refType: string,
    @Param('ref_id', ParseIntPipe) refId: number,
  ) {
    return this.dayCloseCheckService.getTimeline(scId, refType, refId);
  }
}
