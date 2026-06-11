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
import { CashKeepingService } from './cash-keeping.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('CashKeeping')
export class CashKeepingController {
  constructor(private readonly cashKeepingService: CashKeepingService) {}

  @Get('loadRecords/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadRecords(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.cashKeepingService.loadRecords(scId, syId);
  }

  /** เตือนนำเงินสดฝากธนาคารตามระเบียบ 2562 (เกิน 10,000→1 วันทำการ, ไม่เกิน→3 วันทำการ) */
  @Get('depositReminder/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  depositReminder(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.cashKeepingService.depositReminder(scId, syId);
  }

  @Post('addRecord')
  @HttpCode(HttpStatus.OK)
  addRecord(
    @Body()
    dto: {
      sc_id: number;
      sy_id: number;
      record_date: string;
      amount: number;
      money_detail?: string;
      sender_id: number;
      receiver_id: number;
      note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, Number(dto.sc_id));
    return this.cashKeepingService.addRecord(dto);
  }

  @Post('returnRecord')
  @HttpCode(HttpStatus.OK)
  returnRecord(
    @Body()
    dto: {
      ckr_id: number;
      returned_date: string;
      returned_amount: number;
      return_note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.cashKeepingService.returnRecord(dto, user);
  }

  @Post('removeRecord')
  @HttpCode(HttpStatus.OK)
  removeRecord(
    @Body() dto: { ckr_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.cashKeepingService.removeRecord(dto.ckr_id, dto.up_by, user);
  }
}
