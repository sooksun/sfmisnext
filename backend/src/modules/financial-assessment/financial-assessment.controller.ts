import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FinancialAssessmentService } from './financial-assessment.service';
import {
  SaveAssessmentDto,
  ConfirmAssessmentDto,
  SaveAttestationDto,
} from './dto/financial-assessment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

/**
 * ประเมินตนเองด้านการเงิน การบัญชี (แบบ 2544)
 * จำกัดสิทธิ์กลุ่มการเงิน (1=Super, 2=ผอ., 5=จนท.การเงิน, 8=หน.การเงิน)
 * — endpoint ที่รับ fa_id ตรวจ tenant ในชั้น service (assertSameSchool กับ head.scId)
 */
@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
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
    return this.service.saveAssessment(dto, user);
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
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.runAuto(faId, user);
  }

  /** ยืนยันผล — เฉพาะ ผอ. (type 2) / super admin */
  @Post('confirm')
  @Roles(1, 2)
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmAssessmentDto, @CurrentUser() user: JwtUser) {
    return this.service.confirm(dto, user);
  }

  @Post('markSubmitted/:fa_id')
  @HttpCode(HttpStatus.OK)
  markSubmitted(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.markSubmitted(faId, user);
  }

  @Get('export/:fa_id')
  @HttpCode(HttpStatus.OK)
  exportData(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.exportData(faId, user);
  }

  /** แบบ สพท. 2544 — สังเคราะห์ระดับเขต (super admin/เขตพื้นที่เท่านั้น) */
  @Get('districtSummary/:budget_year')
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  districtSummary(@Param('budget_year') budgetYear: string) {
    return this.service.districtSummary(budgetYear);
  }
}
