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
import { BudgetTransferService } from './budget-transfer.service';
import {
  AddBudgetTransferDto,
  ApproveBudgetTransferDto,
  CancelBudgetTransferDto,
  RejectBudgetTransferDto,
} from './dto/budget-transfer.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('BudgetTransfer')
export class BudgetTransferController {
  constructor(private readonly svc: BudgetTransferService) {}

  @Get('load/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.load(scId, budgetYear);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddBudgetTransferDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.add(dto);
  }

  // approve/reject/cancel รับแค่ bt_id — service โหลด record แล้ว assertSameSchool(user, bt.scId)
  // กัน cross-tenant (DTO ไม่มี sc_id)
  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approve(@Body() dto: ApproveBudgetTransferDto, @CurrentUser() user: JwtUser) {
    return this.svc.approve(dto, user);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  reject(@Body() dto: RejectBudgetTransferDto, @CurrentUser() user: JwtUser) {
    return this.svc.reject(dto, user);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelBudgetTransferDto, @CurrentUser() user: JwtUser) {
    return this.svc.cancel(dto.bt_id, dto.up_by, user);
  }
}
