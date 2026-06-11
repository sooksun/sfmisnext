import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import {
  checkProjectOvercommit,
  checkContractOverOrder,
  checkPayBeforeInspection,
  checkYearMismatch,
  normalizeBudgetYear,
  GUARD_EPS,
} from './guard-rules.util';

/**
 * รูปแบบ alert ของ guard (โครงสร้างเดียวกับ ValidationService.FinancialAlert
 * เพื่อให้ ValidationService นำไป push รวมได้โดยไม่ต้องแปลง)
 * นิยามไว้ที่นี่เพื่อไม่ให้ guard ต้อง import จาก ai module (กัน circular dependency)
 */
export interface GuardAlert {
  type: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  relatedId?: number | string;
  suggestedFix?: string;
  linkedRecords?: { table: string; id: number | string; label: string }[];
}

/**
 * CrossDomainGuardService
 *
 * เครื่องยนต์กฎ "ความขัดแย้งข้ามงาน" (นโยบาย/แผน → พัสดุ → การเงิน)
 * ใช้ 2 โหมดจากกฎ pure ชุดเดียวกัน (guard-rules.util.ts):
 *   - enforce (assert / check)  : บล็อกตอนบันทึก (gate ด้วย regulatory-config — ปิดได้)
 *   - inspect()               : สแกนย้อนหลังคืนเป็น alert ให้ AI/หน้าแจ้งเตือน
 */
@Injectable()
export class CrossDomainGuardService {
  private readonly logger = new Logger(CrossDomainGuardService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly regulatoryConfig: RegulatoryConfigService,
  ) {}

  /** true เมื่อเกณฑ์บล็อกถูกเปิด (ค่า = 1) — ให้โรงเรียนปิดได้ */
  private async blockEnabled(scId: number, key: string): Promise<boolean> {
    const v = await this.regulatoryConfig.getThreshold(scId, key);
    return Number(v) === 1;
  }

