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

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_contract')
export class SupplieContractController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id')
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Query('order_id') orderId?: string,
  ) {
    return this.service.loadContract(
      scId,
      orderId ? Number(orderId) : undefined,
    );
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any) {
    return this.service.saveContract(body);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() body: { ct_id: number; up_by?: number }) {
    return this.service.removeContract(body.ct_id, body.up_by ?? 0);
  }

  @Get('expiring-warranty/:sc_id')
  @HttpCode(HttpStatus.OK)
  getExpiringWarranty(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Query('days') days?: string,
  ) {
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
    @Query('order_id') orderId?: string,
  ) {
    return this.service.loadInspection(
      scId,
      orderId ? Number(orderId) : undefined,
    );
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any) {
    return this.service.saveInspection(body);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() body: { insp_id: number; up_by?: number }) {
    return this.service.removeInspection(body.insp_id, body.up_by ?? 0);
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
  ) {
    return this.service.loadAnnualCheck(scId, acadYear);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any) {
    return this.service.saveAnnualCheck(body);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() body: { ac_id: number; up_by?: number }) {
    return this.service.removeAnnualCheck(body.ac_id, body.up_by ?? 0);
  }
}

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('Supplie_disposal')
export class SupplieDisposalController {
  constructor(private readonly service: SupplieExtService) {}

  @Get('load/:sc_id')
  load(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.service.loadDisposal(scId);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() body: any) {
    return this.service.saveDisposal(body);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  execute(@Body() body: { dp_id: number; up_by?: number }) {
    return this.service.executeDisposal(body.dp_id, body.up_by ?? 0);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() body: { dp_id: number; up_by?: number }) {
    return this.service.removeDisposal(body.dp_id, body.up_by ?? 0);
  }
}
