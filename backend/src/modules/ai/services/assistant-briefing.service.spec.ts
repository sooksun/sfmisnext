import { AssistantBriefingService } from './assistant-briefing.service';
import type { ChatService } from './chat.service';
import type { WorkAlertService } from '../../work-alert/work-alert.service';
import type { JwtUser } from '../../../common/utils/tenant-guard';

/**
 * เทส briefing เชิงรุก (rule-based) — mock ChatService + WorkAlertService
 * เน้น: ทักทายตามเวลา, จัดลำดับความรุนแรง, ปุ่มลัดตามบริบท, เคสทุกอย่างเรียบร้อย
 */
describe('AssistantBriefingService', () => {
  const user: JwtUser = { admin_id: 1, username: 'u', sc_id: 1, type: 3 };

  const make = (over: {
    fin?: Partial<{
      pending_invoices: number;
      pending_invoice_amount: number;
      balance: number;
    }>;
    loan?: Partial<{
      overdue_count: number;
      overdue_amount: number;
      pending_count: number;
      pending_amount: number;
    }>;
    alerts?: { data: { severity: string; title: string; link: string | null }[]; count: number };
  }) => {
    const chat = {
      getFinancialSummary: jest.fn().mockResolvedValue({
        total_receive: 0,
        total_pay: 0,
        balance: over.fin?.balance ?? 100000,
        pending_invoices: over.fin?.pending_invoices ?? 0,
        pending_invoice_amount: over.fin?.pending_invoice_amount ?? 0,
      }),
      getLoanSummary: jest.fn().mockResolvedValue({
        total_loans: 0,
        pending_count: over.loan?.pending_count ?? 0,
        pending_amount: over.loan?.pending_amount ?? 0,
        overdue_count: over.loan?.overdue_count ?? 0,
        overdue_amount: over.loan?.overdue_amount ?? 0,
      }),
    } as unknown as ChatService;
    const workAlerts = {
      load: jest.fn().mockResolvedValue(over.alerts ?? { data: [], count: 0 }),
    } as unknown as WorkAlertService;
    return new AssistantBriefingService(chat, workAlerts);
  };

  it('ทักทายตามช่วงเวลา (เช้า/บ่าย/เย็น)', async () => {
    const svc = make({});
    const morning = await svc.build(1, '2569', user, { now: new Date('2026-06-16T08:00:00') });
    expect(morning.greeting).toBe('สวัสดีตอนเช้า');
    const afternoon = await svc.build(1, '2569', user, { now: new Date('2026-06-16T15:00:00') });
    expect(afternoon.greeting).toBe('สวัสดีตอนบ่าย');
    const evening = await svc.build(1, '2569', user, { now: new Date('2026-06-16T19:00:00') });
    expect(evening.greeting).toBe('สวัสดีตอนเย็น');
  });

  it('เงินยืมเกินกำหนดต้องเป็น highlight แรก (severity error)', async () => {
    const svc = make({
      loan: { overdue_count: 2, overdue_amount: 5000 },
      fin: { pending_invoices: 1, pending_invoice_amount: 1000 },
    });
    const r = await svc.build(1, '2569', user);
    expect(r.highlights[0].severity).toBe('error');
    expect(r.highlights[0].text).toContain('เงินยืมเกินกำหนด');
    expect(r.alert_count).toBe(0);
  });

  it('ไม่มีงานค้าง → highlight เชิงบวก + headline พร้อมเริ่มงาน', async () => {
    const svc = make({ fin: { balance: 250000 } });
    const r = await svc.build(1, '2569', user);
    expect(r.highlights).toHaveLength(1);
    expect(r.highlights[0].severity).toBe('success');
    expect(r.headline).toContain('ไม่มีงานเร่งด่วน');
  });

  it('ปุ่มลัดเสนองานค้างจริงก่อน แล้วตามด้วยปุ่มเฉพาะหน้า', async () => {
    const svc = make({ fin: { pending_invoices: 3, pending_invoice_amount: 9000 } });
    const r = await svc.build(1, '2569', user, { path: '/sfmis/pay-menu/invoice' });
    const labels = r.suggested_actions.map((a) => a.label);
    expect(labels).toContain('ใบสำคัญจ่ายค้าง');
    expect(labels).toContain('สร้างใบสำคัญจ่าย'); // จากบริบทหน้า
    expect(r.suggested_actions.length).toBeLessThanOrEqual(5);
    // ไม่มี label ซ้ำ
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('งานเตือนจาก engine ถูกดึงมาเป็น highlight และนับ alert_count', async () => {
    const svc = make({
      alerts: {
        data: [
          { severity: 'error', title: 'รายได้แผ่นดินค้างนำส่งเกินกำหนด', link: '/sfmis/x' },
          { severity: 'info', title: 'ใกล้ครบกำหนดส่งรายงานเดือน', link: null },
        ],
        count: 2,
      },
    });
    const r = await svc.build(1, '2569', user);
    expect(r.alert_count).toBe(2);
    expect(r.highlights.some((h) => h.text.includes('รายได้แผ่นดิน'))).toBe(true);
    // error ต้องอยู่เหนือ info
    const errIdx = r.highlights.findIndex((h) => h.severity === 'error');
    const infoIdx = r.highlights.findIndex((h) => h.severity === 'info');
    expect(errIdx).toBeLessThan(infoIdx);
  });

  it('ทนความล้มเหลว: ถ้า finance query พัง ยังคืน briefing พร้อมทักทาย', async () => {
    const chat = {
      getFinancialSummary: jest.fn().mockRejectedValue(new Error('db down')),
      getLoanSummary: jest.fn().mockRejectedValue(new Error('db down')),
    } as unknown as ChatService;
    const workAlerts = {
      load: jest.fn().mockResolvedValue({ data: [], count: 0 }),
    } as unknown as WorkAlertService;
    const svc = new AssistantBriefingService(chat, workAlerts);
    const r = await svc.build(1, '2569', user);
    expect(r.greeting).toBeTruthy();
    expect(Array.isArray(r.suggested_actions)).toBe(true);
  });
});