  // ───────────────────────────────────────────────────────────────────────
  // G1 — โครงการก่อหนี้จัดซื้อรวมเกินวงเงินโครงการ (hard-block, gate ได้)
  // เรียกก่อนบันทึก/อนุมัติคำสั่งซื้อในงานพัสดุ
  // ───────────────────────────────────────────────────────────────────────
  async assertProjectNotOvercommitted(opts: {
    scId: number;
    projectId?: number | null;
    newAmount: number;
    excludeOrderId?: number;
  }): Promise<void> {
    const { scId, projectId, newAmount, excludeOrderId } = opts;
    if (!projectId || projectId <= 0) return; // ไม่ผูกโครงการ → ไม่บังคับ
    if (!(await this.blockEnabled(scId, 'finance.block_project_overcommit')))
      return;

    const projRows: { proj_budget: number }[] = await this.dataSource.query(
      `SELECT proj_budget FROM pln_project WHERE proj_id = ? AND del = 0 LIMIT 1`,
      [projectId],
    );
    if (!projRows.length) return; // ไม่พบโครงการ → ปล่อยให้ validation อื่นจัดการ
    const projBudget = Number(projRows[0].proj_budget ?? 0);
    if (projBudget <= 0) return; // ไม่กำหนดงบ → ใช้กฎเตือน R2 แทน

    const params: (number | undefined)[] = [scId, projectId];
    let excludeSql = '';
    if (excludeOrderId) {
      excludeSql = ' AND order_id <> ?';
      params.push(excludeOrderId);
    }
    const sumRows: { committed: number }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(budgets),0) AS committed
       FROM parcel_order
       WHERE sc_id = ? AND project_id = ? AND del = 0 AND order_status <> 9${excludeSql}`,
      params,
    );
    const committedTotal = Number(sumRows[0]?.committed ?? 0);

    const result = checkProjectOvercommit({
      projBudget,
      committedTotal,
      newAmount: Number(newAmount ?? 0),
    });
    if (!result.ok) throw new BadRequestException(result.message);
  }

  // ───────────────────────────────────────────────────────────────────────
  // G2 — มูลค่าสัญญาเกินวงเงินคำสั่งซื้อ (hard-block, gate ได้)
  // เรียกก่อนบันทึกสัญญาในงานพัสดุ
  // ───────────────────────────────────────────────────────────────────────
  async assertContractWithinOrder(opts: {
    scId: number;
    orderId?: number | null;
    contractTotal: number;
  }): Promise<void> {
    const { scId, orderId, contractTotal } = opts;
    if (!orderId || orderId <= 0) return;
    if (
      !(await this.blockEnabled(scId, 'procurement.block_contract_over_order'))
    )
      return;

    const rows: { budgets: number }[] = await this.dataSource.query(
      `SELECT budgets FROM parcel_order WHERE order_id = ? AND del = 0 LIMIT 1`,
      [orderId],
    );
    if (!rows.length) return;
    const orderBudget = Number(rows[0].budgets ?? 0);

    const result = checkContractOverOrder({
      orderBudget,
      contractTotal: Number(contractTotal ?? 0),
    });
    if (!result.ok) throw new BadRequestException(result.message);
  }

  // ───────────────────────────────────────────────────────────────────────
  // G3 — ตั้งเบิกก่อนตรวจรับพัสดุครบ (hard-block, gate ได้)
  // คืนข้อความ error ถ้าติดกฎ (เข้ากับ contract ของ invoice.validatePayableLimit),
  // คืน null ถ้าผ่าน/ไม่บังคับ
  // ───────────────────────────────────────────────────────────────────────
  async checkPayBeforeInspection(opts: {
    scId: number;
    orderId?: number | null;
  }): Promise<string | null> {
    const { scId, orderId } = opts;
    // ไม่ผูกคำสั่งซื้อ (ค่าเดินทาง/เงินยืม) → ไม่ต้องตรวจรับ
    if (!orderId || orderId <= 0) return null;
    if (!(await this.blockEnabled(scId, 'finance.block_pay_before_inspection')))
      return null;

    const rows: { insp_result: number; stock_posted: number }[] =
      await this.dataSource.query(
        `SELECT insp_result, stock_posted
         FROM sup_inspection
         WHERE order_id = ? AND del = 0
         ORDER BY insp_id DESC LIMIT 1`,
        [orderId],
      );
    const insp = rows[0];
    const result = checkPayBeforeInspection({
      requiresInspection: true,
      inspectionPassed: !!insp && Number(insp.insp_result) === 1,
      stockPosted: !!insp && Number(insp.stock_posted) === 1,
    });
    return result.ok ? null : result.message;
  }

  // ───────────────────────────────────────────────────────────────────────
  // inspect() — สแกนย้อนหลัง คืน alert (ใช้โดย ValidationService / หน้าแจ้งเตือน)
  // ครอบกฎเชิงโครงสร้างข้ามงาน: G1 (โครงการเกินงบ), G2 (สัญญาเกินคำสั่งซื้อ),
  // G4 (ปีงบไม่ตรงในชุดเอกสารเดียว)
  // ───────────────────────────────────────────────────────────────────────
  async inspect(scId: number, budgetYear: string): Promise<GuardAlert[]> {
    const yearBE = Number(budgetYear); // parcel_order.acad_year เก็บปีงบ พ.ศ.
    const results = await Promise.allSettled([
      this.scanProjectOvercommit(scId, yearBE),
      this.scanContractOverOrder(scId, yearBE),
      this.scanYearMismatch(scId, yearBE),
    ]);
    const alerts: GuardAlert[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') alerts.push(...r.value);
      else this.logger.warn('cross-domain inspect ล้มเหลว:', r.reason);
    }
    return alerts;
  }

  /** G1 ย้อนหลัง: โครงการที่ผลรวมคำสั่งซื้อ > งบโครงการ */
  private async scanProjectOvercommit(
    scId: number,
    yearBE: number,
  ): Promise<GuardAlert[]> {
    const rows: {
      proj_id: number;
      proj_name: string;
      proj_budget: number;
      committed: number;
    }[] = await this.dataSource.query(
      `SELECT p.proj_id, p.proj_name, p.proj_budget, o.committed
       FROM (
         SELECT project_id, SUM(budgets) AS committed
         FROM parcel_order
         WHERE sc_id = ? AND del = 0 AND order_status <> 9
           AND acad_year = ? AND project_id > 0
         GROUP BY project_id
       ) o
       JOIN pln_project p ON p.proj_id = o.project_id AND p.del = 0
       WHERE p.proj_budget > 0 AND o.committed > p.proj_budget + ?`,
      [scId, yearBE, GUARD_EPS],
    );
    return rows.map((r) => ({
      type: 'project_overcommit',
      severity: 'error' as const,
      title: `โครงการก่อหนี้เกินงบ: ${r.proj_name}`,
      detail: `ผลรวมคำสั่งซื้อ ${Number(r.committed).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท เกินงบโครงการ ${Number(r.proj_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      relatedId: r.proj_id,
      suggestedFix:
        'ทบทวนรายการจัดซื้อของโครงการ หรือปรับวงเงินโครงการให้สอดคล้อง',
      linkedRecords: [
        { table: 'pln_project', id: r.proj_id, label: r.proj_name },
      ],
    }));
  }

  /** G2 ย้อนหลัง: สัญญาที่มูลค่า > วงเงินคำสั่งซื้อ */
  private async scanContractOverOrder(
    scId: number,
    yearBE: number,
  ): Promise<GuardAlert[]> {
    const rows: {
      ct_id: number;
      order_id: number;
      ct_total: number;
      order_budget: number;
    }[] = await this.dataSource.query(
      `SELECT c.ct_id, c.order_id, c.ct_total, o.budgets AS order_budget
       FROM sup_contract c
       JOIN parcel_order o ON o.order_id = c.order_id AND o.del = 0
       WHERE o.sc_id = ? AND o.acad_year = ? AND c.del = 0
         AND o.budgets > 0 AND c.ct_total > o.budgets + ?`,
      [scId, yearBE, GUARD_EPS],
    );
    return rows.map((r) => ({
      type: 'contract_over_order',
      severity: 'error' as const,
      title: `สัญญาเกินวงเงินคำสั่งซื้อ (สัญญา #${r.ct_id})`,
      detail: `มูลค่าสัญญา ${Number(r.ct_total).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท เกินวงเงินคำสั่งซื้อ ${Number(r.order_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      relatedId: r.ct_id,
      suggestedFix: 'แก้ไขมูลค่าสัญญา หรือปรับวงเงินคำสั่งซื้อให้ถูกต้อง',
      linkedRecords: [
        { table: 'sup_contract', id: r.ct_id, label: `สัญญา #${r.ct_id}` },
        {
          table: 'parcel_order',
          id: r.order_id,
          label: `คำสั่งซื้อ #${r.order_id}`,
        },
      ],
    }));
  }

  /** G4 ย้อนหลัง: ปีงบของใบเบิกไม่ตรงกับปีงบของคำสั่งซื้อในสายเดียวกัน */
  private async scanYearMismatch(
    scId: number,
    yearBE: number,
  ): Promise<GuardAlert[]> {
    const rows: {
      rw_id: number;
      order_id: number;
      rw_year: string | null;
      order_year: number | null;
    }[] = await this.dataSource.query(
      `SELECT rw.rw_id, rw.order_id, rw.year AS rw_year, o.acad_year AS order_year
       FROM request_withdraw rw
       JOIN parcel_order o ON o.order_id = rw.order_id AND o.del = 0
       WHERE rw.sc_id = ? AND rw.del = 0 AND rw.order_id > 0
         AND o.acad_year = ? AND rw.year IS NOT NULL`,
      [scId, yearBE],
    );
    const alerts: GuardAlert[] = [];
    for (const r of rows) {
      const result = checkYearMismatch({
        years: [
          { label: 'คำสั่งซื้อ', year: r.order_year },
          { label: 'ใบเบิก', year: r.rw_year },
        ],
      });
      if (!result.ok) {
        alerts.push({
          type: 'year_mismatch',
          severity: 'warning',
          title: `ปีงบประมาณไม่ตรงกัน (ใบเบิก #${r.rw_id})`,
          detail: result.message,
          relatedId: r.rw_id,
          suggestedFix: 'แก้ไขปีงบประมาณในใบเบิก/คำสั่งซื้อให้ตรงกัน',
          linkedRecords: [
            {
              table: 'request_withdraw',
              id: r.rw_id,
              label: `ใบเบิก #${r.rw_id}`,
            },
            {
              table: 'parcel_order',
              id: r.order_id,
              label: `คำสั่งซื้อ #${r.order_id}`,
            },
          ],
        });
      }
    }
    return alerts;
  }

  // ───────────────────────────────────────────────────────────────────────
  // preview() — เวอร์ชันไม่ throw สำหรับ "เตือนสด" ที่จุดกรอกข้อมูล (inline)
  // แสดงคำเตือนเสมอแม้ปิด hard-block ไว้ (advisory) — rule-based ล้วน ไม่เรียก LLM
  // ───────────────────────────────────────────────────────────────────────
  async previewParcelOrder(opts: {
    scId: number;
    projectId?: number | null;
    newAmount: number;
    excludeOrderId?: number;
  }): Promise<GuardAlert[]> {
    const { scId, projectId, newAmount, excludeOrderId } = opts;
    if (!projectId || projectId <= 0) return [];

    const projRows: { proj_budget: number; proj_name: string }[] =
      await this.dataSource.query(
        `SELECT proj_budget, proj_name FROM pln_project WHERE proj_id = ? AND del = 0 LIMIT 1`,
        [projectId],
      );
    if (!projRows.length) return [];
    const projBudget = Number(projRows[0].proj_budget ?? 0);

    const params: (number | undefined)[] = [scId, projectId];
    let excludeSql = '';
    if (excludeOrderId) {
      excludeSql = ' AND order_id <> ?';
      params.push(excludeOrderId);
    }
    const sumRows: { committed: number }[] = await this.dataSource.query(
      `SELECT COALESCE(SUM(budgets),0) AS committed
       FROM parcel_order
       WHERE sc_id = ? AND project_id = ? AND del = 0 AND order_status <> 9${excludeSql}`,
      params,
    );
    const result = checkProjectOvercommit({
      projBudget,
      committedTotal: Number(sumRows[0]?.committed ?? 0),
      newAmount: Number(newAmount ?? 0),
    });
    if (result.ok) return [];
    return [
      {
        type: result.code,
        severity: result.severity,
        title: `โครงการก่อหนี้เกินงบ: ${projRows[0].proj_name}`,
        detail: result.message,
        relatedId: projectId,
      },
    ];
  }

  async previewInvoice(opts: {
    scId: number;
    orderId?: number | null;
  }): Promise<GuardAlert[]> {
    const msg = await this.checkPayBeforeInspection(opts);
    if (!msg) return [];
    return [
      {
        type: 'pay_before_inspection',
        severity: 'error',
        title: 'ยังตั้งเบิกไม่ได้',
        detail: msg,
        relatedId: opts.orderId ?? undefined,
      },
    ];
  }

  /** export helper ให้ ValidationService ใช้ normalize ปีงบเหมือนกัน */
  normalizeYear = normalizeBudgetYear;
}
