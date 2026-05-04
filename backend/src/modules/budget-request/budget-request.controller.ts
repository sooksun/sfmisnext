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
import { BudgetRequestService } from './budget-request.service';
import {
  AddBudgetRequestDto,
  UpdateBudgetRequestDto,
} from './dto/add-budget-request.dto';

@Controller('BudgetRequest')
export class BudgetRequestController {
  constructor(private readonly service: BudgetRequestService) {}

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.service.loadBudgetRequests(scId, syId, budgetYear);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddBudgetRequestDto) {
    return this.service.addBudgetRequest(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateBudgetRequestDto) {
    return this.service.updateBudgetRequest(dto);
  }

  @Post('markSent')
  @HttpCode(HttpStatus.OK)
  markSent(@Body() dto: { br_id: number; send_date: string; up_by: number }) {
    return this.service.markSent(dto.br_id, dto.send_date, dto.up_by);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  delete(@Body() dto: { br_id: number; up_by: number }) {
    return this.service.deleteBudgetRequest(dto.br_id, dto.up_by);
  }
}
