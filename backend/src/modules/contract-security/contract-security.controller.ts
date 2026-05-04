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

@Controller('ContractSecurity')
export class ContractSecurityController {
  constructor(private readonly svc: ContractSecurityService) {}

  @Get('load/:ct_id')
  @HttpCode(HttpStatus.OK)
  loadByContract(@Param('ct_id', ParseIntPipe) ctId: number) {
    return this.svc.loadByContract(ctId);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any) {
    return this.svc.addSecurity(dto);
  }

  @Post('return')
  @HttpCode(HttpStatus.OK)
  return_(@Body() dto: any) {
    return this.svc.returnSecurity(dto);
  }

  @Post('confiscate')
  @HttpCode(HttpStatus.OK)
  confiscate(@Body() dto: any) {
    return this.svc.confiscateSecurity(dto);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() dto: { cs_id: number; up_by: number }) {
    return this.svc.removeSecurity(dto.cs_id, dto.up_by);
  }

  @Post('calcPenalty')
  @HttpCode(HttpStatus.OK)
  calcPenalty(@Body() dto: any) {
    return this.svc.calcPenalty(dto);
  }

  @Get('penalties/:ct_id')
  @HttpCode(HttpStatus.OK)
  loadPenalties(@Param('ct_id', ParseIntPipe) ctId: number) {
    return this.svc.loadPenalties(ctId);
  }

  @Post('penalty/collect')
  @HttpCode(HttpStatus.OK)
  collectPenalty(
    @Body() dto: { cp_id: number; collected_date: string; up_by: number },
  ) {
    return this.svc.markPenaltyCollected(
      dto.cp_id,
      dto.collected_date,
      dto.up_by,
    );
  }

  @Post('penalty/waive')
  @HttpCode(HttpStatus.OK)
  waivePenalty(@Body() dto: { cp_id: number; reason: string; up_by: number }) {
    return this.svc.waivePenalty(dto.cp_id, dto.reason, dto.up_by);
  }
}
