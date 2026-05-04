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
import { FiscalYearBalanceService } from './fiscal-year-balance.service';
import {
  FinalizeYearDto,
  SaveBalanceDto,
  SaveBulkBalancesDto,
} from './dto/fiscal-year-balance.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('FiscalYearBalance')
export class FiscalYearBalanceController {
  constructor(
    private readonly fiscalYearBalanceService: FiscalYearBalanceService,
  ) {}

  @Get('loadBalances/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBalances(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.fiscalYearBalanceService.loadBalances(scId, budgetYear);
  }

  @Post('saveBalance')
  @HttpCode(HttpStatus.OK)
  saveBalance(@Body() dto: SaveBalanceDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.fiscalYearBalanceService.saveBalance(dto);
  }

  @Post('saveBulkBalances')
  @HttpCode(HttpStatus.OK)
  saveBulkBalances(
    @Body() dto: SaveBulkBalancesDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.fiscalYearBalanceService.saveBulkBalances(dto);
  }

  @Post('finalizeYear')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  finalizeYear(@Body() dto: FinalizeYearDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.fiscalYearBalanceService.finalizeYear(dto);
  }
}
