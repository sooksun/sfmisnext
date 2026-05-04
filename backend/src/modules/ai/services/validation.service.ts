import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface FinancialAlert {
  type: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  relatedId?: number | string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * รวม alert ทุกประเภทสำหรับโรงเรียน/ปีงบประมาณนั้น
   */
  async getAlerts(scId: number, budgetYear: string): Promise<FinancialAlert[]> {
    const results = await Promise.allSettled([
      this.checkOverdueLoans(scId, budgetYear),
      this.checkBudgetOverspend(scId, budgetYear),
      this.checkBankReconciliationMismatch(scId, budgetYear),
      this.checkDuplicateInvoices(scId, budgetYear),
      this.checkStaleChecks(scId, budgetYear),
    ]);

    const alerts: FinancialAlert[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        alerts.push(...result.value);
      } else {
        this.logger.warn('validation check ล้มเหลว:', result.reason);
      }
    }

    // ถ้ามี alert หลายข้อ ให้ AI วิเคราะห์รูปแบบเพิ่มเติม
    if (alerts.length > 0) {
      try {
        const aiAlerts = await this.analyzeAlertsWithAi(
          alerts,
          scId,
          budgetYear,
        );
        alerts.push(...aiAlerts);
      } catch (err) {
        this.logger.warn(
          'AI validation ล้มเหลว — ใช้ rule-based อย่างเดียว',
          err,
        );
      }
    }

    // เรียงตาม severity: error > warning > info
    const order: Record<AlertSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };
    return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  // ─────────────────────────────────────────────
  // Rule-based Checks
  // ─────────────────────────────────────────────

  /**
   * ตรวจสอบการยืมเงินเกินกำหนด
   */
  private async checkOverdueLoans(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    const rows: {
      la_no: string;
      borrower_id: number;
      amount: number;
      borrow_date: string;
      loan_category: number;
      days_overdue: number;
    }[] = await this.dataSource.query(
      `SELECT
        la_no, borrower_id, amount, borrow_date, loan_category,
        DATEDIFF(NOW(), borrow_date) AS days_overdue
       FROM loan_agreement
       WHERE sc_id = ? AND budget_year = ? AND status = 1 AND del = 0
         AND (
           (loan_category = 1 AND DATEDIFF(NOW(), borrow_date) > 15) OR
           (loan_category != 1 AND DATEDIFF(NOW(), borrow_date) > 30)
         )
       ORDER BY borrow_date ASC`,
      [scId, budgetYear],
    );

    return rows.map((r) => ({
      type: 'overdue_loan',
      severity: r.days_overdue > 60 ? 'error' : 'warning',
      title: `การยืมเงินเกินกำหนด: ${r.la_no}`,
      detail: `เกินกำหนดคืนมาแล้ว ${r.days_overdue} วัน (ยอด ${Number(r.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
      relatedId: r.la_no,
    }));
  }

  /**
   * ตรวจสอบงบประมาณเกินวงเงิน
   */
  private async checkBudgetOverspend(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    const ceYear =
      Number(budgetYear) >= 2400
        ? Number(budgetYear) - 543
        : Number(budgetYear);
    const rows: {
      bg_type_id: number;
      bg_type_name: string;
      real_budget: number;
      total_spent: number;
      overspend: number;
    }[] = await this.dataSource.query(
      `SELECT
        mit.bg_type_id               AS bg_type_id,
        mit.budget_type             AS bg_type_name,
        COALESCE(ea.real_budget, 0)      AS real_budget,
        COALESCE(ft.total_spent, 0)      AS total_spent,
        COALESCE(ft.total_spent, 0) - COALESCE(ea.real_budget, 0) AS overspend
       FROM master_budget_income_type mit
       LEFT JOIN tb_estimate_acadyear ea
         ON ea.sc_id = ? AND (ea.budget_year = ? OR ea.budget_year = ?) AND ea.del = 0
       LEFT JOIN (
         SELECT bg_type_id, SUM(amount) AS total_spent
         FROM financial_transactions
         WHERE sc_id = ? AND YEAR(create_date) = ? AND type = -1 AND del = 0
         GROUP BY bg_type_id
       ) ft ON ft.bg_type_id = mit.bg_type_id
       WHERE mit.del = 0
         AND COALESCE(ft.total_spent, 0) > COALESCE(ea.real_budget, 0)
         AND COALESCE(ea.real_budget, 0) > 0`,
      [scId, budgetYear, String(ceYear), scId, ceYear],
    );

    return rows.map((r) => ({
      type: 'budget_overspend',
      severity: 'error' as AlertSeverity,
      title: `งบประมาณเกินวงเงิน: ${r.bg_type_name}`,
      detail: `ใช้จ่าย ${Number(r.total_spent).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท เกินงบ ${Number(r.real_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (เกิน ${Number(r.overspend).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
      relatedId: r.bg_type_id,
    }));
  }

  /**
   * ตรวจสอบการกระทบยอดบัญชีไม่สมดุล
   */
  private async checkBankReconciliationMismatch(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    // ตรวจสอบ schema จริงของ bank_reconciliation
    const rows: {
      id: number;
      reconcile_date: string;
      book_balance: number;
      bank_statement_balance: number;
      difference: number;
    }[] = await this.dataSource
      .query(
        `SELECT br_id AS id, created_at AS reconcile_date,
              book_balance, bank_balance AS bank_statement_balance,
              (bank_balance - book_balance) AS difference
       FROM bank_reconciliation
       WHERE sc_id = ? AND del = 0
         AND ABS(bank_balance - book_balance) > 0.01
       ORDER BY created_at DESC
       LIMIT 5`,
        [scId],
      )
      .catch(() => []);

    return rows.map((r) => ({
      type: 'bank_reconciliation_mismatch',
      severity: Math.abs(Number(r.difference)) > 1000 ? 'error' : 'warning',
      title: `กระทบยอดไม่สมดุล: ${r.reconcile_date}`,
      detail: `ยอดตามบัญชี ${Number(r.book_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ยอดตาม statement ${Number(r.bank_statement_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ต่างกัน ${Number(r.difference).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
      relatedId: r.id,
    }));
  }

  /**
   * ตรวจสอบใบสำคัญจ่ายซ้ำ (เลขที่/ผู้รับ/จำนวน/วันที่ใกล้กัน)
   */
  private async checkDuplicateInvoices(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    const rows: {
      p_id: number;
      amount: number;
      rw_type: number;
      invoice_count: number;
      first_id: number;
    }[] = await this.dataSource.query(
      `SELECT p_id, amount, rw_type, COUNT(*) AS invoice_count, MIN(rw_id) AS first_id
       FROM request_withdraw
       WHERE sc_id = ? AND del = 0
         AND status IN (0, 1)
       GROUP BY p_id, amount, rw_type
       HAVING COUNT(*) > 1`,
      [scId],
    );

    return rows.map((r) => ({
      type: 'duplicate_invoice',
      severity: 'warning' as AlertSeverity,
      title: `พบใบสำคัญจ่ายซ้ำ`,
      detail: `ผู้รับรหัส ${r.p_id} ยอด ${Number(r.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ประเภท ${r.rw_type} พบ ${r.invoice_count} รายการที่อาจซ้ำกัน`,
      relatedId: r.first_id,
    }));
  }

  /**
   * ตรวจสอบเช็คค้างนาน (ออกแล้ว > 90 วัน ยังไม่เคลียร์)
   */
  private async checkStaleChecks(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    // ใช้ bank_ledger_entry แทน tb_check (ไม่มี tb_check ใน schema)
    const rows: {
      id: number;
      check_no: string;
      check_date: string;
      amount: number;
      days_pending: number;
    }[] = await this.dataSource
      .query(
        `SELECT ble_id AS id, ref_no AS check_no, entry_date AS check_date, amount,
              DATEDIFF(NOW(), entry_date) AS days_pending
       FROM bank_ledger_entry
       WHERE sc_id = ? AND del = 0 AND entry_type = 'check'
         AND DATEDIFF(NOW(), entry_date) > 90
       ORDER BY entry_date ASC
       LIMIT 10`,
        [scId],
      )
      .catch(() => []);

    return rows.map((r) => ({
      type: 'stale_check',
      severity: r.days_pending > 180 ? 'error' : 'warning',
      title: `เช็คค้างนาน: ${r.check_no}`,
      detail: `เช็คลงวันที่ ${r.check_date} ยอด ${Number(r.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ค้างมาแล้ว ${r.days_pending} วัน`,
      relatedId: r.id,
    }));
  }

  // ─────────────────────────────────────────────
  // AI-enhanced Analysis
  // ─────────────────────────────────────────────

  /**
   * ให้ AI วิเคราะห์ alert ที่พบและอาจค้นพบรูปแบบผิดปกติเพิ่มเติม
   */
  private async analyzeAlertsWithAi(
    alerts: FinancialAlert[],
    scId: number,
    budgetYear: string,
  ): Promise<FinancialAlert[]> {
    const alertSummary = alerts
      .map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.detail}`)
      .join('\n');

    const systemPrompt = `คุณคือผู้ตรวจสอบระบบการเงินโรงเรียน
ปีงบประมาณ: ${budgetYear}
วิเคราะห์รายการ alert ที่ตรวจพบและระบุรูปแบบความเสี่ยงเพิ่มเติม
ถ้าพบรูปแบบน่าสงสัย ให้ตอบในรูปแบบ JSON array เท่านั้น (ไม่มีข้อความอื่น):
[{"type":"pattern_name","severity":"warning|error|info","title":"หัวข้อ","detail":"รายละเอียด"}]
ถ้าไม่พบรูปแบบเพิ่มเติม ให้ตอบ: []`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `รายการ alert ที่ตรวจพบอัตโนมัติ:\n${alertSummary}\n\nวิเคราะห์และแจ้ง alert เพิ่มเติม (ถ้ามี)`,
      },
    ];

    const response = await this.aiRouter.chat(
      'validate',
      messages,
      systemPrompt,
    );

    try {
      // ดึง JSON array จาก response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      const parsed: {
        type: string;
        severity: AlertSeverity;
        title: string;
        detail: string;
      }[] = JSON.parse(jsonMatch[0]);
      return parsed.map((p) => ({
        type: p.type ?? 'ai_pattern',
        severity: ['info', 'warning', 'error'].includes(p.severity)
          ? p.severity
          : 'info',
        title: p.title ?? 'รูปแบบน่าสังเกต',
        detail: p.detail ?? '',
      }));
    } catch {
      this.logger.warn('parse AI alert JSON ล้มเหลว');
      return [];
    }
  }
}
