import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SchoolResetService } from './school-reset.service';
import { SchoolResetDto } from './dto/school-reset.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { type JwtUser } from '../../common/utils/tenant-guard';

/**
 * ล้าง/รีเซ็ตข้อมูล "เฉพาะโรงเรียนที่ login" — สงวนสิทธิ์ super admin (type=1)
 * ทุก endpoint ใช้ sc_id จาก JWT เท่านั้น (ไม่รับจาก body) + ต้องพิมพ์ยืนยัน RESET
 */
@UseGuards(RolesGuard)
@Roles(1)
@Controller('SchoolReset')
export class SchoolResetController {
  constructor(private readonly service: SchoolResetService) {}

  /** 1) ล้างเฉพาะข้อมูลธุรกรรม เก็บค่าตั้งค่า/ผู้ใช้/โรงเรียน */
  @Post('resetSystem')
  @HttpCode(HttpStatus.OK)
  resetSystem(@Body() _dto: SchoolResetDto, @CurrentUser() user: JwtUser) {
    return this.service.resetSystem(user.sc_id);
  }

  /** 2) ล้างทั้งหมด + สร้างค่าตั้งค่าพื้นฐาน (พร้อมเริ่มงาน) */
  @Post('demoSchool')
  @HttpCode(HttpStatus.OK)
  demoSchool(@Body() _dto: SchoolResetDto, @CurrentUser() user: JwtUser) {
    return this.service.demoSchool(user.sc_id, user.admin_id);
  }

  /** 3) ล้างทั้งหมด + ค่าตั้งค่า + ข้อมูลตัวอย่าง ~30 รายการ (ภายใน 1 เดือน) */
  @Post('resetDemoData')
  @HttpCode(HttpStatus.OK)
  resetDemoData(@Body() _dto: SchoolResetDto, @CurrentUser() user: JwtUser) {
    return this.service.resetDemoData(user.sc_id, user.admin_id);
  }
}
