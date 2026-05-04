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
import { FinancialAuditService } from './financial-audit.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  FINANCE_TYPES,
  COMMITTEE_TYPES,
  DIRECTOR_TYPES,
} from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';
import { SignDailyDto } from './dto/sign-daily.dto';
import { SignMonthlyDto } from './dto/sign-monthly.dto';

// role=1 (finance), role=2 (committee), role=3 (director) รวมกัน
const ALL_SIGNER_TYPES = [
  ...new Set([...FINANCE_TYPES, ...COMMITTEE_TYPES, ...DIRECTOR_TYPES]),
] as number[];

@Controller('FinancialAudit')
export class FinancialAuditController {
  constructor(private readonly financialAuditService: FinancialAuditService) {}

  /** สถานะลงนามรายวัน */
  @Get('dailyStatus/:sc_id/:sy_id/:date')
  @HttpCode(HttpStatus.OK)
  loadDailyAuditStatus(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('date') date: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.financialAuditService.loadDailyAuditStatus(scId, syId, date);
  }

  /** ลงนามรายวัน — รองรับ signer_role 1=finance, 2=committee, 3=director */
  @Post('signDaily')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...ALL_SIGNER_TYPES)
  signDaily(@Body() dto: SignDailyDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.financialAuditService.signDaily(dto);
  }

  /** สถานะลงนามรายเดือน */
  @Get('monthlyStatus/:sc_id/:sy_id/:month')
  @HttpCode(HttpStatus.OK)
  loadMonthlyAuditStatus(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('month') month: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.financialAuditService.loadMonthlyAuditStatus(scId, syId, month);
  }

  /** ลงนามรายเดือน (ผู้อำนวยการ) */
  @Post('signMonthly')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...DIRECTOR_TYPES)
  signMonthly(@Body() dto: SignMonthlyDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.financialAuditService.signMonthly(dto);
  }

  /** ประวัติการลงนามทั้งปี */
  @Get('history/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadAuditHistory(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.financialAuditService.loadAuditHistory(scId, syId);
  }

  /** ตรวจ snapshot ตรงกับยอดปัจจุบันหรือไม่ (integrity check) */
  @Get('verifyDaily/:sc_id/:sy_id/:date')
  @HttpCode(HttpStatus.OK)
  verifyDailySnapshot(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('date') date: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.financialAuditService.verifyDailySnapshot(scId, syId, date);
  }

  /** สรุปการลงนามประจำเดือน (สำหรับ director review) */
  @Get('monthSummary/:sc_id/:sy_id/:month')
  @HttpCode(HttpStatus.OK)
  loadMonthSummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('month') month: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.financialAuditService.loadMonthSummary(scId, syId, month);
  }
}
