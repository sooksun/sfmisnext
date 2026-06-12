import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { WorkAlert } from './entities/work-alert.entity';
import { School } from '../school/entities/school.entity';
import { DeadlineEngineService } from './deadline-engine.service';
import { DailyCheckService } from './daily-check.service';
import type { ComputedAlert } from './deadline-rules';
import { type JwtUser } from '../../common/utils/tenant-guard';
import { currentBudgetYearBE } from '../../common/utils/year.util';
import { ok, fail } from '../../common/utils/response.util';

@Injectable()
export class WorkAlertService {
  private readonly logger = new Logger(WorkAlertService.name);

  constructor(
    @InjectRepository(WorkAlert)
    private readonly waRepo: Repository<WorkAlert>,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    private readonly engine: DeadlineEngineService,
    private readonly dailyCheck: DailyCheckService,
  ) {}

  /** sync ทั้งเตือนปฏิทิน (calendar) + ตรวจปิดวัน (daily_check) */
  async sync(scId: number, budgetYear: string, now: Date = new Date()) {
    const [calendar, daily] = await Promise.all([
      this.engine.computeForSchool(scId, budgetYear, now),
      this.dailyCheck.computeForSchool(scId, budgetYear, now),
    ]);
    const r1 = await this.syncSource(scId, budgetYear, 'calendar', calendar, now);
    const r2 = await this.syncSource(scId, budgetYear, 'daily_check', daily, now);
    return {
      computed: r1.computed + r2.computed,
      resolved: r1.resolved + r2.resolved,
    };
  }

  /**
   * upsert ผลคำนวณของ source หนึ่งลง work_alert
   * - กฎที่ยัง emit → คงไว้/อัปเดต (ไม่รีเซ็ตสถานะรับทราบ); เคย resolve แล้วกลับมา → เปิดใหม่
   * - กฎที่เคยมีแต่ตอนนี้ไม่ emit แล้ว → auto-resolve (งานทำเสร็จแล้ว)
   */
  private async syncSource(
    scId: number,
    budgetYear: string,
    source: string,
    computed: ComputedAlert[],
    now: Date,
  ) {
    const computedKeys = new Set(
      computed.map((c) => `${c.rule_code}|${c.period}`),
    );
    const existing = await this.waRepo.find({
      where: { scId, budgetYear, source, del: 0 },
    });
    const byKey = new Map(existing.map((e) => [`${e.ruleCode}|${e.period}`, e]));

    for (const c of computed) {
      const row = byKey.get(`${c.rule_code}|${c.period}`);
      if (row) {
        row.severity = c.severity;
        row.title = c.title;
        row.detail = c.detail;
        row.link = c.link;
        row.dueDate = c.due_date || null;
        row.assigneeRole = c.assignee_role;
        if (row.status >= 3) {
          row.status = 1;
          row.resolvedBy = null;
          row.resolvedAt = null;
        }
        await this.waRepo.save(row);
      } else {
        await this.waRepo.save(
          this.waRepo.create({
            scId,
            budgetYear,
            source,
            ruleCode: c.rule_code,
            period: c.period,
            severity: c.severity,
            title: c.title,
            detail: c.detail,
            link: c.link,
            dueDate: c.due_date || null,
            assigneeRole: c.assignee_role,
            status: 1,
          }),
        );
      }
    }

    const toResolve = existing.filter(
      (e) => e.status < 3 && !computedKeys.has(`${e.ruleCode}|${e.period}`),
    );
    for (const e of toResolve) {
      e.status = 3;
      e.resolvedBy = 'auto';
      e.resolvedAt = now;
      await this.waRepo.save(e);
    }

    return { computed: computed.length, resolved: toResolve.length };
  }

  /** โหลดเตือนที่ยังเปิดอยู่ (status 1-2) ของโรงเรียน กรองตาม role ผู้ใช้ */
  async load(scId: number, budgetYear: string, user: JwtUser, sync = true) {
    if (sync) {
      try {
        await this.sync(scId, budgetYear);
      } catch (e) {
        this.logger.warn(`sync work-alert ล้มเหลว: ${(e as Error).message}`);
      }
    }
    const rows = await this.waRepo.find({
      where: { scId, del: 0, status: In([1, 2]) },
      order: { dueDate: 'ASC', waId: 'DESC' },
    });
    const visible = rows.filter((r) => this.canSee(r, user));
    return {
      data: visible.map(toDto),
      count: visible.length,
      unread: visible.filter((r) => r.status === 1).length,
    };
  }

  /** จำนวนเตือนใหม่ (สำหรับกระดิ่ง badge) */
  async count(scId: number, user: JwtUser) {
    const rows = await this.waRepo.find({
      where: { scId, del: 0, status: 1 },
    });
    return { unread: rows.filter((r) => this.canSee(r, user)).length };
  }

  async acknowledge(waId: number, user: JwtUser) {
    const row = await this.waRepo.findOne({ where: { waId, del: 0 } });
    if (!row) return fail('ไม่พบรายการเตือน');
    if (user.type !== 1 && row.scId !== user.sc_id)
      return fail('ไม่มีสิทธิ์');
    if (row.status === 1) {
      row.status = 2;
      await this.waRepo.save(row);
    }
    return ok('รับทราบแล้ว');
  }

  async acknowledgeAll(scId: number, user: JwtUser) {
    const rows = await this.waRepo.find({
      where: { scId, del: 0, status: 1 },
    });
    const mine = rows.filter((r) => this.canSee(r, user));
    for (const r of mine) {
      r.status = 2;
      await this.waRepo.save(r);
    }
    return ok(`รับทราบ ${mine.length} รายการ`, { count: mine.length });
  }

  /** cron: sync ทุกโรงเรียนสำหรับปีงบปัจจุบัน */
  async syncAllSchools(now: Date = new Date()) {
    const budgetYear = String(currentBudgetYearBE(now));
    const schools = await this.schoolRepo.find({ where: { del: 0 } });
    let total = 0;
    for (const sc of schools) {
      try {
        const r = await this.sync(sc.scId, budgetYear, now);
        total += r.computed;
      } catch (e) {
        this.logger.warn(
          `sync sc_id=${sc.scId} ล้มเหลว: ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(
      `DeadlineEngine sync ${schools.length} โรงเรียน ปีงบ ${budgetYear} — เตือนรวม ${total}`,
    );
    return { schools: schools.length, budgetYear, total };
  }

  private canSee(r: WorkAlert, user: JwtUser): boolean {
    if (user.type !== 1 && r.scId !== user.sc_id) return false;
    if (user.type === 1 || user.type === 2) return true; // super/ผอ. เห็นทุกงาน
    if (!r.assigneeRole) return true;
    return r.assigneeRole
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .includes(user.type);
  }
}

function toDto(r: WorkAlert) {
  return {
    wa_id: r.waId,
    source: r.source, // calendar | daily_check | ...
    rule_code: r.ruleCode,
    severity: r.severity,
    title: r.title,
    detail: r.detail,
    link: r.link,
    due_date: r.dueDate,
    status: r.status,
  };
}

