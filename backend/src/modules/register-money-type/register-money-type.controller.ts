import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegisterMoneyTypeService } from './register-money-type.service';

@Controller('Register_control_money_type')
export class RegisterMoneyTypeController {
  constructor(
    private readonly registerMoneyTypeService: RegisterMoneyTypeService,
  ) {}

  @Get('load_budget_type')
  @HttpCode(HttpStatus.OK)
  loadBudgetType() {
    return this.registerMoneyTypeService.loadBudgetType();
  }

  @Get('load_register_control_money_type/:bgTypeId/:scId/:syId/:year')
  @HttpCode(HttpStatus.OK)
  loadRegisterControlMoneyType(
    @Param('bgTypeId', ParseIntPipe) bgTypeId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('year') year: string,
  ) {
    return this.registerMoneyTypeService.loadRegisterControlMoneyType(
      bgTypeId,
      scId,
      syId,
      year,
    );
  }

  @Get('Testload_register_control_money_type/:bgTypeId/:scId/:syId/:year')
  @HttpCode(HttpStatus.OK)
  testLoadRegisterControlMoneyType(
    @Param('bgTypeId', ParseIntPipe) bgTypeId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('year') year: string,
  ) {
    return this.registerMoneyTypeService.loadRegisterControlMoneyType(
      bgTypeId,
      scId,
      syId,
      year,
    );
  }
}
