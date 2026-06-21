import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WorkAlertService } from '../../work-alert/work-alert.service';
import type { JwtUser } from '../../../common/utils/tenant-guard';

export type BriefingSeverity = 'success' | 'info' | 'warning' | 'error';

/** ไอเท็มสรุปสถานการณ์หนึ่งบรรทัด — frontend แสดงเป็น bullet/การ์ด */
export interface BriefingHighlight {
  severity: BriefingSeverity;
  /** lucide icon hint สำหรับ frontend */
  icon: string;
  text: string;
  link?: string | null;
}

/** ปุ่มลัดที่แนะนำตามบริบทหน้า/งานค้าง */
export interface BriefingAction {
  label: string;
  /** ข้อความที่จะป้อนเข้าโหมดสั่งงาน/ถามข้อมูล */
  message: string;
  mode: 'command' | 'chat';
}

export interface AssistantBriefingResult {
  greeting: string;
  headline: string;
  highlights: BriefingHighlight[];
  suggested_actions: BriefingAction[];
  /** จำนวนงานเตือนที่ยังเปิดอยู่ */
  alert_count: number;
  generated_at: string;
}

interface BuildOpts {
  path?: string;
  /** inject ได้สำหรับเทส (greeting ขึ้นกับชั่วโมง) */
  now?: Date;
}

const SEVERITY_RANK: Record<BriefingSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
  success: 0,
};

/** ปุ่มลัดเฉพาะหน้า — key คือ path fragment, value คือ action ที่เกี่ยวข้องกับงานหน้านั้น */
const PAGE_ACTIONS: { match: string; action: BriefingAction }[] = [
  { match: 'plan-menu/project', action: { label: 'เพิ่มโครงการ', message: 'เพิ่มโครงการ', mode: 'command' } },
  { match: 'receive-menu/receive', action: { label: 'รับเงิน/ออกใบเสร็จ', message: 'รับเงินและออกใบเสร็จ', mode: 'command' } },
  { match: 'pay-menu/invoice', action: { label: 'สร้างใบสำคัญจ่าย', message: 'สร้างใบสำคัญจ่าย', mode: 'command' } },
  { match: 'pay-menu/loan-agreement', action: { label: 'เพิ่มสัญญายืมเงิน', message: 'เพิ่มสัญญายืมเงิน', mode: 'command' } },
  { match: 'pay-menu/travel-reimbursement', action: { label: 'เบิกค่าเดินทาง', message: 'เบิกค่าเดินทาง', mode: 'command' } },
  { match: 'financial-report/daily-balance', action: { label: 'ปิดยอดประจำวัน', message: 'ปิดยอดประจำวัน', mode: 'command' } },
  { match: 'financial-report/monthly-submission', action: { label: 'รายงานประจำเดือน', message: 'รายงานประจำเดือน', mode: 'command' } },
];

const DEFAULT_ACTIONS: BriefingAction[] = [
  { label: 'งานค้างวันนี้', message: 'วันนี้มีงานค้างหรือความเสี่ยงอะไรที่ต้องทำก่อน', mode: 'chat' },
  { label: 'ยอดคงเหลือ', message: 'ยอดเงินคงเหลือแยกตามประเภทเงินตอนนี้เท่าไร', mode: 'chat' },
  { label: 'เพิ่มโครงการ', message: 'เพิ่มโครงการ', mode: 'command' },
];

/**
 * ผู้ช่วยเชิงรุก — สร้าง "บทสรุปสถานการณ์" ตอนเปิดแชท
 *
 * ทั้งหมดเป็น rule-based (ไม่เรียก LLM) → เร็ว, ฟรี, deterministic, เทสได้
 * ดึงข้อมูลซ้ำกับที่ ChatService/WorkAlert มีอยู่แล้ว ไม่เพิ่ม query ใหม่นอกจากที่จำเป็น
 */
