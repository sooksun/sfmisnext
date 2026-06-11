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
import { CashCommitteeService } from './cash-committee.service';
import { SaveCommitteeDto } from './dto/save-committee.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('CashCommittee')
export class CashCommitteeController {
  constructor(private readonly service: CashCommitteeService) {}

  @Get('load/:sc_id')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.load(scId);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() dto: SaveCommitteeDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.save(dto);
  }
}
