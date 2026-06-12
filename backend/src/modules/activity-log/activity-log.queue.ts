import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

export type LogRecord = Partial<ActivityLog>;

/**
 * คิวในหน่วยความจำ + batch insert ทุก 5 วินาที (หรือเมื่อถึง 200 รายการ)
 * เขียนแบบ fire-and-forget — interceptor push แล้วจบ ไม่รอ DB → endpoint ไม่ช้าลง
 */
@Injectable()
export class ActivityLogQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityLogQueue.name);
  private buffer: LogRecord[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly MAX = 200;
  private readonly INTERVAL = 5000;

  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), this.INTERVAL);
    // ไม่ให้ timer กั้นการปิด process
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  push(rec: LogRecord) {
    this.buffer.push(rec);
    if (this.buffer.length >= this.MAX) void this.flush();
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.repo.insert(batch as ActivityLog[]);
    } catch (e) {
      // ไม่ throw — การ log ต้องไม่ทำให้ระบบหลักล้ม
      this.logger.warn(
        `บันทึก activity_log ${batch.length} รายการล้มเหลว: ${(e as Error).message}`,
      );
    }
  }
}
