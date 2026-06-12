import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkAlert } from '../work-alert/entities/work-alert.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { School } from '../school/entities/school.entity';
import { AiRouterService } from '../ai/ai-router.service';

const SEV_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };

/**
 * ผู้ช่วย AI ด้านการเงิน — 4 จุด (ทุกจุดมี fallback rule-based เมื่อปิด/ไม่มี AI):
 *  1) dailySummary  สรุปงานวันนี้เป็นภาษาคน
 *  2) weeklyDigest  หา pattern ผิดปกติจาก activity_log (แก้ย้อนหลังถี่/นอกเวลา/แยกหน้าที่ไม่ครบ)
 *  3) advisory      วิเคราะห์รายการที่ติดเตือน L2 → เขียน work_alert(source=ai)
 *  4) ask           ตอบคำถาม "ต้องทำอะไร" จากงานค้างจริง
 */
@Injectable()
export class AiAssistService {
  private readonly logger = new Logger(AiAssistService.name);

  constructor(
    @InjectRepository(WorkAlert)
    private readonly waRepo: Repository<WorkAlert>,
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    private readonly ai: AiRouterService,
  ) {}

  private async aiAvailable(): Promise<boolean> {
    try {
      await this.ai.selectProvider('chat');
      return true;
    } catch {
      return false;
    }
  }

  private async aiText(system: string, user: string): Promise<string | null> {
    try {
      const res = await this.ai.chat('chat', [{ role: 'user', content: user }], system);
      return res?.content?.trim() || null;
    } catch (e) {
      this.logger.warn(`AI call ล้มเหลว ใช้ fallback: ${(e as Error).message}`);
      return null;
    }
  }

