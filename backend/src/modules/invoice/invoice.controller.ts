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
import { InvoiceService } from './invoice.service';
import { AddInvoiceDto } from './dto/add-invoice.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('loadInvoiceOrder/:sc_id/:y_id')
  @HttpCode(HttpStatus.OK)
  loadInvoiceOrder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('y_id', ParseIntPipe) yId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadInvoiceOrder(scId, yId);
  }

  // มูลหนี้จากพัสดุที่ตรวจรับแล้ว (พร้อมขอเบิก) — สะพานพัสดุ→การเงิน
  @Get('loadPayableParcels/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadPayableParcels(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadPayableParcels(scId);
  }

  @Get('loadProjects/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadProjects(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadProjects(scId, syId);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadPartner(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadBudgetType(scId, syId, year);
  }

  @Get('loadUserRequest/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadUserRequest(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadUserRequest(scId);
  }

  @Post('addInvoice')
  @HttpCode(HttpStatus.OK)
  addInvoice(@Body() dto: AddInvoiceDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.invoiceService.addInvoice(dto);
  }

  @Post('updateInvoice')
  @HttpCode(HttpStatus.OK)
  updateInvoice(@Body() dto: AddInvoiceDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.invoiceService.updateInvoice(dto);
  }

  @Post('deleteInvoice')
  @HttpCode(HttpStatus.OK)
  deleteInvoice(
    @Body() body: { rw_id: number; up_by?: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.invoiceService.deleteInvoice(body.rw_id, scId, body.up_by);
  }

  @Get('loadConfirmInvoice/:sc_id/:permission/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadConfirmInvoice(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('permission', ParseIntPipe) permission: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadConfirmInvoice(scId, permission, syId);
  }

  @Post('ConfirmInvoice')
  @HttpCode(HttpStatus.OK)
  confirmInvoice(
    @Body()
    dto: {
      rw_id: number;
      status: number;
      remark?: string;
      precheck_note?: string;
      up_by?: number;
    },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.invoiceService.confirmInvoice(dto, scId);
  }

  @Get('loadLoanStatus/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadLoanStatus(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.invoiceService.loadLoanStatus(scId, syId);
  }

  @Post('returnLoan')
  @HttpCode(HttpStatus.OK)
  returnLoan(
    @Body()
    dto: {
      rw_id: number;
      loan_returned_date: string;
      loan_return_cash: number;
      loan_return_voucher_amount: number;
      up_by?: number;
    },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.invoiceService.returnLoan(scId, dto);
  }
}
