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
import { SarReportService } from './sar-report.service';

@Controller('SarReport')
export class SarReportController {
  constructor(private readonly svc: SarReportService) {}

  @Get('load/:sc_id')
  @HttpCode(HttpStatus.OK)
  load(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.svc.load(scId);
  }

  @Get('get/:sar_id')
  @HttpCode(HttpStatus.OK)
  get(@Param('sar_id', ParseIntPipe) sarId: number) {
    return this.svc.get(sarId);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any) {
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any) {
    return this.svc.update(dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: { sar_id: number; up_by: number }) {
    return this.svc.submitForApproval(dto.sar_id, dto.up_by);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approve(@Body() dto: any) {
    return this.svc.approve(dto);
  }

  @Post('submitToDivision')
  @HttpCode(HttpStatus.OK)
  submitToDivision(
    @Body() dto: { sar_id: number; submitted_date: string; up_by: number },
  ) {
    return this.svc.submitToDivision(dto.sar_id, dto.submitted_date, dto.up_by);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() dto: { sar_id: number; up_by: number }) {
    return this.svc.remove(dto.sar_id, dto.up_by);
  }
}
