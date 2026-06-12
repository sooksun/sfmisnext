import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkAlertService } from './work-alert.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('Work_alert')
export class WorkAlertController {
  constructor(private readonly service: WorkAlertService) {}

  /** โหลดเตือนที่เปิดอยู่ + sync ปฏิทินสด (หน้า work-alerts / การ์ด dashboard) */
  @Get('load/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.load(scId, budgetYear, user);
  }

  /** จำนวนเตือนใหม่ (กระดิ่ง badge) — ไม่ sync เพื่อความเร็ว */
  @Get('count/:sc_id')
  @HttpCode(HttpStatus.OK)
  count(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.count(scId, user);
  }

  @Post('acknowledge/:wa_id')
  @HttpCode(HttpStatus.OK)
  acknowledge(
    @Param('wa_id', ParseIntPipe) waId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.acknowledge(waId, user);
  }

  @Post('acknowledgeAll/:sc_id')
  @HttpCode(HttpStatus.OK)
  acknowledgeAll(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.acknowledgeAll(scId, user);
  }
}
