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
import { FundBorrowingService } from './fund-borrowing.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('FundBorrowing')
export class FundBorrowingController {
  constructor(private readonly service: FundBorrowingService) {}

  @Get('loadBorrowings/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBorrowings(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadBorrowings(scId, syId, budgetYear);
  }

  @Post('addBorrowing')
  @HttpCode(HttpStatus.OK)
  addBorrowing(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addBorrowing(dto);
  }

  @Post('repayBorrowing')
  @HttpCode(HttpStatus.OK)
  repayBorrowing(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.service.repayBorrowing(dto, user);
  }

  @Post('cancelBorrowing')
  @HttpCode(HttpStatus.OK)
  cancelBorrowing(
    @Body() dto: { fb_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.cancelBorrowing(dto.fb_id, dto.up_by ?? 0, user);
  }
}