  // ── 1) สรุปงานวันนี้ ──
  async dailySummary(scId: number, budgetYear: string) {
    const alerts = await this.waRepo.find({
      where: { scId, del: 0, status: In([1, 2]) },
      order: { dueDate: 'ASC' },
    });
    const open = alerts.length;
    const urgent = alerts.filter((a) => a.severity === 'error').length;
    const items = alerts
      .slice()
      .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9))
      .slice(0, 6)
      .map((a) => `- ${a.title}${a.dueDate ? ` (กำหนด ${a.dueDate})` : ''}`);

    const fallback =
      open === 0
        ? 'วันนี้ไม่มีงานค้างตามกำหนด ✅'
        : `มีงานค้าง ${open} รายการ${urgent ? ` (เร่งด่วน ${urgent})` : ''}:\n${items.join('\n')}`;

    if (open === 0 || !(await this.aiAvailable())) {
      return { summary: fallback, source: 'rule' as const };
    }
    const ai = await this.aiText(
      'คุณเป็นผู้ช่วยการเงินโรงเรียน สรุปงานค้างให้เป็นภาษาไทยกระชับ เป็นกันเอง ไม่เกิน 3 ประโยค ชี้สิ่งที่ควรทำก่อน',
      `งานค้างปีงบ ${budgetYear}:\n${items.join('\n')}\nรวม ${open} รายการ เร่งด่วน ${urgent}`,
    );
    return { summary: ai ?? fallback, source: ai ? ('ai' as const) : ('rule' as const) };
  }

  // ── 2) Weekly anomaly digest ──
  async weeklyDigest(scId: number, now: Date = new Date(), write = false) {
    const since = new Date(now.getTime() - 7 * 86400000);
    const rows = await this.logRepo.find({
      where: { scId },
      order: { alId: 'DESC' },
      take: 5000,
    });
    const week = rows.filter((r) => r.creDate && new Date(r.creDate) >= since);

    const byAction: Record<string, number> = {};
    const afterHours: ActivityLog[] = [];
    const editCount: Record<string, number> = {};
    const actorsByEntity: Record<string, Set<string>> = {};

    for (const r of week) {
      byAction[r.action] = (byAction[r.action] ?? 0) + 1;
      const d = r.creDate ? new Date(r.creDate) : null;
      if (d && (d.getHours() < 7 || d.getHours() >= 19 || d.getDay() === 0 || d.getDay() === 6)) {
        afterHours.push(r);
      }
      if (r.entityId && r.module) {
        const key = `${r.module}#${r.entityId}`;
        if (r.action === 'update') editCount[key] = (editCount[key] ?? 0) + 1;
        const setKey = `${key}|${r.action}`;
        (actorsByEntity[setKey] ??= new Set()).add(String(r.adminId));
      }
    }

    const findings: { code: string; severity: 'warning' | 'info'; message: string }[] = [];
    if (afterHours.length >= 5)
      findings.push({
        code: 'AFTER_HOURS',
        severity: 'info',
        message: `มีการทำรายการนอกเวลาราชการ/วันหยุด ${afterHours.length} ครั้งในสัปดาห์นี้`,
      });
    const heavy = Object.entries(editCount).filter(([, n]) => n >= 5);
    if (heavy.length)
      findings.push({
        code: 'HEAVY_EDIT',
        severity: 'warning',
        message: `มีเอกสารถูกแก้ไขย้อนหลังถี่ผิดปกติ ${heavy.length} รายการ (เช่น ${heavy[0][0]} แก้ ${heavy[0][1]} ครั้ง)`,
      });
    // แยกหน้าที่ไม่ครบ: เอกสารเดียวกัน คนเดียวทั้งสร้างและอนุมัติ
    const segViolations: string[] = [];
    for (const key of Object.keys(actorsByEntity)) {
      if (!key.endsWith('|create')) continue;
      const base = key.slice(0, -'|create'.length);
      const creators = actorsByEntity[`${base}|create`];
      const approvers = actorsByEntity[`${base}|approve`];
      if (creators && approvers) {
        for (const a of creators) if (approvers.has(a)) segViolations.push(base);
      }
    }
    if (segViolations.length)
      findings.push({
        code: 'SEGREGATION',
        severity: 'warning',
        message: `พบผู้ใช้คนเดียวทั้งสร้างและอนุมัติเอกสารเดียวกัน ${segViolations.length} รายการ — ควรแยกหน้าที่`,
      });

    const stats = { total: week.length, byAction, afterHours: afterHours.length };
    let aiText: string | null = null;
    if (findings.length && (await this.aiAvailable())) {
      aiText = await this.aiText(
        'คุณเป็นผู้ตรวจสอบภายในด้านการเงิน วิเคราะห์สถิติกิจกรรมรายสัปดาห์ ชี้ความเสี่ยงที่ควรสนใจเป็นภาษาไทยกระชับ ไม่เกิน 3 ประโยค',
        `สถิติสัปดาห์: ${JSON.stringify(stats)}\nสิ่งที่ตรวจพบ: ${findings.map((f) => f.message).join('; ')}`,
      );
    }

    // เขียนเป็น work_alert ให้ผู้ดูแล (ครั้งเดียวต่อสัปดาห์)
    if (write && findings.length) {
      const period = `${now.getFullYear()}-W${weekNo(now)}`;
      const worst = findings.some((f) => f.severity === 'warning') ? 'warning' : 'info';
      await this.upsertAiAlert(scId, 'AI_WEEKLY_DIGEST', period, {
        severity: worst,
        title: 'สรุปความเสี่ยงรายสัปดาห์ (AI)',
        detail: aiText ?? findings.map((f) => f.message).join(' · '),
        link: '/sfmis/admin-tools/activity-log',
        assigneeRole: '1,2',
      });
    }

    return {
      stats,
      findings,
      summary: aiText ?? (findings.length ? findings.map((f) => f.message).join(' · ') : 'ไม่พบความผิดปกติในสัปดาห์นี้'),
      source: aiText ? ('ai' as const) : ('rule' as const),
    };
  }

  // ── 3) Advisory ขณะบันทึก (เรียกหลัง save ที่ติดเตือน L2) ──
  async advisory(
    scId: number,
    budgetYear: string,
    module: string,
    payload: Record<string, unknown>,
    warnings: { code: string; message: string }[],
  ) {
    const fallback = {
      suspicious: warnings.length > 0,
      reason: warnings.map((w) => w.message).join(' · '),
      suggestion: 'โปรดตรวจทานจำนวนเงิน/วันที่/ความซ้ำซ้อนก่อนส่งอนุมัติ',
    };
    let result = fallback;
    if (await this.aiAvailable()) {
      const ai = await this.aiText(
        'คุณเป็นผู้ช่วยตรวจสอบการเงิน ประเมินว่ารายการที่บันทึกเสี่ยงผิดพลาดหรือไม่ ตอบ JSON {suspicious:boolean, reason:string, suggestion:string} ภาษาไทยสั้นๆ',
        `โมดูล ${module} ข้อมูล: ${JSON.stringify(payload)} คำเตือนเบื้องต้น: ${warnings.map((w) => w.message).join('; ')}`,
      );
      if (ai) {
        try {
          const j = JSON.parse(ai.replace(/```json|```/g, '').trim());
          result = {
            suspicious: !!j.suspicious,
            reason: String(j.reason ?? fallback.reason),
            suggestion: String(j.suggestion ?? fallback.suggestion),
          };
        } catch {
          /* ใช้ fallback */
        }
      }
    }
    // บันทึกเป็น work_alert (info) ให้ผู้บันทึกเห็นย้อนหลัง
    if (result.suspicious) {
      await this.upsertAiAlert(
        scId,
        'AI_ADVISORY',
        `${module}-${Date.now()}`,
        {
          severity: 'info',
          title: `ข้อสังเกตจาก AI: ${module}`,
          detail: `${result.reason} — ${result.suggestion}`,
          link: null,
          assigneeRole: '2,5,8',
          budgetYear,
        },
      );
    }
    return result;
  }

  // ── 4) ถามผู้ช่วย ──
  async ask(scId: number, budgetYear: string, question: string) {
    const alerts = await this.waRepo.find({
      where: { scId, del: 0, status: In([1, 2]) },
      order: { dueDate: 'ASC' },
      take: 20,
    });
    const ctx = alerts
      .map((a) => `- [${a.severity}] ${a.title}${a.dueDate ? ` (กำหนด ${a.dueDate})` : ''}`)
      .join('\n');
    const fallback =
      alerts.length === 0
        ? 'ขณะนี้ไม่มีงานค้างตามกำหนด'
        : `งานที่ต้องทำตามกำหนด:\n${ctx}`;
    if (!(await this.aiAvailable())) return { answer: fallback, source: 'rule' as const };
    const ai = await this.aiText(
      `คุณเป็นผู้ช่วยการเงินโรงเรียน ตอบคำถามผู้ใช้จาก "งานค้าง" ที่ให้มาเท่านั้น เป็นภาษาไทยกระชับ ถ้าไม่มีข้อมูลให้บอกว่าไม่มีงานค้างที่เกี่ยวข้อง ปีงบ ${budgetYear}`,
      `งานค้าง:\n${ctx || '(ไม่มี)'}\n\nคำถาม: ${question}`,
    );
    return { answer: ai ?? fallback, source: ai ? ('ai' as const) : ('rule' as const) };
  }

  /** weekly digest ทุกโรงเรียน (cron) */
  async weeklyDigestAll(now: Date = new Date()) {
    const schools = await this.schoolRepo.find({ where: { del: 0 } });
    let written = 0;
    for (const sc of schools) {
      try {
        const r = await this.weeklyDigest(sc.scId, now, true);
        if (r.findings.length) written++;
      } catch (e) {
        this.logger.warn(`weeklyDigest sc=${sc.scId} ล้มเหลว: ${(e as Error).message}`);
      }
    }
    return { schools: schools.length, flagged: written };
  }

  private async upsertAiAlert(
    scId: number,
    ruleCode: string,
    period: string,
    a: {
      severity: string;
      title: string;
      detail: string;
      link: string | null;
      assigneeRole: string;
      budgetYear?: string;
    },
  ) {
    const existing = await this.waRepo.findOne({
      where: { scId, ruleCode, period, del: 0 },
    });
    if (existing) {
      existing.severity = a.severity;
      existing.title = a.title;
      existing.detail = a.detail;
      if (existing.status >= 3) existing.status = 1;
      await this.waRepo.save(existing);
    } else {
      await this.waRepo.save(
        this.waRepo.create({
          scId,
          budgetYear: a.budgetYear ?? null,
          source: 'ai',
          ruleCode,
          period,
          severity: a.severity,
          title: a.title,
          detail: a.detail,
          link: a.link,
          assigneeRole: a.assigneeRole,
          status: 1,
        }),
      );
    }
  }
}

function weekNo(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}
