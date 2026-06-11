import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportCheckControlService } from './report-check-control.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportCheckControlService.loadCheckControl(scId, syId);
  }
}
