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
import { FinancialAssessmentService } from './financial-assessment.service';
import {
  SaveAssessmentDto,
  ConfirmAssessmentDto,
  SaveAttestationDto,
} from './dto/financial-assessment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('Financial_assessment')
export class FinancialAssessmentController {
  constructor(private readonly service: FinancialAssessmentService) {}

  @Get('load/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.loadAssessment(scId, syId, budgetYear);
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  save(@Body() dto: SaveAssessmentDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.saveAssessment(dto);
  }

  @Post('saveAttestation')
  @HttpCode(HttpStatus.OK)
  saveAttestation(
    @Body() dto: SaveAttestationDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.service.saveAttestation(dto);
  }

  @Post('runAuto/:fa_id')
  @HttpCode(HttpStatus.OK)
  runAuto(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() _user: JwtUser,
  ) {
    return this.service.runAuto(faId);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmAssessmentDto, @CurrentUser() user: JwtUser) {
    return this.service.confirm(dto, user);
  }

  @Post('markSubmitted/:fa_id')
  @HttpCode(HttpStatus.OK)
  markSubmitted(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() _user: JwtUser,
  ) {
    return this.service.markSubmitted(faId);
  }

  @Get('export/:fa_id')
  @HttpCode(HttpStatus.OK)
  exportData(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() _user: JwtUser,
  ) {
    return this.service.exportData(faId);
  }
}
