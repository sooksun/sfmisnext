import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DeleteLog } from './entities/delete-log.entity';

export interface LogDeleteOptions {
  table: string;
  rowId: number;
  reason: string | null;
  deletedBy: string | number;
  scId?: number;
  snapshot?: unknown;
}

@Injectable()
export class DeleteLogService {
  constructor(
    @InjectRepository(DeleteLog) private readonly repo: Repository<DeleteLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * บันทึก log การลบ (ไม่ลบข้อมูลจริง)
   * Service แต่ละตัวเรียก method นี้หลังจาก soft-delete (set del=1) เสร็จ
   */
  async log(opts: LogDeleteOptions): Promise<void> {
    try {
      await this.repo.save({
        table_name: opts.table,
        row_id: opts.rowId,
        reason: opts.reason ?? null,
        snapshot: opts.snapshot ? JSON.stringify(opts.snapshot) : null,
        sc_id: opts.scId ?? null,
        deleted_by: String(opts.deletedBy ?? ''),
      });
    } catch {
      // log ล้มเหลวไม่ควร block การลบหลัก
    }
  }

  async listByTable(table: string, scId?: number, limit = 100) {
    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.table_name = :t', { t: table })
      .orderBy('l.deleted_at', 'DESC')
      .limit(limit);
    if (scId) qb.andWhere('l.sc_id = :s', { s: scId });
    return qb.getMany();
  }
}
