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
import { OpeningBalanceService } from './opening-balance.service';
import {
  AddOpeningBalanceDto,
  UpdateOpeningBalanceDto,
} from './dto/opening-balance.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('OpeningBalance')
export class OpeningBalanceController {
  constructor(private readonly service: OpeningBalanceService) {}

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadOpeningBalances(scId, syId, budgetYear);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddOpeningBalanceDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addOpeningBalance(dto);
  }

  // TODO: UpdateOpeningBalanceDto ไม่มี sc_id — service ต้อง findOne(ob_id, scId: user.sc_id)
  // ก่อน update เพื่อกัน cross-tenant
  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateOpeningBalanceDto) {
    return this.service.updateOpeningBalance(dto);
  }

  // TODO: delete รับแค่ ob_id — service ต้อง findOne(ob_id, scId: user.sc_id) ก่อน soft-delete
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  delete(@Body() dto: { ob_id: number; up_by: number }) {
    return this.service.deleteOpeningBalance(dto.ob_id, dto.up_by);
  }

  @Get('summary/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  summary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.getSummaryByMoneyType(scId, budgetYear);
  }
}
