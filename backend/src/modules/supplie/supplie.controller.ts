import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { SupplieService } from './supplie.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

/** Parse JSON query-string safely — throws 400 if malformed instead of 500 */
function parseJsonArray(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new BadRequestException('pc_order ต้องเป็น JSON array ที่ถูกต้อง');
  }
}
import { EditReceiveParcelDto } from './dto/edit-receive-parcel.dto';
import { UpdateSupplieOrderDto } from './dto/update-supplie-order.dto';
import { ConfirmWithdrawParcelDto } from './dto/confirm-withdraw-parcel.dto';
import { LoadStockSupplieDto } from './dto/load-stock-supplie.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(RolesGuard)
@Roles(1, 2, 4, 7)
@Controller('Supplie')
export class SupplieController {
  constructor(private readonly supplieService: SupplieService) {}

  @Get('loadReceive/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadReceive(scId, syId);
  }

  @Get('loadSubProject/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSubProject(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadSubProject(scId, yearId);
  }

  @Get('loadGetUserTeacher/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadGetUserTeacher(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadGetUserTeacher(scId);
  }

  @Get('loadParcelDetail/:order_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetail(
    @Param('order_id', ParseIntPipe) orderId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.loadParcelDetail(orderId, user);
  }

  @Get('loadParcelDetailWithdraw/:order_id/:receive_id/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetailWithdraw(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Param('receive_id', ParseIntPipe) receiveId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadParcelDetailWithdraw(
      orderId,
      receiveId,
      scId,
    );
  }

  @Post('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplie(
    @Body() dto: LoadStockSupplieDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplieGet(
    @CurrentUser() user: JwtUser,
    @Query('sc_id') scId?: string,
    @Query('receive_id') receiveId?: string,
    @Query('pc_order') pcOrder?: string,
  ) {
    const dto: any = {
      sc_id: scId ? parseInt(scId, 10) : 0,
      receive_id: receiveId ? parseInt(receiveId, 10) : undefined,
      pc_order: parseJsonArray(pcOrder),
    };
    // ตรวจ tenant เฉพาะเมื่อระบุ sc_id มา (ไม่ระบุ = sc_id 0 → ไม่มีข้อมูลอยู่แล้ว)
    if (dto.sc_id) assertSameSchool(user, dto.sc_id);
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadSupplieOrder(scId, yearId);
  }

  @Get('loadGetSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadGetSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadGetSupplieOrder(scId, yearId);
  }

  @Get('loadResourcesPeople/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadResourcesPeople(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadResourcesPeople(scId);
  }

  @Post('editReceiveParcel')
  @HttpCode(HttpStatus.OK)
  editReceiveParcel(
    @Body() dto: EditReceiveParcelDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.supplieService.editReceiveParcel(dto);
  }

  @Post('removeReceiveParcel')
  @HttpCode(HttpStatus.OK)
  removeReceiveParcel(
    @Body() body: { receive_id: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.removeReceiveParcel(body.receive_id, user);
  }

  @Post('updateSupplieOrder')
  @HttpCode(HttpStatus.OK)
  updateSupplieOrder(
    @Body() dto: UpdateSupplieOrderDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.updateSupplieOrder(dto, user);
  }

  @Post('confirmWithDrawParcel')
  @HttpCode(HttpStatus.OK)
  confirmWithDrawParcel(
    @Body() dto: ConfirmWithdrawParcelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.confirmWithDrawParcel(dto, user);
  }

  // backward-compat: เก็บ endpoint เดิมที่มี typo (double 'i') ไว้เผื่อ Angular legacy
  @Post('confiirmWithDrawParcel')
  @HttpCode(HttpStatus.OK)
  confirmWithDrawParcelLegacy(
    @Body() dto: ConfirmWithdrawParcelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.confirmWithDrawParcel(dto, user);
  }
}

@Controller('supplie')
export class SupplieLowerController {
  constructor(private readonly supplieService: SupplieService) {}

  @Get('loadReceive/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadReceive(scId, syId);
  }

  @Get('loadSubProject/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSubProject(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadSubProject(scId, yearId);
  }

  @Get('loadGetUserTeacher/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadGetUserTeacher(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadGetUserTeacher(scId);
  }

  @Get('loadParcelDetail/:order_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetail(
    @Param('order_id', ParseIntPipe) orderId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.loadParcelDetail(orderId, user);
  }

  @Get('loadParcelDetailWithdraw/:order_id/:receive_id/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetailWithdraw(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Param('receive_id', ParseIntPipe) receiveId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadParcelDetailWithdraw(
      orderId,
      receiveId,
      scId,
    );
  }

  @Post('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplie(
    @Body() dto: LoadStockSupplieDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplieGet(
    @CurrentUser() user: JwtUser,
    @Query('sc_id') scId?: string,
    @Query('receive_id') receiveId?: string,
    @Query('pc_order') pcOrder?: string,
  ) {
    const dto: any = {
      sc_id: scId ? parseInt(scId, 10) : 0,
      receive_id: receiveId ? parseInt(receiveId, 10) : undefined,
      pc_order: parseJsonArray(pcOrder),
    };
    // ตรวจ tenant เฉพาะเมื่อระบุ sc_id มา (ไม่ระบุ = sc_id 0 → ไม่มีข้อมูลอยู่แล้ว)
    if (dto.sc_id) assertSameSchool(user, dto.sc_id);
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadSupplieOrder(scId, yearId);
  }

  @Get('loadGetSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadGetSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadGetSupplieOrder(scId, yearId);
  }

  @Get('loadResourcesPeople/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadResourcesPeople(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.supplieService.loadResourcesPeople(scId);
  }

  @Post('editReceiveParcel')
  @HttpCode(HttpStatus.OK)
  editReceiveParcel(
    @Body() dto: EditReceiveParcelDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.supplieService.editReceiveParcel(dto);
  }

  @Post('removeReceiveParcel')
  @HttpCode(HttpStatus.OK)
  removeReceiveParcel(
    @Body() body: { receive_id: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.removeReceiveParcel(body.receive_id, user);
  }

  @Post('updateSupplieOrder')
  @HttpCode(HttpStatus.OK)
  updateSupplieOrder(
    @Body() dto: UpdateSupplieOrderDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.updateSupplieOrder(dto, user);
  }

  @Post('confirmWithDrawParcel')
  @HttpCode(HttpStatus.OK)
  confirmWithDrawParcel(
    @Body() dto: ConfirmWithdrawParcelDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.supplieService.confirmWithDrawParcel(dto, user);
  }
}
