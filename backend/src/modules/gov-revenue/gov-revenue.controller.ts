import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GovRevenueService } from './gov-revenue.service';
import { AddGovRevenueDto } from './dto/add-gov-revenue.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('GovRevenue')
export class GovRevenueController {
  constructor(private readonly govRevenueService: GovRevenueService) {}

  /** โหลดรายการ + running balance ตามประเภทเงิน */
  @Get('loadEntries/:sc_id/:sy_id/:budget_year/:revenue_type')
  @HttpCode(HttpStatus.OK)
  loadEntries(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @Param('revenue_type', ParseIntPipe) revenueType: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.govRevenueService.loadEntries(
      scId,
      syId,
      budgetYear,
      revenueType,
    );
  }

  /** สรุปยอดทุกประเภท + alert เมื่อ ≥10,000 */
  @Get('monthlySummary/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  monthlySummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.govRevenueService.monthlySummary(scId, syId, budgetYear);
  }

  /** เตือนรอบดอกเบี้ย (30 มิ.ย./30 ธ.ค.) + ยอดค้างนำส่งรายได้แผ่นดิน */
  @Get('interestReminder/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  interestReminder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.govRevenueService.interestReminder(scId, syId, budgetYear);
  }

  /** เพิ่มรายการ */
  @Post('addEntry')
  @HttpCode(HttpStatus.OK)
  addEntry(@Body() dto: AddGovRevenueDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.govRevenueService.addEntry(dto);
  }

  /** แก้ไขรายการ */
  @Post('updateEntry/:gre_id')
  @HttpCode(HttpStatus.OK)
  updateEntry(
    @Param('gre_id', ParseIntPipe) greId: number,
    @Body() dto: Partial<AddGovRevenueDto>,
    @CurrentUser() user: JwtUser,
  ) {
    return this.govRevenueService.updateEntry(greId, dto, user);
  }

  /** ลบรายการ (soft delete) */
  @Post('removeEntry')
  @HttpCode(HttpStatus.OK)
  removeEntry(
    @Body() dto: { gre_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.govRevenueService.removeEntry(dto.gre_id, dto.up_by, user);
  }
}
