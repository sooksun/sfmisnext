import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportCheckControlService } from './report-check-control.service';

@Controller('ReportCheckControl')
export class ReportCheckControlController {
  constructor(
    private readonly reportCheckControlService: ReportCheckControlService,
  ) {}

  @Get('loadCheckControl/:scId/:syId')
  @HttpCode(HttpStatus.OK)
  loadCheckControl(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
  ) {
    return this.reportCheckControlService.loadCheckControl(scId, syId);
  }
}
