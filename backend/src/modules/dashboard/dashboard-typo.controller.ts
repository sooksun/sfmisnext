import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { assertSameSchool, type JwtUser } from '../../common/utils/tenant-guard';

@Controller('B_dashborad') // รองรับ typo "dashborad" แทน "dashboard"
export class DashboardTypoController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('load_dashboard')
  @HttpCode(HttpStatus.OK)
  loadDashboard(
    @Body() payload: { sc_id?: number },
    @CurrentUser() user: JwtUser,
  ) {
    const scId = payload.sc_id || 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadDashboard(scId);
  }

  @Get('load_dashboard')
  loadDashboardGet(
    @CurrentUser() user: JwtUser,
    @Query('sc_id') scIdStr?: string,
  ) {
    const scId = scIdStr ? parseInt(scIdStr, 10) : 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadDashboard(scId);
  }
}
