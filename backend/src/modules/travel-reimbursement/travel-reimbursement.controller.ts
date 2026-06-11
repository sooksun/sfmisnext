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
import { TravelReimbursementService } from './travel-reimbursement.service';
import { AddTravelReimbursementDto } from './dto/add-travel-reimbursement.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('TravelReimbursement')
export class TravelReimbursementController {
  constructor(private readonly service: TravelReimbursementService) {}

  @Get('loadList/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadList(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadList(scId, syId, budgetYear);
  }

  @Get('loadTravelers/:tr_id')
  @HttpCode(HttpStatus.OK)
  loadTravelers(
    @Param('tr_id', ParseIntPipe) trId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.loadTravelers(trId, user);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddTravelReimbursementDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.addTravelReimbursement(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Body()
    dto: {
      tr_id: number;
      verify_by: number;
      verify_name?: string;
      verify_date: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.verify(dto, user);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Body()
    dto: {
      tr_id: number;
      approve_by: number;
      approve_name?: string;
      approve_date: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.approve(dto, user);
  }

  @Post('disburse')
  @HttpCode(HttpStatus.OK)
  disburse(
    @Body()
    dto: {
      tr_id: number;
      receipt_date: string;
      type_offer_check?: number;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.disburse(dto, user);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Body() dto: { tr_id: number; note?: string; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.cancel(dto.tr_id, dto.note ?? '', dto.up_by, user);
  }
}
