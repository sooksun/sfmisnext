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
import { BankService } from './bank.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { AddBudgetSchoolDto } from './dto/add-budget-school.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get('loadBankAccount/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadBankAccount(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankService.loadBankAccount(scId);
  }

  @Get('loadBankDB')
  @HttpCode(HttpStatus.OK)
  loadBankDB() {
    return this.bankService.loadBankDB();
  }

  @Get('loadBudget')
  @HttpCode(HttpStatus.OK)
  loadBudget() {
    return this.bankService.loadBudget();
  }

  @Post('addBankSchool')
  @HttpCode(HttpStatus.OK)
  addBankSchool(@Body() dto: AddBankAccountDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.bankService.addBankAccount(dto);
  }

  @Post('updateBankSchool')
  @HttpCode(HttpStatus.OK)
  updateBankSchool(
    @Body() dto: AddBankAccountDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.bankService.updateBankAccount(dto, user);
  }

  @Post('removeBankAccount')
  @HttpCode(HttpStatus.OK)
  removeBankAccount(
    @Body() body: { ba_id: number; reason?: string; up_by?: string | number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankService.removeBankAccount(
      body.ba_id,
      body.reason,
      body.up_by,
      user,
    );
  }

  @Post('addBudgetSchool')
  @HttpCode(HttpStatus.OK)
  addBudgetSchool(
    @Body() dto: AddBudgetSchoolDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.bankService.addBudgetSchool(dto);
  }
}

@Controller('bank')
export class BankLowerController {
  constructor(private readonly bankService: BankService) {}

  @Get('checkBindingBankAccount/:sc_id')
  @HttpCode(HttpStatus.OK)
  checkBindingBankAccount(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankService.checkBindingBankAccount(scId);
  }
}
