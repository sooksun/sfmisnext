import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { InvoicePreAuditService } from './invoice-pre-audit.service';

@Controller('InvoicePreAudit')
export class InvoicePreAuditController {
  constructor(private readonly svc: InvoicePreAuditService) {}

  @Get('load/:rw_id')
  @HttpCode(HttpStatus.OK)
  load(@Param('rw_id', ParseIntPipe) rwId: number) {
    return this.svc.loadByRw(rwId);
  }

  @Get('status/:rw_id')
  @HttpCode(HttpStatus.OK)
  status(@Param('rw_id', ParseIntPipe) rwId: number) {
    return this.svc.getStatus(rwId);
  }

  @Post('audit')
  @HttpCode(HttpStatus.OK)
  audit(@Body() dto: any) {
    return this.svc.audit(dto);
  }
}
