import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('B_dashborad') // รองรับ typo "dashborad" แทน "dashboard"
export class DashboardTypoController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('load_dashboard')
  @HttpCode(HttpStatus.OK)
  loadDashboard(@Body() payload: { sc_id?: number }) {
    return this.dashboardService.loadDashboard(payload.sc_id || 0);
  }

  @Get('load_dashboard')
  loadDashboardGet(@Query('sc_id') scId?: string) {
    return this.dashboardService.loadDashboard(
      scId ? parseInt(scId, 10) : 0,
    );
  }
}
