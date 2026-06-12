import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { type JwtUser } from '../../common/utils/tenant-guard';

export interface ActivityLogQuery {
  sc_id: number;
  admin_id?: number;
  module?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  async list(query: ActivityLogQuery, user: JwtUser) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(200, query.pageSize ?? 50);

    const qb = this.repo.createQueryBuilder('a');
    // tenant: super admin ดูข้ามได้, อื่นๆ เฉพาะโรงเรียนตัวเอง
    if (user.type === 1) {
      if (query.sc_id) qb.andWhere('a.sc_id = :sc', { sc: query.sc_id });
    } else {
      qb.andWhere('a.sc_id = :sc', { sc: user.sc_id });
    }
    if (query.admin_id) qb.andWhere('a.admin_id = :aid', { aid: query.admin_id });
    if (query.module) qb.andWhere('a.module = :mod', { mod: query.module });
    if (query.action) qb.andWhere('a.action = :act', { act: query.action });
    if (query.date_from)
      qb.andWhere('a.cre_date >= :df', { df: `${query.date_from} 00:00:00` });
    if (query.date_to)
      qb.andWhere('a.cre_date <= :dt', { dt: `${query.date_to} 23:59:59` });
    if (query.q)
      qb.andWhere('(a.summary LIKE :q OR a.detail_json LIKE :q OR a.admin_name LIKE :q)', {
        q: `%${query.q}%`,
      });

    const [rows, count] = await qb
      .orderBy('a.al_id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((r) => ({
        al_id: r.alId,
        sc_id: r.scId,
        admin_id: r.adminId,
        admin_name: r.adminName,
        role: r.role,
        action: r.action,
        module: r.module,
        method: r.method,
        route: r.route,
        entity_id: r.entityId,
        summary: r.summary,
        detail_json: r.detailJson,
        success: r.success,
        ip: r.ip,
        cre_date: r.creDate,
      })),
      count,
      page,
      pageSize,
    };
  }

  /** ตัวเลือก filter (โมดูล/action ที่มีจริง) */
  async facets(user: JwtUser, scId: number) {
    const where =
      user.type === 1 && scId ? { scId } : user.type === 1 ? {} : { scId: user.sc_id };
    const rows = await this.repo.find({
      where,
      select: ['module', 'action'],
      take: 5000,
      order: { alId: 'DESC' },
    });
    return {
      modules: [...new Set(rows.map((r) => r.module).filter(Boolean))].sort(),
      actions: [...new Set(rows.map((r) => r.action).filter(Boolean))].sort(),
    };
  }

  /** retention: ลบ log เก่ากว่า N ปี (default 2) */
  async purgeOlderThan(years = 2): Promise<number> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const res = await this.repo.delete({ creDate: LessThan(cutoff) });
    return res.affected ?? 0;
  }
}
