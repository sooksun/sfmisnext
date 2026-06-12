import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ActivityLogService } from './activity-log.service';

/** retention: ลบ activity_log เก่ากว่า 2 ปี ทุกวันอาทิตย์ 03:00 */
@Injectable()
export class ActivityLogCron {
  private readonly logger = new Logger(ActivityLogCron.name);
  constructor(private readonly service: ActivityLogService) {}

  @Cron('0 3 * * 0')
  async purge() {
    try {
      const n = await this.service.purgeOlderThan(2);
      if (n > 0) this.logger.log(`purge activity_log เก่ากว่า 2 ปี: ${n} รายการ`);
    } catch (e) {
      this.logger.error(`purge activity_log ล้มเหลว: ${(e as Error).message}`);
    }
  }
}
