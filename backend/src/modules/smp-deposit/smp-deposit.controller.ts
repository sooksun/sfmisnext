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
import { SmpDepositService } from './smp-deposit.service';

@Controller('SmpDeposit')
export class SmpDepositController {
  constructor(private readonly smpDepositService: SmpDepositService) {}

  @Get('loadEntries/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadEntries(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.smpDepositService.loadEntries(scId, syId, budgetYear);
  }

  @Get('getSummary/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  getSummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.smpDepositService.getSummary(scId, syId, budgetYear);
  }

  @Post('addEntry')
  @HttpCode(HttpStatus.OK)
  addEntry(
    @Body()
    dto: {
      sc_id: number;
      sy_id: number;
      budget_year: string;
      entry_type: number;
      doc_no?: string;
      doc_date?: string;
      detail?: string;
      amount: number;
      money_type_id?: number;
      money_type_name?: string;
      note?: string;
      up_by?: number;
    },
  ) {
    return this.smpDepositService.addEntry(dto);
  }

  @Post('updateEntry/:sde_id')
  @HttpCode(HttpStatus.OK)
  updateEntry(@Param('sde_id', ParseIntPipe) sdeId: number, @Body() dto: any) {
    return this.smpDepositService.updateEntry(sdeId, dto);
  }

  @Post('removeEntry')
  @HttpCode(HttpStatus.OK)
  removeEntry(@Body() dto: { sde_id: number; up_by: number }) {
    return this.smpDepositService.removeEntry(dto.sde_id, dto.up_by);
  }
}
