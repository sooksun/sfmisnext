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
import {
  AddExpenseTypeDto,
  DeleteExpenseTypeDto,
} from './dto/expense-type.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('BudgetRequest')
export class BudgetRequestController {
  constructor(private readonly service: BudgetRequestService) {}

  // ─── ประเภทรายจ่าย (master) ─────────────────────────────────────────────

  @Get('expenseTypes/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadExpenseTypes(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadExpenseTypes(scId);
  }

  @Post('expenseType/add')
  @HttpCode(HttpStatus.OK)
  addExpenseType(@Body() dto: AddExpenseTypeDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addExpenseType(dto);
  }

  @Post('expenseType/delete')
  @HttpCode(HttpStatus.OK)
  deleteExpenseType(
    @Body() dto: DeleteExpenseTypeDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.deleteExpenseType(dto, user);
  }

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadBudgetRequests(scId, syId, budgetYear);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddBudgetRequestDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addBudgetRequest(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateBudgetRequestDto, @CurrentUser() user: JwtUser) {
    return this.service.updateBudgetRequest(dto, user);
  }

  @Post('updateStatus')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Body()
    dto: {
      br_id: number;
      status: number;
      date?: string;
      up_by: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateStatus(
      dto.br_id,
      dto.status,
      dto.date ?? null,
      dto.up_by,
      user,
    );
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  delete(
    @Body() dto: { br_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.deleteBudgetRequest(dto.br_id, dto.up_by, user);
  }
}
