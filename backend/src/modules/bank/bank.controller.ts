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
import { BankService } from './bank.service';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { AddBudgetSchoolDto } from './dto/add-budget-school.dto';

@Controller('Bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get('loadBankAccount/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadBankAccount(@Param('sc_id', ParseIntPipe) scId: number) {
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
  addBankSchool(@Body() dto: AddBankAccountDto) {
    return this.bankService.addBankAccount(dto);
  }

  @Post('updateBankSchool')
  @HttpCode(HttpStatus.OK)
  updateBankSchool(@Body() dto: AddBankAccountDto) {
    return this.bankService.updateBankAccount(dto);
  }

  @Post('removeBankAccount')
  @HttpCode(HttpStatus.OK)
  removeBankAccount(@Body() body: { ba_id: number }) {
    return this.bankService.removeBankAccount(body.ba_id);
  }

  @Post('addBudgetSchool')
  @HttpCode(HttpStatus.OK)
  addBudgetSchool(@Body() dto: AddBudgetSchoolDto) {
    return this.bankService.addBudgetSchool(dto);
  }
}

@Controller('bank')
export class BankLowerController {
  constructor(private readonly bankService: BankService) {}

  @Get('checkBindingBankAccount/:sc_id')
  @HttpCode(HttpStatus.OK)
  checkBindingBankAccount(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.bankService.checkBindingBankAccount(scId);
  }
}
