import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportBookbankService } from './report-bookbank.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportBookbankService.loadReportRegisterBookbank(
      baId,
      scId,
      syId,
      year,
    );
  }
}
