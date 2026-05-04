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
import { ReceiveService } from './receive.service';
import { AddReceiveDto } from './dto/add-receive.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Receive')
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Get('loadReceive/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiveService.loadReceive(scId, syId, budgetYear);
  }

  @Get('loadAutoAddReceive/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadAutoAddReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiveService.loadAutoAddReceive(scId, syId);
  }

  @Get('loadDirector/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadDirector(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiveService.loadDirector(scId);
  }

  @Get('loadBudgetIncomeType')
  @HttpCode(HttpStatus.OK)
  loadBudgetIncomeType() {
    return this.receiveService.loadBudgetIncomeType();
  }

  @Get('loadReceiveById/:pr_id/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadReceiveById(
    @Param('pr_id', ParseIntPipe) prId: number,
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiveService.loadReceiveById(prId, scId);
  }

  @Post('addReceive')
  @HttpCode(HttpStatus.OK)
  addReceive(@Body() dto: AddReceiveDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.receiveService.addReceive(dto);
  }

  @Post('deleteReceive')
  @HttpCode(HttpStatus.OK)
  deleteReceive(
    @Body() body: { pr_id: number; up_by?: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.receiveService.deleteReceive(body.pr_id, scId, body.up_by);
  }
}
