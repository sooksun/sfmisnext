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
} from '@nestjs/common';
import { IntraBankTransferService } from './intra-bank-transfer.service';
import {
  AddIntraBankTransferDto,
  CancelIntraBankTransferDto,
  CompleteIntraBankTransferDto,
} from './dto/intra-bank-transfer.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('IntraBankTransfer')
export class IntraBankTransferController {
  constructor(private readonly svc: IntraBankTransferService) {}

  @Get('load/:sc_id')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    assertSameSchool(user, scId);
    return this.svc.load(scId, from, to);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddIntraBankTransferDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.add(dto);
  }

  // TODO: complete/cancel รับแค่ ibt_id — service ต้อง findOne({ ibtId, scId: user.sc_id })
  // เพื่อ assertSameSchool ก่อน update (DTO ไม่มี sc_id)
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@Body() dto: CompleteIntraBankTransferDto) {
    return this.svc.complete(dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelIntraBankTransferDto) {
    return this.svc.cancel(dto.ibt_id, dto.reason, dto.up_by);
  }
}
