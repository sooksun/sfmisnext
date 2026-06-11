import { Module } from '@nestjs/common';
import { SchoolResetController } from './school-reset.controller';
import { SchoolResetService } from './school-reset.service';

/**
 * ใช้ DataSource (raw query) ล้วน — ไม่ต้อง forFeature
 * ลบแบบ dynamic ตามคอลัมน์ sc_id + seed ค่าตั้งค่า/ตัวอย่างด้วย raw SQL
 */
@Module({
  controllers: [SchoolResetController],
  providers: [SchoolResetService],
})
export class SchoolResetModule {}