@Injectable()
export class AssistantBriefingService {
  private readonly logger = new Logger(AssistantBriefingService.name);

  constructor(
    private readonly chat: ChatService,
    private readonly workAlerts: WorkAlertService,
  ) {}

  async build(
    scId: number,
    budgetYear: string,
    user: JwtUser,
    opts: BuildOpts = {},
  ): Promise<AssistantBriefingResult> {
    const now = opts.now ?? new Date();
    const greeting = this.greeting(now);

    // ดึงข้อมูลแบบทนความล้มเหลว — ส่วนไหนพังก็ข้ามไป ยังได้ briefing เสมอ
    const [finRes, loanRes, alertRes] = await Promise.allSettled([
      this.chat.getFinancialSummary(scId, budgetYear),
      this.chat.getLoanSummary(scId, budgetYear),
      // sync=false: อ่านเตือนที่ engine/cron/widget sync ไว้แล้ว — ให้ briefing เบาและเร็ว
      this.workAlerts.load(scId, budgetYear, user, false),
    ]);

    const fin = finRes.status === 'fulfilled' ? finRes.value : null;
    const loan = loanRes.status === 'fulfilled' ? loanRes.value : null;
    const alerts =
      alertRes.status === 'fulfilled' ? alertRes.value : { data: [], count: 0 };
    if (finRes.status === 'rejected')
      this.logger.warn(`briefing finance ล้มเหลว: ${finRes.reason}`);
    if (alertRes.status === 'rejected')
      this.logger.warn(`briefing alerts ล้มเหลว: ${alertRes.reason}`);

    const highlights: BriefingHighlight[] = [];

    // เงินยืมเกินกำหนด — ความเสี่ยงสูงสุด แจ้งก่อน
    if (loan && loan.overdue_count > 0) {
      highlights.push({
        severity: 'error',
        icon: 'AlertCircle',
        text: `เงินยืมเกินกำหนดส่งใช้ ${loan.overdue_count} สัญญา (${this.fmt(loan.overdue_amount)} บาท) — ติดตามคืนโดยด่วน`,
        link: '/sfmis/pay-menu/loan-agreement',
      });
    } else if (loan && loan.pending_count > 0) {
      highlights.push({
        severity: 'info',
        icon: 'HandCoins',
        text: `เงินยืมค้างส่งใช้ ${loan.pending_count} สัญญา (${this.fmt(loan.pending_amount)} บาท)`,
        link: '/sfmis/pay-menu/loan-agreement',
      });
    }

    // ใบสำคัญจ่ายค้างอนุมัติ
    if (fin && fin.pending_invoices > 0) {
      highlights.push({
        severity: 'warning',
        icon: 'FileClock',
        text: `ใบสำคัญจ่ายรออนุมัติ ${fin.pending_invoices} รายการ (${this.fmt(fin.pending_invoice_amount)} บาท)`,
        link: '/sfmis/pay-menu/invoice',
      });
    }

    // งานเตือนจาก engine (deadline / anomaly / ตรวจข้ามฝ่าย) — เลือกตัวรุนแรงสุดมาเสริม
    const topAlerts = [...alerts.data]
      .sort((a, b) => this.alertRank(b.severity) - this.alertRank(a.severity))
      .slice(0, 3);
    for (const a of topAlerts) {
      highlights.push({
        severity: this.normalizeAlertSeverity(a.severity),
        icon: 'BellRing',
        text: a.title,
        link: a.link ?? null,
      });
    }

    // เรียงตามความรุนแรง + จำกัดไม่ให้ยาวเกิน
    highlights.sort(
      (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
    );
    const trimmed = highlights.slice(0, 5);

    // ถ้าไม่มีอะไรค้างเลย → แจ้งเชิงบวก
    if (trimmed.length === 0 && fin) {
      trimmed.push({
        severity: 'success',
        icon: 'CheckCircle2',
        text: `ทุกอย่างเรียบร้อยดี — เงินคงเหลือ ${this.fmt(fin.balance)} บาท ไม่มีงานเร่งด่วนค้าง`,
        link: null,
      });
    }

    const headline = this.headline(trimmed, alerts.count);
    const suggested = this.suggestActions(opts.path, {
      pendingInvoices: fin?.pending_invoices ?? 0,
      overdueLoans: loan?.overdue_count ?? 0,
      alertCount: alerts.count,
    });

    return {
      greeting,
      headline,
      highlights: trimmed,
      suggested_actions: suggested,
      alert_count: alerts.count,
      generated_at: now.toISOString(),
    };
  }

  // ─────────────────────────────────────────────

  private greeting(now: Date): string {
    const h = now.getHours();
    if (h >= 5 && h < 11) return 'สวัสดีตอนเช้า';
    if (h >= 11 && h < 13) return 'สวัสดีตอนกลางวัน';
    if (h >= 13 && h < 17) return 'สวัสดีตอนบ่าย';
    if (h >= 17 && h < 21) return 'สวัสดีตอนเย็น';
    return 'สวัสดีค่ะ';
  }

  private headline(highlights: BriefingHighlight[], alertCount: number): string {
    const urgent = highlights.filter(
      (h) => h.severity === 'error' || h.severity === 'warning',
    ).length;
    if (urgent > 0) {
      return `มี ${urgent} เรื่องที่ควรจัดการก่อน${alertCount > urgent ? ` และงานเตือนอีก ${alertCount} รายการ` : ''}`;
    }
    if (alertCount > 0) {
      return `มีงานเตือน ${alertCount} รายการรอตรวจ`;
    }
    return 'ไม่มีงานเร่งด่วนค้าง — พร้อมเริ่มงานได้เลย';
  }

  private suggestActions(
    path: string | undefined,
    stats: { pendingInvoices: number; overdueLoans: number; alertCount: number },
  ): BriefingAction[] {
    const actions: BriefingAction[] = [];

    // 1) ตามงานค้างจริง — มาก่อนเพราะเกี่ยวข้องที่สุด
    if (stats.overdueLoans > 0) {
      actions.push({
        label: 'เงินยืมเกินกำหนด',
        message: 'มีสัญญายืมเงินค้างคืนหรือเกินกำหนดกี่รายการ',
        mode: 'chat',
      });
    }
    if (stats.pendingInvoices > 0) {
      actions.push({
        label: 'ใบสำคัญจ่ายค้าง',
        message: 'ใบสำคัญจ่ายที่รออนุมัติมีรายการใดบ้าง',
        mode: 'chat',
      });
    }
    if (stats.alertCount > 0) {
      actions.push({
        label: 'ดูงานค้างทั้งหมด',
        message: 'วันนี้มีงานค้างหรือความเสี่ยงอะไรที่ต้องทำก่อน',
        mode: 'chat',
      });
    }

    // 2) ตามหน้าที่ผู้ใช้อยู่
    if (path) {
      const page = PAGE_ACTIONS.find((p) => path.includes(p.match));
      if (page) actions.push(page.action);
    }

    // 3) เติมด้วย default จนครบ
    for (const a of DEFAULT_ACTIONS) actions.push(a);

    // unique ตาม label + จำกัด 5
    const seen = new Set<string>();
    const unique: BriefingAction[] = [];
    for (const a of actions) {
      if (seen.has(a.label)) continue;
      seen.add(a.label);
      unique.push(a);
      if (unique.length >= 5) break;
    }
    return unique;
  }

  private alertRank(severity: string): number {
    return SEVERITY_RANK[this.normalizeAlertSeverity(severity)];
  }

  private normalizeAlertSeverity(severity: string): BriefingSeverity {
    if (severity === 'error' || severity === 'warning' || severity === 'info')
      return severity;
    return 'info';
  }

  private fmt(n: number): string {
    return Number(n).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
