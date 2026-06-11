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
import { RegisterMoneyTypeService } from './register-money-type.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.registerMoneyTypeService.loadRegisterControlMoneyType(
      bgTypeId,
      scId,
      syId,
      year,
    );
  }

  @Get('wht_remit_reminder/:scId/:syId/:year')
  @HttpCode(HttpStatus.OK)
  whtRemitReminder(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.registerMoneyTypeService.whtRemitReminder(scId, syId, year);
  }

  @Post('deposit_cash')
  @HttpCode(HttpStatus.OK)
  depositCash(
    @Body()
    dto: {
      sc_id: number;
      sy_id: number;
      bg_type_id: number;
      deposit_date: string;
      amount: number;
      doc_no?: string;
      ba_id?: number;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, Number(dto.sc_id));
    return this.registerMoneyTypeService.depositCash(dto);
  }

  @Get('Testload_register_control_money_type/:bgTypeId/:scId/:syId/:year')
  @HttpCode(HttpStatus.OK)
  testLoadRegisterControlMoneyType(
    @Param('bgTypeId', ParseIntPipe) bgTypeId: number,
    @Param('scId', ParseIntPipe) scId: number,
    @Param('syId', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.registerMoneyTypeService.loadRegisterControlMoneyType(
      bgTypeId,
      scId,
      syId,
      year,
    );
  }
}
