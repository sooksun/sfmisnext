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

  // TODO: approve/reject/cancel รับแค่ bt_id — service ต้อง findOne({ btId, scId: user.sc_id })
  // เพื่อ assertSameSchool ก่อน update (DTO ไม่มี sc_id)
  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approve(@Body() dto: ApproveBudgetTransferDto) {
    return this.svc.approve(dto);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  reject(@Body() dto: RejectBudgetTransferDto) {
    return this.svc.reject(dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelBudgetTransferDto) {
    return this.svc.cancel(dto.bt_id, dto.up_by);
  }
}
