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
import { PlanPrevBalanceService } from './plan-prev-balance.service';
import {
  DeletePrevBalanceDto,
  SavePrevBalanceDto,
} from './dto/plan-prev-balance.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('PlanPrevBalance')
export class PlanPrevBalanceController {
  constructor(private readonly service: PlanPrevBalanceService) {}

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.load(scId, syId, budgetYear);
  }

  @Get('summary/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  summary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.getSummaryByType(scId, syId, budgetYear);
  }

  @Get('expiredForTreasury/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  expiredForTreasury(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.expiredForTreasury(scId, syId, budgetYear);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() dto: SavePrevBalanceDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.save(dto);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  delete(@Body() dto: DeletePrevBalanceDto, @CurrentUser() user: JwtUser) {
    return this.service.delete(dto, user);
  }
}
