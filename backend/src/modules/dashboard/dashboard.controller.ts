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
import { CurrentUser } from '../auth/current-user.decorator';
import { assertSameSchool, type JwtUser } from '../../common/utils/tenant-guard';

@Controller('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('loadChartBudgetType_Pie')
  @HttpCode(HttpStatus.OK)
  loadChartBudgetTypePie(
    @Body() payload: { sc_id?: number; year?: number },
    @CurrentUser() user: JwtUser,
  ) {
    const scId = payload.sc_id || 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadChartBudgetTypePie(scId, payload.year);
  }

  @Get('loadChartBudgetType_Pie')
  loadChartBudgetTypePieGet(
    @CurrentUser() user: JwtUser,
    @Query('sc_id') scIdStr?: string,
    @Query('year') year?: string,
  ) {
    const scId = scIdStr ? parseInt(scIdStr, 10) : 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadChartBudgetTypePie(
      scId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('loadChartBudgetType_Bar')
  @HttpCode(HttpStatus.OK)
  loadChartBudgetTypeBar(
    @Body() payload: { sc_id?: number; year?: number },
    @CurrentUser() user: JwtUser,
  ) {
    const scId = payload.sc_id || 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadChartBudgetTypeBar(scId, payload.year);
  }

  @Get('loadChartBudgetType_Bar')
  loadChartBudgetTypeBarGet(
    @CurrentUser() user: JwtUser,
    @Query('sc_id') scIdStr?: string,
    @Query('year') year?: string,
  ) {
    const scId = scIdStr ? parseInt(scIdStr, 10) : 0;
    assertSameSchool(user, scId);
    return this.dashboardService.loadChartBudgetTypeBar(
      scId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('predictBudget/:scId/:year')
  @HttpCode(HttpStatus.OK)
  predictBudgetGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.dashboardService.predictBudget(scId, year);
  }

  @Post('predictBudget/:scId/:year')
  @HttpCode(HttpStatus.OK)
  predictBudget(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.dashboardService.predictBudget(scId, year);
  }

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

  @Post('get_round')
  @HttpCode(HttpStatus.OK)
  getRound(@CurrentUser('sc_id') scId: number) {
    return this.dashboardService.getRound(scId);
  }
}
