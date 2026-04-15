import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('loadChartBudgetType_Pie')
  @HttpCode(HttpStatus.OK)
  loadChartBudgetTypePie(@Body() payload: { sc_id?: number; year?: number }) {
    return this.dashboardService.loadChartBudgetTypePie(
      payload.sc_id || 0,
      payload.year,
    );
  }

  @Get('loadChartBudgetType_Pie')
  loadChartBudgetTypePieGet(
    @Query('sc_id') scId?: string,
    @Query('year') year?: string,
  ) {
    return this.dashboardService.loadChartBudgetTypePie(
      scId ? parseInt(scId, 10) : 0,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('loadChartBudgetType_Bar')
  @HttpCode(HttpStatus.OK)
  loadChartBudgetTypeBar(@Body() payload: { sc_id?: number; year?: number }) {
    return this.dashboardService.loadChartBudgetTypeBar(
      payload.sc_id || 0,
      payload.year,
    );
  }

  @Get('loadChartBudgetType_Bar')
  loadChartBudgetTypeBarGet(
    @Query('sc_id') scId?: string,
    @Query('year') year?: string,
  ) {
    return this.dashboardService.loadChartBudgetTypeBar(
      scId ? parseInt(scId, 10) : 0,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('predictBudget/:scId/:year')
  @HttpCode(HttpStatus.OK)
  predictBudgetGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
  ) {
    return this.dashboardService.predictBudget(scId, year);
  }

  @Post('predictBudget/:scId/:year')
  @HttpCode(HttpStatus.OK)
  predictBudget(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
  ) {
    return this.dashboardService.predictBudget(scId, year);
  }

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

  @Post('get_round')
  @HttpCode(HttpStatus.OK)
  getRound() {
    return this.dashboardService.getRound();
  }
}
