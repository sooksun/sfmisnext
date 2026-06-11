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
  UseGuards,
} from '@nestjs/common';
import { SupplieExtService } from './supplie-ext.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_contract')
export class SupplieContractController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id')
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('order_id') orderId?: string,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadContract(
      scId,
      orderId ? Number(orderId) : undefined,
    );
  }

  // รายการใบขอจัดซื้อ/จ้างที่พร้อมทำสัญญา (ตั้งกรรมการแล้ว) สำหรับ dropdown
  @Get('orders-ready/:sc_id')
  ordersReady(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadOrdersReadyForContract(scId);
  }

  // เลขที่สัญญาถัดไปแบบอัตโนมัติ <ลำดับ>/<ปีงบประมาณ พ.ศ.>
  @Get('next-no/:sc_id')
  nextNo(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('year') year?: string,
  ) {
    assertSameSchool(user, scId);
    return this.service.getNextContractNo(scId, year ? Number(year) : 0);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any, @CurrentUser() user: JwtUser) {
    if (body.sc_id != null) assertSameSchool(user, Number(body.sc_id));
    return this.service.saveContract(body, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() body: { ct_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removeContract(body.ct_id, body.up_by ?? 0, user);
  }

  @Get('expiring-warranty/:sc_id')
  @HttpCode(HttpStatus.OK)
  getExpiringWarranty(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('days') days?: string,
  ) {
    assertSameSchool(user, scId);
    return this.service.getExpiringWarranty(scId, days ? Number(days) : 90);
  }
}

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_inspection')
export class SupplieInspectionController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id')
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('order_id') orderId?: string,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadInspection(
      scId,
      orderId ? Number(orderId) : undefined,
    );
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any, @CurrentUser() user: JwtUser) {
    if (body.sc_id != null) assertSameSchool(user, Number(body.sc_id));
    return this.service.saveInspection(body, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() body: { insp_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removeInspection(body.insp_id, body.up_by ?? 0, user);
  }
}

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_annual_check')
export class SupplieAnnualCheckController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id/:acad_year')
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('acad_year', ParseIntPipe) acadYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadAnnualCheck(scId, acadYear);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any, @CurrentUser() user: JwtUser) {
    if (body.sc_id != null) assertSameSchool(user, Number(body.sc_id));
    return this.service.saveAnnualCheck(body, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() body: { ac_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removeAnnualCheck(body.ac_id, body.up_by ?? 0, user);
  }
}

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_disposal')
export class SupplieDisposalController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id')
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadDisposal(scId);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any, @CurrentUser() user: JwtUser) {
    if (body.sc_id != null) assertSameSchool(user, Number(body.sc_id));
    return this.service.saveDisposal(body, user);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  execute(
    @Body() body: { dp_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.executeDisposal(body.dp_id, body.up_by ?? 0, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() body: { dp_id: number; up_by?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removeDisposal(body.dp_id, body.up_by ?? 0, user);
  }
}
