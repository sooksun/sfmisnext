import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiAssistService } from './ai-assist.service';

/** สรุปความเสี่ยงรายสัปดาห์ (AI weekly digest) ทุกวันจันทร์ 07:00 */
@Injectable()
export class AiAssistCron {
  private readonly logger = new Logger(AiAssistCron.name);
  constructor(private readonly service: AiAssistService) {}

  @Cron('0 7 * * 1')
  async weekly() {
    try {
      const r = await this.service.weeklyDigestAll();
      this.logger.log(`weekly digest: ${r.schools} โรงเรียน พบความเสี่ยง ${r.flagged}`);
    } catch (e) {
      this.logger.error(`weekly digest ล้มเหลว: ${(e as Error).message}`);
    }
  }
}
