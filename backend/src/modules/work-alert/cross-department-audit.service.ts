import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ComputedAlert } from './deadline-rules';
import { addDays, ymd } from './deadline-rules';

type SqlRow = Record<string, unknown>;

const PLAN_ROLES = '3,6';
const SUPPLY_ROLES = '4,7';
const FINANCE_ROLES = '5,8';

/**
 * ตรวจความสอดคล้องของสายงาน แผน -> พัสดุ -> การเงิน แบบ read-only
 * ผลตรวจถูกส่งกลับเป็น WorkAlert เท่านั้น ไม่แก้ไขหรืออนุมัติรายการต้นทาง
 */
@Injectable()
export class CrossDepartmentAuditService {
  private readonly logger = new Logger(CrossDepartmentAuditService.name);

  constructor(private readonly dataSource: DataSource) {}

  async computeForSchool(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const checks = await Promise.all([
      this.upcomingProjects(scId, budgetYear, today),
      this.overdueProjectTasks(scId, budgetYear, today),
      this.approvedProjectsWithoutProcurement(scId, budgetYear, today),
      this.staleProcurement(scId, budgetYear, today),
      this.receivedWithoutInvoice(scId, budgetYear, today),
      this.staleInvoices(scId, budgetYear, today),
      this.projectBudgetMismatch(scId, budgetYear, today),
    ]);
    return checks.flat();
  }

