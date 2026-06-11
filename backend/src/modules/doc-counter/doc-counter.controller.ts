import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocCounterService } from './doc-counter.service';
import { GetNextNumberDto, ResetCounterDto } from './dto/doc-counter.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('DocCounter')
export class DocCounterController {
  constructor(private readonly docCounterService: DocCounterService) {}

  /** ดึงเลขที่ถัดไป (atomic, with FOR UPDATE lock) */
  @Post('getNextNumber')
  @HttpCode(HttpStatus.OK)
  getNextNumber(@Body() dto: GetNextNumberDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.docCounterService.getNextNumber(dto);
  }

  /** โหลดสรุปตัวนับทั้ง 4 ประเภท */
  @Get('loadCounters/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadCounters(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.docCounterService.loadCounters(scId, budgetYear);
  }

  /** รีเซ็ตหรือตั้งค่า last_no — สงวนสิทธิ์ผู้ดูแล/ผอ. เท่านั้น */
  @Post('resetCounter')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2)
  resetCounter(@Body() dto: ResetCounterDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.docCounterService.resetCounter(dto);
  }
}
