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
import { DepositRegisterService } from './deposit-register.service';
import {
  AddDepositRegisterDto,
  UpdateDepositRegisterDto,
} from './dto/deposit-register.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('DepositRegister')
export class DepositRegisterController {
  constructor(private readonly service: DepositRegisterService) {}

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.load(scId, syId, budgetYear);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddDepositRegisterDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateDepositRegisterDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.update(dto, user);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() dto: { dr_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.remove(dto.dr_id, dto.up_by, user);
  }
}
