import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { type JwtUser } from '../../common/utils/tenant-guard';
import { AreaService } from './area.service';

/** ตรวจ tenant สำหรับ area — type=9 ดูได้เฉพาะ areacode ตัวเอง, type=1 ดูได้ทุกเขต */
function resolveAreacode(user: JwtUser, requested?: string): string {
  if (user.type === 1) {
    if (!requested) throw new ForbiddenException('กรุณาระบุ areacode');
    return requested;
  }
  if (user.type === 9) {
    if (!user.areacode) throw new ForbiddenException('บัญชีไม่มีรหัสเขตพื้นที่');
    return user.areacode;
  }
  throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลระดับเขตพื้นที่');
}

@Controller('area')
@Roles(1, 9)
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  /** ภาพรวมเขต: รับ/จ่าย/โครงการ/นักเรียน/ประเมิน รวม + รายโรงเรียน */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  getDashboard(
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getDashboard(areacode, budgetYear);
  }

  /** แผนงาน/โครงการ รายโรงเรียน */
  @Get('plan')
  @HttpCode(HttpStatus.OK)
  getPlan(
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getPlanSummary(areacode, budgetYear);
  }

  /** การเงิน รายโรงเรียน + รายเดือน */
  @Get('finance')
  @HttpCode(HttpStatus.OK)
  getFinance(
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getFinanceSummary(areacode, budgetYear);
  }

  /** พัสดุ/จัดซื้อ รายโรงเรียน */
  @Get('supply')
  @HttpCode(HttpStatus.OK)
  getSupply(
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getSupplySummary(areacode, budgetYear);
  }

  /** รายชื่อโรงเรียนในเขต (สำหรับ dropdown selector) */
  @Get('schools')
  @HttpCode(HttpStatus.OK)
  listSchools(
    @CurrentUser() user: JwtUser,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    return this.areaService.listSchools(areacode);
  }

  /** รายงานแผนงาน/โครงการ รายโรงเรียน */
  @Get('school/:scId/plan')
  @HttpCode(HttpStatus.OK)
  getSchoolPlan(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getSchoolPlanDetail(areacode, scId, budgetYear);
  }

  /** รายงานการเงิน รายโรงเรียน */
  @Get('school/:scId/finance')
  @HttpCode(HttpStatus.OK)
  getSchoolFinance(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getSchoolFinanceDetail(areacode, scId, budgetYear);
  }

  /** รายงานพัสดุ รายโรงเรียน */
  @Get('school/:scId/supply')
  @HttpCode(HttpStatus.OK)
  getSchoolSupply(
    @Param('scId', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr?: string,
    @Query('areacode') areacodeParam?: string,
  ) {
    const areacode = resolveAreacode(user, areacodeParam);
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : new Date().getFullYear() + 543;
    return this.areaService.getSchoolSupplyDetail(areacode, scId, budgetYear);
  }
}
