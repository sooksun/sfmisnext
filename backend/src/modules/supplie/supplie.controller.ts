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
} from '@nestjs/common';
import { SupplieService } from './supplie.service';
import { EditReceiveParcelDto } from './dto/edit-receive-parcel.dto';
import { UpdateSupplieOrderDto } from './dto/update-supplie-order.dto';
import { ConfirmWithdrawParcelDto } from './dto/confirm-withdraw-parcel.dto';
import { LoadStockSupplieDto } from './dto/load-stock-supplie.dto';

@Controller('Supplie')
export class SupplieController {
  constructor(private readonly supplieService: SupplieService) {}

  @Get('loadReceive/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.supplieService.loadReceive(scId, syId);
  }

  @Get('loadSubProject/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSubProject(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
  ) {
    return this.supplieService.loadSubProject(scId, yearId);
  }

  @Get('loadGetUserTeacher/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadGetUserTeacher(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.supplieService.loadGetUserTeacher(scId);
  }

  @Get('loadParcelDetail/:order_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetail(@Param('order_id', ParseIntPipe) orderId: number) {
    return this.supplieService.loadParcelDetail(orderId);
  }

  @Get('loadParcelDetailWithdraw/:order_id/:receive_id/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetailWithdraw(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Param('receive_id', ParseIntPipe) receiveId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
  ) {
    return this.supplieService.loadParcelDetailWithdraw(
      orderId,
      receiveId,
      scId,
    );
  }

  @Post('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplie(@Body() dto: LoadStockSupplieDto) {
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplieGet(
    @Query('sc_id') scId?: string,
    @Query('receive_id') receiveId?: string,
    @Query('pc_order') pcOrder?: string,
  ) {
    const dto: any = {
      sc_id: scId ? parseInt(scId, 10) : 0,
      receive_id: receiveId ? parseInt(receiveId, 10) : undefined,
      pc_order: pcOrder ? JSON.parse(pcOrder) : [],
    };
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
  ) {
    return this.supplieService.loadSupplieOrder(scId, yearId);
  }

  @Get('loadGetSupplieOrder/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadGetSupplieOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
  ) {
    return this.supplieService.loadGetSupplieOrder(scId, yearId);
  }

  @Get('loadResourcesPeople/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadResourcesPeople(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.supplieService.loadResourcesPeople(scId);
  }

  @Post('editReceiveParcel')
  @HttpCode(HttpStatus.OK)
  editReceiveParcel(@Body() dto: EditReceiveParcelDto) {
    return this.supplieService.editReceiveParcel(dto);
  }

  @Post('removeReceiveParcel')
  @HttpCode(HttpStatus.OK)
  removeReceiveParcel(@Body() body: { receive_id: number }) {
    return this.supplieService.removeReceiveParcel(body.receive_id);
  }

  @Post('updateSupplieOrder')
  @HttpCode(HttpStatus.OK)
  updateSupplieOrder(@Body() dto: UpdateSupplieOrderDto) {
    return this.supplieService.updateSupplieOrder(dto);
  }

  @Post('confiirmWithDrawParcel')
  @HttpCode(HttpStatus.OK)
  confirmWithDrawParcel(@Body() dto: ConfirmWithdrawParcelDto) {
    return this.supplieService.confirmWithDrawParcel(dto);
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
  ) {
    return this.supplieService.loadReceive(scId, syId);
  }

  @Get('loadSubProject/:sc_id/:year_id')
  @HttpCode(HttpStatus.OK)
  loadSubProject(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year_id', ParseIntPipe) yearId: number,
  ) {
    return this.supplieService.loadSubProject(scId, yearId);
  }

  @Get('loadGetUserTeacher/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadGetUserTeacher(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.supplieService.loadGetUserTeacher(scId);
  }

  @Get('loadParcelDetail/:order_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetail(@Param('order_id', ParseIntPipe) orderId: number) {
    return this.supplieService.loadParcelDetail(orderId);
  }

  @Get('loadParcelDetailWithdraw/:order_id/:receive_id/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadParcelDetailWithdraw(
    @Param('order_id', ParseIntPipe) orderId: number,
    @Param('receive_id', ParseIntPipe) receiveId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
  ) {
    return this.supplieService.loadParcelDetailWithdraw(
      orderId,
      receiveId,
      scId,
    );
  }

  @Post('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplie(@Body() dto: LoadStockSupplieDto) {
    return this.supplieService.loadStockSupplie(dto);
  }

  @Get('loadStockSupplie')
  @HttpCode(HttpStatus.OK)
  loadStockSupplieGet(
    @Query('sc_id') scId?: string,
    @Query('receive_id') receiveId?: string,
    @Query('pc_order') pcOrder?: string,
  ) {
    const dto: any = {
      sc_id: scId ? parseInt(scId, 10) : 0,
      receive_id: receiveId ? parseInt(receiveId, 10) : undefined,
      pc_order: pcOrder ? JSON.parse(pcOrder) : [],
    };
    return this.supplieService.loadStockSupplie(dto);
  }

  @Post('editReceiveParcel')
  @HttpCode(HttpStatus.OK)
  editReceiveParcel(@Body() dto: EditReceiveParcelDto) {
    return this.supplieService.editReceiveParcel(dto);
  }

  @Post('removeReceiveParcel')
  @HttpCode(HttpStatus.OK)
  removeReceiveParcel(@Body() body: { receive_id: number }) {
    return this.supplieService.removeReceiveParcel(body.receive_id);
  }
}
