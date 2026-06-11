import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ContractSecurityService } from './contract-security.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('ContractSecurity')
export class ContractSecurityController {
  constructor(private readonly svc: ContractSecurityService) {}

  @Get('load/:ct_id')
  @HttpCode(HttpStatus.OK)
  loadByContract(
    @Param('ct_id', ParseIntPipe) ctId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.loadByContract(ctId, user);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.addSecurity(dto);
  }

  @Post('return')
  @HttpCode(HttpStatus.OK)
  return_(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.returnSecurity(dto, user);
  }

  @Post('confiscate')
  @HttpCode(HttpStatus.OK)
  confiscate(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.confiscateSecurity(dto, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() dto: { cs_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.removeSecurity(dto.cs_id, dto.up_by, user);
  }

  @Post('calcPenalty')
  @HttpCode(HttpStatus.OK)
  calcPenalty(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.calcPenalty(dto);
  }

  @Get('penalties/:ct_id')
  @HttpCode(HttpStatus.OK)
  loadPenalties(
    @Param('ct_id', ParseIntPipe) ctId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.loadPenalties(ctId, user);
  }

  @Post('penalty/collect')
  @HttpCode(HttpStatus.OK)
  collectPenalty(
    @Body() dto: { cp_id: number; collected_date: string; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.markPenaltyCollected(
      dto.cp_id,
      dto.collected_date,
      dto.up_by,
      user,
    );
  }

  @Post('penalty/waive')
  @HttpCode(HttpStatus.OK)
  waivePenalty(
    @Body() dto: { cp_id: number; reason: string; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.waivePenalty(dto.cp_id, dto.reason, dto.up_by, user);
  }
}
