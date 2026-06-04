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
import { RegulatoryConfigService } from './regulatory-config.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('RegulatoryConfig')
export class RegulatoryConfigController {
  constructor(private readonly service: RegulatoryConfigService) {}

  /** ดึงเกณฑ์ทั้งหมด (merged) — ผู้ใช้ที่ล็อกอินดูได้ */
  @Get('getConfig/:sc_id')
  @HttpCode(HttpStatus.OK)
  getConfig(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.service.getEffectiveConfig(scId);
  }

  /** บันทึก/แก้ไขเกณฑ์ — เฉพาะผู้ดูแลระบบ (role 1) */
  @Post('upsert')
  @UseGuards(RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  upsert(
    @Body() dto: { sc_id: number; key: string; value: number; up_by: number },
  ) {
    return this.service.upsert(
      Number(dto.sc_id) || 0,
      dto.key,
      Number(dto.value),
      Number(dto.up_by) || 0,
    );
  }

  /** รีเซ็ตเกณฑ์กลับเป็นค่าตามระเบียบ — เฉพาะผู้ดูแลระบบ (role 1) */
  @Post('reset')
  @UseGuards(RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: { sc_id: number; key: string; up_by: number }) {
    return this.service.reset(
      Number(dto.sc_id) || 0,
      dto.key,
      Number(dto.up_by) || 0,
    );
  }
}
