import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkAlertService } from './work-alert.service';

/**
 * กระตุ้น DeadlineEngine ทุกเช้า 06:00 — สร้าง/ปิดเตือนปฏิทินของทุกโรงเรียน
 * (หน้า load ยัง sync สดอีกชั้นเสมอ จึงทำงานได้แม้ cron ไม่รัน เช่น dev)
 */
@Injectable()
export class WorkAlertCron {
  private readonly logger = new Logger(WorkAlertCron.name);
  constructor(private readonly service: WorkAlertService) {}

  @Cron('0 6 * * *')
  async morningSync() {
    await this.run('เช้า 06:00');
  }

  /** 16:30 วันทำการ — ตรวจปิดยอดประจำวัน/เตือนสิ้นวัน */
  @Cron('30 16 * * 1-5')
  async eveningSync() {
    await this.run('เย็น 16:30');
  }

  private async run(label: string) {
    try {
      const r = await this.service.syncAllSchools();
      this.logger.log(`sync ${label}: ${r.schools} โรงเรียน เตือนรวม ${r.total}`);
    } catch (e) {
      this.logger.error(`work-alert sync (${label}) ล้มเหลว: ${(e as Error).message}`);
    }
  }
}
