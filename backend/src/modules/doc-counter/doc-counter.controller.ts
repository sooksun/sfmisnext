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
import { DocCounterService } from './doc-counter.service';
import { GetNextNumberDto, ResetCounterDto } from './dto/doc-counter.dto';

@Controller('DocCounter')
export class DocCounterController {
  constructor(private readonly docCounterService: DocCounterService) {}

  /** ดึงเลขที่ถัดไป (atomic, with FOR UPDATE lock) */
  @Post('getNextNumber')
  @HttpCode(HttpStatus.OK)
  getNextNumber(@Body() dto: GetNextNumberDto) {
    return this.docCounterService.getNextNumber(dto);
  }

  /** โหลดสรุปตัวนับทั้ง 4 ประเภท */
  @Get('loadCounters/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadCounters(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.docCounterService.loadCounters(scId, budgetYear);
  }

  /** รีเซ็ตหรือตั้งค่า last_no */
  @Post('resetCounter')
  @HttpCode(HttpStatus.OK)
  resetCounter(@Body() dto: ResetCounterDto) {
    return this.docCounterService.resetCounter(dto);
  }
}
