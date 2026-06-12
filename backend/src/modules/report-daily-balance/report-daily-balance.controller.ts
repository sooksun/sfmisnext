import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ReportDailyBalanceService } from './report-daily-balance.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportDailyBalanceService.loadDailyBalance(scId, date, syId);
  }

  @Get('printDailyBalanceReport/:scId/:date/:syId')
  @HttpCode(HttpStatus.OK)
  printDailyBalanceReport(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('date') date: string,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportDailyBalanceService.loadDailyBalance(scId, date, syId);
  }

  @Get('cashLimitCheck/:scId')
  @HttpCode(HttpStatus.OK)
  cashLimitCheck(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportDailyBalanceService.loadCashLimitCheck(scId);
  }

  /** เช็คเงินสดเกินวงเงิน "เฉพาะปีงบ" — กันยอดข้ามปีปนกัน (แนะนำให้ frontend ใช้) */
  @Get('cashLimitCheck/:scId/:syId')
  @HttpCode(HttpStatus.OK)
  cashLimitCheckByYear(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.reportDailyBalanceService.loadCashLimitCheck(scId, syId);
  }

  @Post('setCashLimit')
  @HttpCode(HttpStatus.OK)
  setCashLimit(
    @Body()
    dto: {
      sc_id: number;
      limit_amount: number;
      note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.reportDailyBalanceService.setCashLimit(dto);
  }
}
