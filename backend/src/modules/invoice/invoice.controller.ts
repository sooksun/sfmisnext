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
import { InvoiceService } from './invoice.service';
import { AddInvoiceDto } from './dto/add-invoice.dto';

@Controller('Invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('loadInvoiceOrder/:sc_id/:y_id')
  @HttpCode(HttpStatus.OK)
  loadInvoiceOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('y_id', ParseIntPipe) yId: number,
  ) {
    return this.invoiceService.loadInvoiceOrder(scId, yId);
  }

  @Get('loadProjects/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadProjects(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.invoiceService.loadProjects(scId, syId);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadPartner(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.invoiceService.loadPartner(scId);
  }

  @Get('loadBudgetType')
  @HttpCode(HttpStatus.OK)
  loadBudgetType() {
    return this.invoiceService.loadBudgetType(0, 0, '');
  }

  @Get('loadBudgetType/:sc_id/:sy_id/:year')
  @HttpCode(HttpStatus.OK)
  loadBudgetTypeWithParams(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
  ) {
    return this.invoiceService.loadBudgetType(scId, syId, year);
  }

  @Get('loadUserRequest/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadUserRequest(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.invoiceService.loadUserRequest(scId);
  }

  @Post('addInvoice')
  @HttpCode(HttpStatus.OK)
  addInvoice(@Body() dto: AddInvoiceDto) {
    return this.invoiceService.addInvoice(dto);
  }

  @Post('updateInvoice')
  @HttpCode(HttpStatus.OK)
  updateInvoice(@Body() dto: AddInvoiceDto) {
    return this.invoiceService.updateInvoice(dto);
  }

  @Get('loadConfirmInvoice/:sc_id/:permission/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadConfirmInvoice(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('permission', ParseIntPipe) permission: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.invoiceService.loadConfirmInvoice(scId, permission, syId);
  }

  @Post('ConfirmInvoice')
  @HttpCode(HttpStatus.OK)
  confirmInvoice(
    @Body() dto: { rw_id: number; status: number; remark?: string },
  ) {
    return this.invoiceService.confirmInvoice(dto);
  }
}
