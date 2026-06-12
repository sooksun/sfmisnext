import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AnomalyService } from './anomaly.service';
import { PrecheckDto } from './dto/precheck.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('Anomaly')
export class AnomalyController {
  constructor(private readonly service: AnomalyService) {}

  /** ตรวจค่าผิดปกติก่อนบันทึก (L2 warn) — เรียกจากฟอร์มก่อน submit */
  @Post('precheck')
  @HttpCode(HttpStatus.OK)
  precheck(@Body() dto: PrecheckDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.precheck({
      sc_id: dto.sc_id,
      budget_year: dto.budget_year ?? '',
      module: dto.module,
      payload: dto.payload ?? {},
    });
  }
}
