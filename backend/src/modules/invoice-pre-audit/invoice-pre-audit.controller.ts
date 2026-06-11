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
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('InvoicePreAudit')
export class InvoicePreAuditController {
  constructor(private readonly svc: InvoicePreAuditService) {}

  @Get('load/:rw_id')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('rw_id', ParseIntPipe) rwId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.loadByRw(rwId, user);
  }

  @Get('status/:rw_id')
  @HttpCode(HttpStatus.OK)
  status(
    @Param('rw_id', ParseIntPipe) rwId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.getStatus(rwId, user);
  }

  @Post('audit')
  @HttpCode(HttpStatus.OK)
  audit(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.audit(dto);
  }
}
