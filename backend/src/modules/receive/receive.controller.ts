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
import { ReceiveService } from './receive.service';
import { AddReceiveDto } from './dto/add-receive.dto';

@Controller('Receive')
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Get('loadReceive/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.receiveService.loadReceive(scId, syId, budgetYear);
  }

  @Get('loadAutoAddReceive/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadAutoAddReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.receiveService.loadAutoAddReceive(scId, syId);
  }

  @Get('loadDirector/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadDirector(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.receiveService.loadDirector(scId);
  }

  @Get('loadBudgetIncomeType')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeType() {
    return this.receiveService.loadBudgetIncomeType();
  }

  @Post('addReceive')
  @HttpCode(HttpStatus.OK)
  addReceive(@Body() dto: AddReceiveDto) {
    return this.receiveService.addReceive(dto);
  }
}
