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
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.monthlySubmissionService.loadSubmissions(scId, syId);
  }

  @Post('getOrCreate')
  @HttpCode(HttpStatus.OK)
  getOrCreate(
    @Body() body: { sc_id: number; sy_id: number; submit_month: string },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, body.sc_id);
    return this.monthlySubmissionService.getOrCreate(
      body.sc_id,
      body.sy_id,
      body.submit_month,
    );
  }

  @Post('saveSubmission')
  @HttpCode(HttpStatus.OK)
  saveSubmission(@Body() dto: SaveSubmissionDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.monthlySubmissionService.saveSubmission(dto);
  }

  @Post('submitMonth')
  @HttpCode(HttpStatus.OK)
  submitMonth(@Body() dto: SubmitDto, @CurrentUser() user: JwtUser) {
    return this.monthlySubmissionService.submitMonth(dto, user);
  }

  @Post('confirmSubmission')
  @HttpCode(HttpStatus.OK)
  confirmSubmission(@Body() dto: ConfirmDto, @CurrentUser() user: JwtUser) {
    return this.monthlySubmissionService.confirmSubmission(dto, user);
  }

  @Get('currentMonthAlert/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  currentMonthAlert(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.monthlySubmissionService.getCurrentMonthAlert(scId, syId);
  }
}
