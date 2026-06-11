import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UnifiedRegisterService } from './unified-register.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('UnifiedRegister')
export class UnifiedRegisterController {
  constructor(
    private readonly unifiedRegisterService: UnifiedRegisterService,
  ) {}

  /**
   * GET UnifiedRegister/summary/:sc_id/:sy_id/:year
   * Returns totals per budget type (only types with transactions).
   */
  @Get('summary/:sc_id/:sy_id/:year')
  @HttpCode(HttpStatus.OK)
  getSummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.unifiedRegisterService.getSummary(scId, syId, year);
  }

  /**
   * GET UnifiedRegister/detail/:sc_id/:sy_id/:year/:bg_type_id?from_date=&to_date=
   * Returns per-transaction detail for one budget type with optional date filter.
   */
  @Get('detail/:sc_id/:sy_id/:year/:bg_type_id')
  @HttpCode(HttpStatus.OK)
  getRegisterDetail(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @Param('bg_type_id', ParseIntPipe) bgTypeId: number,
    @CurrentUser() user: JwtUser,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    assertSameSchool(user, scId);
    return this.unifiedRegisterService.getRegisterDetail(
      bgTypeId,
      scId,
      syId,
      year,
      fromDate,
      toDate,
    );
  }

  /**
   * GET UnifiedRegister/schoolRevenueReport/:sc_id/:sy_id/:year/:bg_type_id
   * รายงานการรับ-จ่ายเงินรายได้สถานศึกษา (form-030) จัดหมวดอัตโนมัติ
   */
  @Get('schoolRevenueReport/:sc_id/:sy_id/:year/:bg_type_id')
  @HttpCode(HttpStatus.OK)
  getSchoolRevenueReport(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @Param('bg_type_id', ParseIntPipe) bgTypeId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.unifiedRegisterService.getSchoolRevenueReport(
      scId,
      syId,
      year,
      bgTypeId,
    );
  }
}
