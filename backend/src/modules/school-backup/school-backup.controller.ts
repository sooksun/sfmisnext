import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SchoolBackupService } from './school-backup.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { type JwtUser } from '../../common/utils/tenant-guard';

/**
 * สำรองข้อมูลโรงเรียน — export JSON ดาวน์โหลดทาง browser
 * สงวนสิทธิ์ super admin (type=1) เท่านั้น
 */
@UseGuards(RolesGuard)
@Roles(1)
@Controller('SchoolBackup')
export class SchoolBackupController {
  constructor(private readonly service: SchoolBackupService) {}

  /** รายชื่อปีงบประมาณที่มีข้อมูล (ใช้สร้าง dropdown ที่ frontend) */
  @Get('years')
  listYears(@CurrentUser() user: JwtUser) {
    return this.service.listYears(user.sc_id);
  }

  /**
   * Export ข้อมูลเป็นไฟล์ JSON
   * ?budget_year=2568  (ถ้าไม่ส่ง → export ทุกปี)
   */
  @Get('export')
  async export(
    @CurrentUser() user: JwtUser,
    @Query('budget_year') budgetYearStr: string | undefined,
    @Res() res: Response,
  ) {
    const budgetYear = budgetYearStr ? Number(budgetYearStr) : null;
    const payload = await this.service.exportSchool(user.sc_id, budgetYear);

    const yearLabel = budgetYear ? `_${budgetYear}` : '_all';
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `backup_sc${user.sc_id}${yearLabel}_${ts}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(payload);
  }
}
