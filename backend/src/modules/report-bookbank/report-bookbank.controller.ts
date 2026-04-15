import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportBookbankService } from './report-bookbank.service';

@Controller('ReportRegisterBookbank')
export class ReportBookbankController {
  constructor(private readonly reportBookbankService: ReportBookbankService) {}

  @Get('loadReportRegisterBookbank/:baId/:scId/:syId/:year')
  @HttpCode(HttpStatus.OK)
  loadReportRegisterBookbank(
    @Param('baId', ParseIntPipe) baId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('year') year: string,
  ) {
    return this.reportBookbankService.loadReportRegisterBookbank(
      baId,
      scId,
      syId,
      year,
    );
  }
}
