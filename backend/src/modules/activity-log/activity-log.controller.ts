import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { type JwtUser } from '../../common/utils/tenant-guard';

/** หน้าดูบันทึกกิจกรรม — เฉพาะผู้ดูแล (super=ดูข้ามโรงเรียน, ผอ.=โรงเรียนตัวเอง) */
@UseGuards(RolesGuard)
@Roles(1, 2)
@Controller('Activity_log')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get('list')
  @HttpCode(HttpStatus.OK)
  list(
    @Query('sc_id') scId: string,
    @Query('admin_id') adminId: string,
    @Query('module') module: string,
    @Query('action') action: string,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Query('q') q: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.list(
      {
        sc_id: Number(scId) || 0,
        admin_id: Number(adminId) || undefined,
        module: module || undefined,
        action: action || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        q: q || undefined,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 50,
      },
      user,
    );
  }

  @Get('facets/:sc_id')
  @HttpCode(HttpStatus.OK)
  facets(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.facets(user, scId);
  }
}
