import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProcurementPlanService } from './procurement-plan.service';
import {
  AddPlanDto,
  UpdatePlanDto,
  AnnouncePlanDto,
  AddPlanItemDto,
  UpdatePlanItemDto,
} from './dto/procurement-plan.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Procurement_plan')
export class ProcurementPlanController {
  constructor(private readonly service: ProcurementPlanService) {}

  @Get('loadPlan/:sc_id/:acad_year')
  loadPlan(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('acad_year', ParseIntPipe) acadYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadPlan(scId, acadYear);
  }

  @Get('loadPlanDetail/:pp_id')
  loadPlanDetail(
    @Param('pp_id', ParseIntPipe) ppId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.loadPlanDetail(ppId, user);
  }

  @Get('loadAvailablePlan/:sc_id/:acad_year')
  loadAvailablePlan(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('acad_year', ParseIntPipe) acadYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadAvailablePlan(scId, acadYear);
  }

  @Get('progress/:sc_id/:acad_year')
  @HttpCode(HttpStatus.OK)
  progressReport(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('acad_year', ParseIntPipe) acadYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.progressReport(scId, acadYear);
  }

  @Post('addPlan')
  @HttpCode(HttpStatus.OK)
  addPlan(@Body() dto: AddPlanDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addPlan(dto);
  }

  @Post('updatePlan')
  @HttpCode(HttpStatus.OK)
  updatePlan(@Body() dto: UpdatePlanDto, @CurrentUser() user: JwtUser) {
    return this.service.updatePlan(dto, user);
  }

  @Post('removePlan')
  @HttpCode(HttpStatus.OK)
  removePlan(
    @Body() body: { pp_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removePlan(body.pp_id, body.up_by ?? 0, user);
  }

  @Post('announcePlan')
  @HttpCode(HttpStatus.OK)
  announcePlan(@Body() dto: AnnouncePlanDto, @CurrentUser() user: JwtUser) {
    return this.service.announcePlan(dto, user);
  }

  @Post('addPlanItem')
  @HttpCode(HttpStatus.OK)
  addPlanItem(@Body() dto: AddPlanItemDto, @CurrentUser() user: JwtUser) {
    return this.service.addPlanItem(dto, user);
  }

  @Post('updatePlanItem')
  @HttpCode(HttpStatus.OK)
  updatePlanItem(@Body() dto: UpdatePlanItemDto, @CurrentUser() user: JwtUser) {
    return this.service.updatePlanItem(dto, user);
  }

  @Post('removePlanItem')
  @HttpCode(HttpStatus.OK)
  removePlanItem(
    @Body() body: { ppi_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removePlanItem(body.ppi_id, body.up_by ?? 0, user);
  }
}
