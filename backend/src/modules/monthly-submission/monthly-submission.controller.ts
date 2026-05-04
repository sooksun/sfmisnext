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
import { MonthlySubmissionService } from './monthly-submission.service';
import {
  SaveSubmissionDto,
  SubmitDto,
  ConfirmDto,
} from './dto/monthly-submission.dto';

@Controller('MonthlySubmission')
export class MonthlySubmissionController {
  constructor(
    private readonly monthlySubmissionService: MonthlySubmissionService,
  ) {}

  @Get('loadSubmissions/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadSubmissions(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.monthlySubmissionService.loadSubmissions(scId, syId);
  }

  @Post('getOrCreate')
  @HttpCode(HttpStatus.OK)
  getOrCreate(
    @Body() body: { sc_id: number; sy_id: number; submit_month: string },
  ) {
    return this.monthlySubmissionService.getOrCreate(
      body.sc_id,
      body.sy_id,
      body.submit_month,
    );
  }

  @Post('saveSubmission')
  @HttpCode(HttpStatus.OK)
  saveSubmission(@Body() dto: SaveSubmissionDto) {
    return this.monthlySubmissionService.saveSubmission(dto);
  }

  @Post('submitMonth')
  @HttpCode(HttpStatus.OK)
  submitMonth(@Body() dto: SubmitDto) {
    return this.monthlySubmissionService.submitMonth(dto);
  }

  @Post('confirmSubmission')
  @HttpCode(HttpStatus.OK)
  confirmSubmission(@Body() dto: ConfirmDto) {
    return this.monthlySubmissionService.confirmSubmission(dto);
  }

  @Get('currentMonthAlert/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  currentMonthAlert(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.monthlySubmissionService.getCurrentMonthAlert(scId, syId);
  }
}
