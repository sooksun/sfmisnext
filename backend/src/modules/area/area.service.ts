import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AreaService {
  constructor(private readonly ds: DataSource) {}

  // budget_year ที่ frontend ส่งมาเป็น BE (เช่น 2569)
  // financial_transactions ใช้ CE → ต้องแปลง
  private toCE(budgetYearBE: number): number {
    return budgetYearBE >= 2500 ? budgetYearBE - 543 : budgetYearBE;
  }

  private async getSchools(areacode: string): Promise<{ sc_id: number; sc_name: string }[]> {
    return this.ds.query(
      'SELECT sc_id, sc_name FROM school WHERE areacode = ? AND del = 0 ORDER BY sc_id',
      [areacode],
    );
  }

  // ────────────────────────────────────────────────
  // 1. ภาพรวมเขต (dashboard)
  // ────────────────────────────────────────────────
  async getDashboard(areacode: string, budgetYear: number) {
    const ceYear = this.toCE(budgetYear);
    const schools = await this.getSchools(areacode);
    const scIds = schools.map((s) => s.sc_id);

    if (!scIds.length) {
      return {
        areacode,
        budget_year: budgetYear,
        schools: [],
        aggregate: { total_in: 0, total_out: 0, balance: 0, total_schools: 0, total_students: 0 },
      };
    }

    const [ftRows, projRows, stdRows, assessRows]: [any[], any[], any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT sc_id,
           COALESCE(SUM(CASE WHEN type=1 THEN amount ELSE 0 END),0)  AS total_in,
           COALESCE(SUM(CASE WHEN type=-1 THEN amount ELSE 0 END),0) AS total_out
         FROM financial_transactions
         WHERE sc_id IN (?) AND del=0 AND budget_year=?
         GROUP BY sc_id`,
        [scIds, ceYear],
      ),
      this.ds.query(
        `SELECT sc_id, proj_status, COUNT(*) AS cnt
         FROM pln_project
         WHERE sc_id IN (?) AND del=0 AND budget_year=?
         GROUP BY sc_id, proj_status`,
        [scIds, budgetYear],
      ),
      this.ds.query(
        `SELECT sc_id, COALESCE(SUM(std_count),0) AS total_students
         FROM tb_student WHERE sc_id IN (?) AND del=0 GROUP BY sc_id`,
        [scIds],
      ),
      this.ds.query(
        `SELECT sc_id, status, total_score, percent, level
         FROM financial_assessment
         WHERE sc_id IN (?) AND budget_year=? AND del=0`,
        [scIds, String(budgetYear)],
      ),
    ]);

    const ftMap = new Map(ftRows.map((r) => [r.sc_id, r]));
    const projMap = new Map<number, Record<number, number>>();
    for (const r of projRows) {
      const m = projMap.get(r.sc_id) ?? {};
      m[r.proj_status] = Number(r.cnt);
      projMap.set(r.sc_id, m);
    }
    const stdMap = new Map(stdRows.map((r) => [r.sc_id, Number(r.total_students)]));
    const assessMap = new Map(assessRows.map((r) => [r.sc_id, r]));

    const schoolRows = schools.map((sc) => {
      const ft = ftMap.get(sc.sc_id) ?? { total_in: 0, total_out: 0 };
      const proj = projMap.get(sc.sc_id) ?? {};
      const assess = assessMap.get(sc.sc_id);
      const totalIn = Number(ft.total_in);
      const totalOut = Number(ft.total_out);
      return {
        sc_id: sc.sc_id,
        sc_name: sc.sc_name,
        total_in: totalIn,
        total_out: totalOut,
        balance: totalIn - totalOut,
        students: stdMap.get(sc.sc_id) ?? 0,
        projects_total: Object.values(proj).reduce((a, b) => a + (b as number), 0),
        projects_active: (proj[3] ?? 0) + (proj[2] ?? 0),
        projects_done: proj[5] ?? 0,
        projects_blocked: proj[6] ?? 0,
        assessment_status: Number(assess?.status ?? 0),
        assessment_percent: Number(assess?.percent ?? 0),
        assessment_level: Number(assess?.level ?? 0),
      };
    });

    const aggregate = {
      total_in: schoolRows.reduce((a, s) => a + s.total_in, 0),
      total_out: schoolRows.reduce((a, s) => a + s.total_out, 0),
      balance: schoolRows.reduce((a, s) => a + s.balance, 0),
      total_schools: schools.length,
      total_students: schoolRows.reduce((a, s) => a + s.students, 0),
    };

    return { areacode, budget_year: budgetYear, schools: schoolRows, aggregate };
  }

  // ────────────────────────────────────────────────
  // 2. แผนงาน/โครงการ
  // ────────────────────────────────────────────────
  async getPlanSummary(areacode: string, budgetYear: number) {
    const schools = await this.getSchools(areacode);
    const scIds = schools.map((s) => s.sc_id);
    if (!scIds.length) return { schools: [], budget_year: budgetYear };

    const [projects, procRows]: [any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT p.proj_id, p.sc_id, p.proj_name, p.proj_status, p.execution_status,
                p.progress_percent, p.start_date, p.end_date, p.proj_budget
         FROM pln_project p
         WHERE p.sc_id IN (?) AND p.del=0 AND p.budget_year=?
         ORDER BY p.sc_id, p.proj_status, p.proj_id`,
        [scIds, budgetYear],
      ),
      this.ds.query(
        `SELECT sc_id,
           COUNT(*) AS cnt,
           COALESCE(SUM(budgets),0) AS total_budget,
           COALESCE(SUM(CASE WHEN order_status>=200 THEN budgets ELSE 0 END),0) AS approved_budget,
           SUM(CASE WHEN order_status>=200 THEN 1 ELSE 0 END) AS approved_cnt
         FROM parcel_order
         WHERE sc_id IN (?) AND del=0 AND acad_year=?
         GROUP BY sc_id`,
        [scIds, budgetYear],
      ),
    ]);

    const scName = new Map(schools.map((s) => [s.sc_id, s.sc_name]));
    const procMap = new Map(procRows.map((r) => [r.sc_id, r]));

    const bySchool: Record<number, any> = {};
    for (const sc of schools) {
      bySchool[sc.sc_id] = {
        sc_id: sc.sc_id,
        sc_name: sc.sc_name,
        projects: [],
        procurement: procMap.get(sc.sc_id) ?? null,
      };
    }
    for (const p of projects) {
      if (bySchool[p.sc_id]) bySchool[p.sc_id].projects.push(p);
    }

    return {
      schools: Object.values(bySchool).sort((a, b) => a.sc_id - b.sc_id),
      budget_year: budgetYear,
    };
  }

  // ────────────────────────────────────────────────
  // 3. การเงิน
  // ────────────────────────────────────────────────
  async getFinanceSummary(areacode: string, budgetYear: number) {
    const ceYear = this.toCE(budgetYear);
    const schools = await this.getSchools(areacode);
    const scIds = schools.map((s) => s.sc_id);
    if (!scIds.length) return { schools: [], budget_year: budgetYear };

    const [byType, monthly]: [any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT ft.sc_id, ft.bg_type_id,
           COALESCE(mbit.budget_type, CONCAT('ประเภท ',ft.bg_type_id)) AS bg_name,
           COALESCE(SUM(CASE WHEN ft.type=1  THEN ft.amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN ft.type=-1 THEN ft.amount ELSE 0 END),0) AS total_out
         FROM financial_transactions ft
         LEFT JOIN master_budget_income_type mbit ON mbit.bg_type_id=ft.bg_type_id AND mbit.del=0
         WHERE ft.sc_id IN (?) AND ft.del=0 AND ft.budget_year=?
         GROUP BY ft.sc_id, ft.bg_type_id, mbit.budget_type
         ORDER BY ft.sc_id, ft.bg_type_id`,
        [scIds, ceYear],
      ),
      this.ds.query(
        `SELECT sc_id, DATE_FORMAT(create_date,'%Y-%m') AS ym,
           COALESCE(SUM(CASE WHEN type=1  THEN amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN type=-1 THEN amount ELSE 0 END),0) AS total_out
         FROM financial_transactions
         WHERE sc_id IN (?) AND del=0 AND budget_year=?
         GROUP BY sc_id, ym
         ORDER BY sc_id, ym`,
        [scIds, ceYear],
      ),
    ]);

    const bySchool: Record<number, any> = {};
    for (const sc of schools) {
      bySchool[sc.sc_id] = { sc_id: sc.sc_id, sc_name: sc.sc_name, by_type: [], monthly: [], total_in: 0, total_out: 0 };
    }
    for (const r of byType) {
      if (!bySchool[r.sc_id]) continue;
      bySchool[r.sc_id].by_type.push({ bg_type_id: r.bg_type_id, bg_name: r.bg_name, total_in: Number(r.total_in), total_out: Number(r.total_out) });
      bySchool[r.sc_id].total_in += Number(r.total_in);
      bySchool[r.sc_id].total_out += Number(r.total_out);
    }
    for (const r of monthly) {
      if (bySchool[r.sc_id]) {
        bySchool[r.sc_id].monthly.push({ ym: r.ym, in: Number(r.total_in), out: Number(r.total_out) });
      }
    }

    return { schools: Object.values(bySchool).sort((a, b) => a.sc_id - b.sc_id), budget_year: budgetYear };
  }

  // ────────────────────────────────────────────────
  // 4. พัสดุ/จัดซื้อ
  // ────────────────────────────────────────────────
  async getSupplySummary(areacode: string, budgetYear: number) {
    const schools = await this.getSchools(areacode);
    const scIds = schools.map((s) => s.sc_id);
    if (!scIds.length) return { schools: [], budget_year: budgetYear };

    const orders: any[] = await this.ds.query(
      `SELECT po.order_id, po.sc_id, po.numbers AS doc_no, po.order_status,
              po.budgets, po.order_date, po.details
       FROM parcel_order po
       WHERE po.sc_id IN (?) AND po.del=0 AND po.acad_year=?
       ORDER BY po.sc_id, po.order_date DESC`,
      [scIds, budgetYear],
    );

    const scName = new Map(schools.map((s) => [s.sc_id, s.sc_name]));
    const bySchool: Record<number, any> = {};
    for (const sc of schools) {
      bySchool[sc.sc_id] = { sc_id: sc.sc_id, sc_name: sc.sc_name, orders: [], total_budget: 0, approved_budget: 0 };
    }
    for (const o of orders) {
      if (!bySchool[o.sc_id]) continue;
      bySchool[o.sc_id].orders.push({ ...o, budgets: Number(o.budgets ?? 0) });
      bySchool[o.sc_id].total_budget += Number(o.budgets ?? 0);
      if (o.order_status >= 200) bySchool[o.sc_id].approved_budget += Number(o.budgets ?? 0);
    }
    return { schools: Object.values(bySchool).sort((a, b) => a.sc_id - b.sc_id), budget_year: budgetYear };
  }

  // ────────────────────────────────────────────────
  // 5. รายชื่อโรงเรียนในเขต (สำหรับ dropdown)
  // ────────────────────────────────────────────────
  async listSchools(areacode: string) {
    return this.getSchools(areacode);
  }

  // ────────────────────────────────────────────────
  // 6. รายงานรายโรงเรียน — ตรวจ areacode ก่อน
  // ────────────────────────────────────────────────
  private async verifySchoolInArea(areacode: string, scId: number): Promise<{ sc_id: number; sc_name: string }> {
    const rows: any[] = await this.ds.query(
      'SELECT sc_id, sc_name, areacode FROM school WHERE sc_id = ? AND del = 0 LIMIT 1',
      [scId],
    );
    if (!rows.length) throw new Error('ไม่พบโรงเรียน');
    if (rows[0].areacode !== areacode) throw new Error('โรงเรียนไม่อยู่ในเขตพื้นที่ของท่าน');
    return rows[0];
  }

  async getSchoolPlanDetail(areacode: string, scId: number, budgetYear: number) {
    const school = await this.verifySchoolInArea(areacode, scId);

    const [projects, orders, followups]: [any[], any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT p.proj_id, p.proj_name, p.proj_status, p.execution_status,
                p.progress_percent, p.start_date, p.end_date, p.proj_budget,
                p.proj_detail, p.owner_admin_id,
                a.name AS owner_name
         FROM pln_project p
         LEFT JOIN admin a ON a.admin_id = p.owner_admin_id AND a.del = 0
         WHERE p.sc_id = ? AND p.del = 0 AND p.budget_year = ?
         ORDER BY p.proj_status, p.proj_id`,
        [scId, budgetYear],
      ),
      this.ds.query(
        `SELECT po.order_id, po.numbers AS doc_no, po.order_status,
                po.budgets, po.order_date, po.details, po.job_type
         FROM parcel_order po
         WHERE po.sc_id = ? AND po.del = 0 AND po.acad_year = ?
         ORDER BY po.order_date DESC`,
        [scId, budgetYear],
      ),
      this.ds.query(
        `SELECT pf.pf_id, pf.report_period, pf.status AS fup_status, pf.percent_complete,
                pf.actual_amount, pf.output_quality, pf.create_date
         FROM pln_project_followup pf
         JOIN pln_project p ON p.proj_id = pf.project_id AND p.del = 0
         WHERE p.sc_id = ? AND pf.del = 0 AND p.budget_year = ?
         ORDER BY pf.report_period, pf.create_date DESC`,
        [scId, budgetYear],
      ),
    ]);

    const budgetSummary = {
      total_budget: projects.reduce((a, p) => a + Number(p.proj_budget ?? 0), 0),
      total_procurement: orders.reduce((a, o) => a + Number(o.budgets ?? 0), 0),
      approved_procurement: orders.filter((o) => o.order_status >= 200).reduce((a, o) => a + Number(o.budgets ?? 0), 0),
    };

    return {
      sc_id: scId,
      sc_name: school.sc_name,
      budget_year: budgetYear,
      projects,
      orders,
      followups,
      budget_summary: budgetSummary,
    };
  }

  async getSchoolFinanceDetail(areacode: string, scId: number, budgetYear: number) {
    const ceYear = this.toCE(budgetYear);
    const school = await this.verifySchoolInArea(areacode, scId);

    const [byType, monthly, receives, withdraws]: [any[], any[], any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT ft.bg_type_id,
           COALESCE(mbit.budget_type, CONCAT('ประเภท ',ft.bg_type_id)) AS bg_name,
           COALESCE(SUM(CASE WHEN ft.type=1  THEN ft.amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN ft.type=-1 THEN ft.amount ELSE 0 END),0) AS total_out
         FROM financial_transactions ft
         LEFT JOIN master_budget_income_type mbit ON mbit.bg_type_id=ft.bg_type_id AND mbit.del=0
         WHERE ft.sc_id=? AND ft.del=0 AND ft.budget_year=?
         GROUP BY ft.bg_type_id, mbit.budget_type
         ORDER BY ft.bg_type_id`,
        [scId, ceYear],
      ),
      this.ds.query(
        `SELECT DATE_FORMAT(create_date,'%Y-%m') AS ym,
           COALESCE(SUM(CASE WHEN type=1  THEN amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN type=-1 THEN amount ELSE 0 END),0) AS total_out
         FROM financial_transactions
         WHERE sc_id=? AND del=0 AND budget_year=?
         GROUP BY ym ORDER BY ym`,
        [scId, ceYear],
      ),
      // รายรับ (pln_receive + pln_receive_detail)
      this.ds.query(
        `SELECT pr.pr_id AS receive_id, pr.pr_no AS receive_no, pr.receive_date,
                COALESCE(SUM(prd.prd_budget),0) AS amount
         FROM pln_receive pr
         LEFT JOIN pln_receive_detail prd ON prd.pr_id=pr.pr_id AND prd.del=0
         WHERE pr.sc_id=? AND pr.del=0 AND pr.budget_year=?
         GROUP BY pr.pr_id, pr.pr_no, pr.receive_date
         ORDER BY pr.receive_date DESC
         LIMIT 50`,
        [scId, budgetYear],
      ),
      // รายจ่าย (request_withdraw) — year เป็น varchar BE เช่น '2569'
      this.ds.query(
        `SELECT rw_id, no_doc AS rw_no, date_request AS rw_date, amount AS rw_total, status AS rw_status
         FROM request_withdraw
         WHERE sc_id=? AND del=0 AND year=?
         ORDER BY date_request DESC
         LIMIT 50`,
        [scId, String(budgetYear)],
      ),
    ]);

    const totalIn = byType.reduce((a, r) => a + Number(r.total_in), 0);
    const totalOut = byType.reduce((a, r) => a + Number(r.total_out), 0);

    return {
      sc_id: scId,
      sc_name: school.sc_name,
      budget_year: budgetYear,
      summary: { total_in: totalIn, total_out: totalOut, balance: totalIn - totalOut },
      by_type: byType.map((r) => ({ ...r, total_in: Number(r.total_in), total_out: Number(r.total_out) })),
      monthly: monthly.map((r) => ({ ym: r.ym, in: Number(r.total_in), out: Number(r.total_out) })),
      receives: receives.map((r) => ({ ...r, amount: Number(r.amount) })),
      withdraws: withdraws.map((r) => ({ ...r, rw_total: Number(r.rw_total) })),
    };
  }

  async getSchoolSupplyDetail(areacode: string, scId: number, budgetYear: number) {
    const school = await this.verifySchoolInArea(areacode, scId);

    const [orders, supplies]: [any[], any[]] = await Promise.all([
      this.ds.query(
        `SELECT po.order_id, po.numbers AS doc_no, po.order_status,
                po.budgets, po.order_date, po.details, po.job_type,
                po.buy_date, po.departments
         FROM parcel_order po
         WHERE po.sc_id=? AND po.del=0 AND po.acad_year=?
         ORDER BY po.order_date DESC`,
        [scId, budgetYear],
      ),
      // วัสดุ-ครุภัณฑ์ที่รับเข้า
      this.ds.query(
        `SELECT rpo.receive_id AS rpo_id, rpo.receive_date AS create_date, rpo.order_id,
                COUNT(rpd.rp_id) AS item_count
         FROM receive_parcel_order rpo
         LEFT JOIN receive_parcel_detail rpd ON rpd.receive_id=rpo.receive_id AND rpd.del=0
         WHERE rpo.sc_id=? AND rpo.del=0
         AND EXISTS (SELECT 1 FROM parcel_order po WHERE po.order_id=rpo.order_id AND po.acad_year=?)
         GROUP BY rpo.receive_id, rpo.receive_date, rpo.order_id
         ORDER BY rpo.receive_date DESC`,
        [scId, budgetYear],
      ),
    ]);

    const summary = {
      total_orders: orders.length,
      total_budget: orders.reduce((a, o) => a + Number(o.budgets ?? 0), 0),
      approved_budget: orders.filter((o) => o.order_status >= 200).reduce((a, o) => a + Number(o.budgets ?? 0), 0),
      received_count: supplies.length,
    };

    return {
      sc_id: scId,
      sc_name: school.sc_name,
      budget_year: budgetYear,
      summary,
      orders: orders.map((o) => ({ ...o, budgets: Number(o.budgets ?? 0) })),
      receive_records: supplies,
    };
  }
}
