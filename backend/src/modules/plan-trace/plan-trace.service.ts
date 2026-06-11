import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class PlanTraceService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** ติดตามเส้นทาง: แผน → โครงการ → ใบขอซื้อ → เช็ค/ใบสำคัญ — สำหรับ 1 โครงการ */
  async traceByProject(projectId: number, user?: JwtUser) {
    const project = await this.ds.query(
      `SELECT p.proj_id AS project_id, p.proj_name AS project_name, p.sc_id,
              sy.budget_year, p.proj_budget AS total_budget, p.proj_status AS status
         FROM pln_project p
         LEFT JOIN school_year sy ON sy.sy_id = p.sy_id AND sy.del = 0
        WHERE p.proj_id = ? AND p.del = 0`,
      [projectId],
    );
    if (!project.length) return { flag: false, ms: 'ไม่พบโครงการ' };

    // กัน cross-tenant: โครงการต้องเป็นของโรงเรียนเดียวกับ JWT user
    if (user) assertSameSchool(user, Number(project[0].sc_id));

    const orders = await this.ds.query(
      `SELECT order_id, project_id, budgets AS order_total, order_status, method_type, order_date
         FROM parcel_order WHERE project_id = ? AND del = 0 ORDER BY order_id DESC`,
      [projectId],
    );

    const orderIds = orders.map((o: any) => o.order_id);
    let withdraws: any[] = [];
    let checks: any[] = [];

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      try {
        withdraws = await this.ds.query(
          `SELECT rw_id, rw_no, rw_date, order_id, amount_total, status
             FROM tb_request_withdraw
             WHERE order_id IN (${placeholders}) AND del = 0 ORDER BY rw_id DESC`,
          orderIds,
        );
      } catch {
        // table name may differ — ignore
        withdraws = [];
      }

      const rwIds = withdraws.map((w: any) => w.rw_id);
      if (rwIds.length > 0) {
        const ph2 = rwIds.map(() => '?').join(',');
        try {
          checks = await this.ds.query(
            `SELECT ch_id, ch_no, ch_date, rw_id, ch_amount, ch_status
               FROM tb_check WHERE rw_id IN (${ph2}) AND del = 0 ORDER BY ch_id DESC`,
            rwIds,
          );
        } catch {
          checks = [];
        }
      }
    }

    const totalOrdered = orders.reduce(
      (s: number, o: any) => s + toNum(o.order_total),
      0,
    );
    const totalWithdraw = withdraws.reduce(
      (s: number, w: any) => s + toNum(w.amount_total),
      0,
    );
    const totalCheck = checks.reduce(
      (s: number, c: any) => s + toNum(c.ch_amount),
      0,
    );

    const budget = toNum(project[0].total_budget);
    return {
      flag: true,
      project: {
        project_id: project[0].project_id,
        project_name: project[0].project_name,
        budget_year: project[0].budget_year,
        total_budget: budget,
        status: project[0].status,
      },
      parcel_orders: orders,
      withdraws,
      checks,
      summary: {
        total_ordered: totalOrdered,
        total_withdraw: totalWithdraw,
        total_check: totalCheck,
        budget_remaining: budget - totalCheck,
        percent_used:
          budget > 0 ? Math.round((totalCheck / budget) * 10000) / 100 : 0,
      },
    };
  }

  /** สรุปภาพรวมทั้งโรงเรียนในปีงบประมาณหนึ่ง */
  async overview(scId: number, budgetYear: number) {
    // pln_project ไม่มี budget_year ตรง ๆ — JOIN school_year ด้วย sy_id
    // และ parcel_order ใช้คอลัมน์ `budgets` ไม่ใช่ `order_total`
    const rows = await this.ds.query(
      `SELECT
          p.proj_id   AS project_id,
          p.proj_name AS project_name,
          p.proj_budget AS total_budget,
          COALESCE((SELECT SUM(budgets) FROM parcel_order WHERE project_id = p.proj_id AND del = 0), 0) AS total_ordered,
          COALESCE((SELECT COUNT(*)   FROM parcel_order WHERE project_id = p.proj_id AND del = 0), 0) AS order_count
        FROM pln_project p
        JOIN school_year sy ON sy.sy_id = p.sy_id AND sy.del = 0
       WHERE p.sc_id = ? AND sy.budget_year = ? AND p.del = 0
       ORDER BY p.proj_id ASC`,
      [scId, budgetYear],
    );

    return {
      data: rows.map((r: any) => ({
        project_id: r.project_id,
        project_name: r.project_name,
        total_budget: toNum(r.total_budget),
        total_ordered: toNum(r.total_ordered),
        order_count: toNum(r.order_count),
        budget_remaining: toNum(r.total_budget) - toNum(r.total_ordered),
        percent_used:
          toNum(r.total_budget) > 0
            ? Math.round(
                (toNum(r.total_ordered) / toNum(r.total_budget)) * 10000,
              ) / 100
            : 0,
      })),
      count: rows.length,
    };
  }
}
