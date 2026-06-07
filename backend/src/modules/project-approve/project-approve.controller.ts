import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProjectApproveService } from './project-approve.service';
import { ApproveParcelByPlanDto } from './dto/approve-parcel-by-plan.dto';
import { ApproveParcelByBusinessDto } from './dto/approve-parcel-by-business.dto';
import { ApproveParcelByCeoDto } from './dto/approve-parcel-by-ceo.dto';
import { LoadParcelDetailDto } from './dto/load-parcel-detail.dto';
import { AddProjectApproveDto } from './dto/add-project-approve.dto';
import { UpdateProjectApproveDto } from './dto/update-project-approve.dto';
import { RemoveParcelOrderDto } from './dto/remove-parcel-order.dto';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Project_approve')
export class ProjectApproveController {
  constructor(private readonly projectApproveService: ProjectApproveService) {}

  @Get('loadProjectApprove/:sc_id/:sy_id/:page/:page_size')
  async loadProjectApproveWithPagination(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadProjectApprove(
      scId,
      syId,
      page,
      pageSize,
    );
  }

  @Get('loadProjectApprove/:sc_id/:sy_id')
  async loadProjectApprove(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadProjectApprove(scId, syId);
  }

  @Get('loadParcelOrder/:sc_id/:ppa_id')
  async loadParcelOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('ppa_id', ParseIntPipe) ppaId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadParcelOrder(scId, ppaId);
  }

  @Post('loadParcelDetail')
  async loadParcelDetail(
    @Body() dto: LoadParcelDetailDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return await this.projectApproveService.loadParcelDetail(dto);
  }

  @Get('loadParcelDetail/:sc_id/:order_id')
  async loadParcelDetailGet(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('order_id', ParseIntPipe) orderId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadParcelDetail({
      sc_id: scId,
      order_id: orderId,
    });
  }

  @Get('loadSuppilesByOrderID/:order_id')
  async loadSuppilesByOrderID(
    @Param('order_id', ParseIntPipe) orderId: number,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.loadSuppilesByOrderID(
      orderId,
      scId,
    );
  }

  @Get('loadOrderForPrint/:order_id')
  async loadOrderForPrint(
    @Param('order_id', ParseIntPipe) orderId: number,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.loadOrderForPrint(orderId, scId);
  }

  @Get('loadBudgetBalance/:order_id/:project_id/:sc_id/:year')
  async loadBudgetBalance(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Param('project_id', ParseIntPipe) projectId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year', ParseIntPipe) year: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadBudgetBalance(
      orderId,
      projectId,
      scId,
      year,
    );
  }

  @Post('approveParcelByPlan')
  async approveParcelByPlan(
    @Body() dto: ApproveParcelByPlanDto,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.approveParcelByPlan(dto, scId);
  }

  @Post('approveParcelByBusiness')
  async approveParcelByBusiness(
    @Body() dto: ApproveParcelByBusinessDto,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.approveParcelByBusiness(dto, scId);
  }

  @Post('approveParcelBySupplie')
  async approveParcelBySupplie(
    @Body()
    dto: {
      order_id: number;
      order_status: number;
      remark?: string;
      remark_cf?: string;
    },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.approveParcelBySupplie(dto, scId);
  }

  @Post('approveParcelByCeo')
  async approveParcelByCeo(
    @Body() dto: ApproveParcelByCeoDto,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.approveParcelByCeo(dto, scId);
  }

  @Post('addProjectApprove')
  async addProjectApprove(
    @Body() dto: AddProjectApproveDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return await this.projectApproveService.addProjectApprove(dto);
  }

  @Post('updateProjectApprove')
  async updateProjectApprove(
    @Body() dto: UpdateProjectApproveDto,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.updateProjectApprove(dto, scId);
  }

  @Post('removeParcelOrder')
  async removeParcelOrder(
    @Body() dto: RemoveParcelOrderDto,
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.removeParcelOrder(dto, scId);
  }

  @Post('updateParcelOrder')
  @HttpCode(HttpStatus.OK)
  async updateParcelOrder(
    @Body()
    dto: {
      order_id: number;
      project_type?: number;
      method_type?: number;
      method_reason?: string;
      details?: string;
      budgets?: number;
      up_by?: number;
    },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.updateParcelOrder(dto, scId);
  }

  @Post('addParcelDetail')
  @HttpCode(HttpStatus.OK)
  async addParcelDetail(
    @Body() dto: { order_id: number; supp_id: number; pc_total: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.addParcelDetail(dto, scId);
  }

  @Post('removeParcelDetail')
  @HttpCode(HttpStatus.OK)
  async removeParcelDetail(
    @Body() dto: { pc_id: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.removeParcelDetail(dto, scId);
  }

  @Post('cancelParcelOrder')
  @HttpCode(HttpStatus.OK)
  async cancelParcelOrder(
    @Body()
    dto: { order_id: number; cancel_reason: string; up_by?: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.cancelParcelOrder(dto, scId);
  }

  @Post('setParcelOrderUrgent')
  @HttpCode(HttpStatus.OK)
  async setParcelOrderUrgent(
    @Body()
    dto: {
      order_id: number;
      is_urgent: number;
      urgent_clause?: string;
      urgent_reason?: string;
      up_by?: number;
    },
    @CurrentUser('sc_id') scId: number,
  ) {
    return await this.projectApproveService.setParcelOrderUrgent(dto, scId);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadPartner(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadPartner(scId);
  }

  @Get('loadProject/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadProject(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadProject(scId);
  }

  @Get('loadDirector/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadDirector(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return await this.projectApproveService.loadDirector(scId);
  }
}