  private async upcomingProjects(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT proj_id, proj_name, start_date, execution_status
       FROM pln_project
       WHERE sc_id = ? AND budget_year = ? AND del = 0
         AND start_date BETWEEN ? AND ?
         AND execution_status IN (1, 2)`,
      [scId, Number(budgetYear), ymd(today), ymd(addDays(today, 7))],
    );
    return rows.map((r) => {
      const due = String(r.start_date);
      const days = this.daysBetween(today, due);
      return {
        rule_code: 'PLAN_UPCOMING',
        period: String(r.proj_id),
        severity: days <= 2 ? 'warning' : 'info',
        title: `โครงการใกล้เริ่ม: ${String(r.proj_name)}`,
        detail: `โครงการจะเริ่มใน ${Math.max(days, 0)} วัน แต่สถานะยังเป็น ${Number(r.execution_status) === 1 ? 'ร่าง' : 'พร้อมดำเนินการ'} กรุณาตรวจงานย่อย ผู้รับผิดชอบ และความพร้อมด้านพัสดุ/การเงิน`,
        link: `/sfmis/plan-menu/projects/${r.proj_id}`,
        due_date: due,
        assignee_role: PLAN_ROLES,
      } satisfies ComputedAlert;
    });
  }

  private async overdueProjectTasks(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT t.task_id, t.project_id, t.title, t.due_date, t.status, p.proj_name
       FROM pln_project_task t
       INNER JOIN pln_project p ON p.proj_id = t.project_id AND p.del = 0
       WHERE t.sc_id = ? AND p.budget_year = ? AND t.del = 0
         AND t.status NOT IN (4, 9) AND t.due_date < ?`,
      [scId, Number(budgetYear), ymd(today)],
    );
    return rows.map((r) => {
      const due = String(r.due_date);
      const late = Math.max(1, -this.daysBetween(today, due));
      return {
        rule_code: 'PLAN_TASK_OVERDUE',
        period: String(r.task_id),
        severity: late >= 7 || Number(r.status) === 5 ? 'error' : 'warning',
        title: `งานโครงการเกินกำหนด: ${String(r.title)}`,
        detail: `โครงการ ${String(r.proj_name)} ค้าง ${late} วัน กรุณาระบุสาเหตุ ติดตามผู้รับผิดชอบ และประเมินผลกระทบต่อการจัดซื้อ/เบิกจ่าย`,
        link: `/sfmis/plan-menu/projects/${r.project_id}`,
        due_date: due,
        assignee_role: PLAN_ROLES,
      } satisfies ComputedAlert;
    });
  }

  private async approvedProjectsWithoutProcurement(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT p.proj_id, p.proj_name, p.start_date, p.proj_budget
       FROM pln_project p
       LEFT JOIN parcel_order o
         ON o.project_id = p.proj_id AND o.sc_id = p.sc_id AND o.del = 0 AND o.order_status <> 9
       WHERE p.sc_id = ? AND p.budget_year = ? AND p.del = 0
         AND p.proj_status = 1 AND p.proj_budget > 0
         AND p.start_date IS NOT NULL AND p.start_date <= ?
       GROUP BY p.proj_id, p.proj_name, p.start_date, p.proj_budget
       HAVING COUNT(o.order_id) = 0`,
      [scId, Number(budgetYear), ymd(addDays(today, 14))],
    );
    return rows.map((r) => ({
      rule_code: 'PLAN_NO_PROCUREMENT',
      period: String(r.proj_id),
      severity: this.daysBetween(today, String(r.start_date)) <= 0 ? 'warning' : 'info',
      title: `โครงการอนุมัติแล้ว แต่ยังไม่พบงานจัดซื้อ: ${String(r.proj_name)}`,
      detail: `วงเงิน ${this.money(r.proj_budget)} บาท และใกล้ถึงวันเริ่มโครงการ กรุณาตรวจว่าเป็นค่าใช้จ่ายที่ต้องส่งต่อพัสดุหรือไม่ หากใช่ให้จัดทำแผน/คำขอจัดซื้อ`,
      link: '/sfmis/plan-menu/manage-project',
      due_date: String(r.start_date),
      assignee_role: `${PLAN_ROLES},${SUPPLY_ROLES}`,
    }));
  }

  private async staleProcurement(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT order_id, details, order_status, due_date,
              DATEDIFF(?, COALESCE(update_date, create_date, order_date)) AS idle_days
       FROM parcel_order
       WHERE sc_id = ? AND acad_year = ? AND del = 0
         AND order_status BETWEEN 1 AND 7
         AND DATEDIFF(?, COALESCE(update_date, create_date, order_date)) >= 3`,
      [ymd(today), scId, Number(budgetYear), ymd(today)],
    );
    return rows.map((r) => {
      const status = Number(r.order_status);
      const idle = Number(r.idle_days);
      const owner = this.procurementOwner(status);
      return {
        rule_code: 'PROCUREMENT_STALE',
        period: String(r.order_id),
        severity: idle >= 7 || (r.due_date && this.daysBetween(today, String(r.due_date)) < 0) ? 'error' : 'warning',
        title: `งานจัดซื้อค้างที่ขั้น ${this.procurementStatus(status)}`,
        detail: `${String(r.details || `คำขอเลขที่ ${r.order_id}`)} ไม่มีความเคลื่อนไหว ${idle} วัน กรุณาตรวจเอกสารและส่งต่อ ${owner.label}`,
        link: owner.link,
        due_date: r.due_date ? String(r.due_date) : ymd(today),
        assignee_role: owner.roles,
      } satisfies ComputedAlert;
    });
  }

  private async receivedWithoutInvoice(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT i.insp_id, i.order_id, i.insp_date, o.details, o.budgets
       FROM sup_inspection i
       INNER JOIN parcel_order o ON o.order_id = i.order_id AND o.del = 0
       LEFT JOIN request_withdraw rw
         ON rw.order_id = i.order_id AND rw.sc_id = i.sc_id AND rw.del = 0 AND rw.status NOT IN (51, 201)
       WHERE i.sc_id = ? AND o.acad_year = ? AND i.del = 0 AND i.insp_result = 1
         AND DATEDIFF(?, i.insp_date) >= 1
       GROUP BY i.insp_id, i.order_id, i.insp_date, o.details, o.budgets
       HAVING COUNT(rw.rw_id) = 0`,
      [scId, Number(budgetYear), ymd(today)],
    );
    return rows.map((r) => {
      const idle = Math.max(1, -this.daysBetween(today, String(r.insp_date)));
      return {
        rule_code: 'INSPECTED_NO_INVOICE',
        period: String(r.order_id),
        severity: idle >= 5 ? 'error' : 'warning',
        title: 'ตรวจรับพัสดุแล้ว แต่ยังไม่ตั้งเรื่องเบิกจ่าย',
        detail: `${String(r.details || `คำสั่งซื้อ ${r.order_id}`)} วงเงิน ${this.money(r.budgets)} บาท ตรวจรับแล้ว ${idle} วัน กรุณาส่งหลักฐานให้ฝ่ายการเงินตั้งใบสำคัญจ่าย`,
        link: '/sfmis/pay-menu/invoice',
        due_date: ymd(addDays(new Date(String(r.insp_date)), 3)),
        assignee_role: `${SUPPLY_ROLES},${FINANCE_ROLES}`,
      } satisfies ComputedAlert;
    });
  }

  private async staleInvoices(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT rw_id, no_doc, detail, amount, status, date_request,
              DATEDIFF(?, COALESCE(update_date, create_date, date_request)) AS idle_days
       FROM request_withdraw
       WHERE sc_id = ? AND (year = ? OR year = ?) AND del = 0
         AND status IN (0, 50, 100, 102, 200)
         AND DATEDIFF(?, COALESCE(update_date, create_date, date_request)) >= 3`,
      [ymd(today), scId, budgetYear, String(Number(budgetYear) - 543), ymd(today)],
    );
    return rows.map((r) => {
      const idle = Number(r.idle_days);
      const status = Number(r.status);
      return {
        rule_code: 'FINANCE_STALE',
        period: String(r.rw_id),
        severity: idle >= 7 ? 'error' : 'warning',
        title: `ใบสำคัญจ่ายค้าง: ${String(r.no_doc || r.detail || r.rw_id)}`,
        detail: `ยอด ${this.money(r.amount)} บาท ค้างที่ขั้น ${this.invoiceStatus(status)} ${idle} วัน กรุณาตรวจและส่งต่อผู้เกี่ยวข้อง`,
        link: status === 200 ? '/sfmis/pay-menu/generate-check' : '/sfmis/pay-menu/invoice',
        due_date: ymd(today),
        assignee_role: status === 102 || status === 200 ? `2,${FINANCE_ROLES}` : FINANCE_ROLES,
      } satisfies ComputedAlert;
    });
  }

  private async projectBudgetMismatch(
    scId: number,
    budgetYear: string,
    today: Date,
  ): Promise<ComputedAlert[]> {
    const rows = await this.query(
      `SELECT p.proj_id, p.proj_name, p.proj_budget,
              COALESCE(SUM(CASE WHEN o.order_status <> 9 THEN o.budgets ELSE 0 END), 0) AS ordered
       FROM pln_project p
       INNER JOIN parcel_order o ON o.project_id = p.proj_id AND o.sc_id = p.sc_id AND o.del = 0
       WHERE p.sc_id = ? AND p.budget_year = ? AND p.del = 0
       GROUP BY p.proj_id, p.proj_name, p.proj_budget
       HAVING ordered > p.proj_budget + 0.01`,
      [scId, Number(budgetYear)],
    );
    return rows.map((r) => ({
      rule_code: 'PROJECT_BUDGET_EXCEEDED',
      period: String(r.proj_id),
      severity: 'error',
      title: `วงเงินจัดซื้อเกินงบโครงการ: ${String(r.proj_name)}`,
      detail: `งบโครงการ ${this.money(r.proj_budget)} บาท แต่คำขอจัดซื้อรวม ${this.money(r.ordered)} บาท กรุณาหยุดส่งต่อและตรวจวงเงินร่วมกันทั้งฝ่ายแผน พัสดุ และการเงิน`,
      link: `/sfmis/plan-menu/projects/${r.proj_id}`,
      due_date: ymd(today),
      assignee_role: `${PLAN_ROLES},${SUPPLY_ROLES},${FINANCE_ROLES}`,
    }));
  }

  private async query(sql: string, params: unknown[]): Promise<SqlRow[]> {
    try {
      return (await this.dataSource.query(sql, params)) as SqlRow[];
    } catch (error) {
      this.logger.warn(`ข้ามกฎตรวจข้ามฝ่าย: ${(error as Error).message}`);
      return [];
    }
  }

  private daysBetween(today: Date, date: string): number {
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(`${date}T00:00:00`);
    return Math.ceil((to.getTime() - from.getTime()) / 86400000);
  }

  private money(value: unknown): string {
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private procurementStatus(status: number): string {
    return ({
      1: 'คำขอ',
      2: 'ตรวจแผน',
      3: 'ตรวจวงเงิน',
      4: 'ตรวจพัสดุ',
      5: 'รอผู้อำนวยการ',
      6: 'ตั้งกรรมการ',
      7: 'จัดซื้อ/รอตรวจรับ',
    } as Record<number, string>)[status] ?? `สถานะ ${status}`;
  }

  private procurementOwner(status: number): { label: string; roles: string; link: string } {
    if (status === 1) return { label: 'ฝ่ายแผน', roles: PLAN_ROLES, link: '/sfmis/plan-menu/proj-approve' };
    if (status === 2) return { label: 'ฝ่ายการเงิน', roles: FINANCE_ROLES, link: '/sfmis/plan-menu/proj-approve' };
    if (status === 4) return { label: 'ผู้อำนวยการ', roles: '2', link: '/sfmis/plan-menu/proj-approve' };
    return { label: 'ฝ่ายพัสดุ', roles: SUPPLY_ROLES, link: status >= 6 ? '/sfmis/supplie-setting/withdraw-confirm' : '/sfmis/plan-menu/proj-approve' };
  }

  private invoiceStatus(status: number): string {
    return ({
      0: 'ร่าง',
      50: 'รอตรวจฎีกา',
      100: 'รอหัวหน้าการเงินอนุมัติ',
      102: 'รอผู้อำนวยการอนุมัติ',
      200: 'รอออกเช็ค',
    } as Record<number, string>)[status] ?? `สถานะ ${status}`;
  }
}
