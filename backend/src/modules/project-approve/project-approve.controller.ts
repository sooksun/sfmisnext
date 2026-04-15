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
import { ProjectApproveService } from './project-approve.service';
import { ApproveParcelByPlanDto } from './dto/approve-parcel-by-plan.dto';
import { ApproveParcelByBusinessDto } from './dto/approve-parcel-by-business.dto';
import { ApproveParcelByCeoDto } from './dto/approve-parcel-by-ceo.dto';
import { LoadParcelDetailDto } from './dto/load-parcel-detail.dto';
import { AddProjectApproveDto } from './dto/add-project-approve.dto';
import { UpdateProjectApproveDto } from './dto/update-project-approve.dto';
import { RemoveParcelOrderDto } from './dto/remove-parcel-order.dto';

@Controller('Project_approve')
export class ProjectApproveController {
  constructor(private readonly projectApproveService: ProjectApproveService) {}

  @Get('loadProjectApprove/:sc_id/:sy_id/:page/:page_size')
  async loadProjectApproveWithPagination(
    @Param('sc_id') scId: number,
    @Param('sy_id') syId: number,
    @Param('page') page: number,
    @Param('page_size') pageSize: number,
  ) {
    return await this.projectApproveService.loadProjectApprove(
      scId,
      syId,
      page,
      pageSize,
    );
  }

  @Get('loadProjectApprove/:sc_id/:sy_id')
  async loadProjectApprove(
    @Param('sc_id') scId: number,
    @Param('sy_id') syId: number,
  ) {
    return await this.projectApproveService.loadProjectApprove(scId, syId);
  }

  @Get('loadParcelOrder/:sc_id/:ppa_id')
  async loadParcelOrder(
    @Param('sc_id') scId: number,
    @Param('ppa_id') ppaId: number,
  ) {
    return await this.projectApproveService.loadParcelOrder(scId, ppaId);
  }

  @Post('loadParcelDetail')
  async loadParcelDetail(@Body() dto: LoadParcelDetailDto) {
    return await this.projectApproveService.loadParcelDetail(dto);
  }

  @Get('loadParcelDetail/:sc_id/:order_id')
  async loadParcelDetailGet(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('order_id', ParseIntPipe) orderId: number,
  ) {
    return await this.projectApproveService.loadParcelDetail({
      sc_id: scId,
      order_id: orderId,
    });
  }

  @Get('loadSuppilesByOrderID/:order_id')
  async loadSuppilesByOrderID(@Param('order_id') orderId: number) {
    return await this.projectApproveService.loadSuppilesByOrderID(orderId);
  }

  @Get('loadBudgetBalance/:order_id/:project_id/:sc_id/:year')
  async loadBudgetBalance(
    @Param('order_id') orderId: number,
    @Param('project_id') projectId: number,
    @Param('sc_id') scId: number,
    @Param('year') year: number,
  ) {
    return await this.projectApproveService.loadBudgetBalance(
      orderId,
      projectId,
      scId,
      year,
    );
  }

  @Post('approveParcelByPlan')
  async approveParcelByPlan(@Body() dto: ApproveParcelByPlanDto) {
    return await this.projectApproveService.approveParcelByPlan(dto);
  }

  @Post('approveParcelByBusiness')
  async approveParcelByBusiness(@Body() dto: ApproveParcelByBusinessDto) {
    return await this.projectApproveService.approveParcelByBusiness(dto);
  }

  @Post('approveParcelBySupplie')
  async approveParcelBySupplie(@Body() dto: any) {
    return await this.projectApproveService.approveParcelBySupplie(dto);
  }

  @Post('approveParcelByCeo')
  async approveParcelByCeo(@Body() dto: ApproveParcelByCeoDto) {
    return await this.projectApproveService.approveParcelByCeo(dto);
  }

  @Post('addProjectApprove')
  async addProjectApprove(@Body() dto: AddProjectApproveDto) {
    return await this.projectApproveService.addProjectApprove(dto);
  }

  @Post('updateProjectApprove')
  async updateProjectApprove(@Body() dto: UpdateProjectApproveDto) {
    return await this.projectApproveService.updateProjectApprove(dto);
  }

  @Post('removeParcelOrder')
  async removeParcelOrder(@Body() dto: RemoveParcelOrderDto) {
    return await this.projectApproveService.removeParcelOrder(dto);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadPartner(@Param('sc_id', ParseIntPipe) scId: number) {
    return await this.projectApproveService.loadPartner(scId);
  }

  @Get('loadProject/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadProject(@Param('sc_id', ParseIntPipe) scId: number) {
    return await this.projectApproveService.loadProject(scId);
  }

  @Get('loadDirector/:sc_id')
  @HttpCode(HttpStatus.OK)
  async loadDirector(@Param('sc_id', ParseIntPipe) scId: number) {
    return await this.projectApproveService.loadDirector(scId);
  }
}
