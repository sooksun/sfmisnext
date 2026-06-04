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

@Controller('FundBorrowing')
export class FundBorrowingController {
  constructor(private readonly service: FundBorrowingService) {}

  @Get('loadBorrowings/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBorrowings(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.service.loadBorrowings(scId, syId, budgetYear);
  }

  @Post('addBorrowing')
  @HttpCode(HttpStatus.OK)
  addBorrowing(@Body() dto: any) {
    return this.service.addBorrowing(dto);
  }

  @Post('repayBorrowing')
  @HttpCode(HttpStatus.OK)
  repayBorrowing(@Body() dto: any) {
    return this.service.repayBorrowing(dto);
  }

  @Post('cancelBorrowing')
  @HttpCode(HttpStatus.OK)
  cancelBorrowing(@Body() dto: { fb_id: number; up_by: number }) {
    return this.service.cancelBorrowing(dto.fb_id, dto.up_by ?? 0);
  }
}
