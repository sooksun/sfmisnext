import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';
import { ChatRequestDto } from '../dto/chat.dto';

/** สรุปข้อมูลการเงิน */
interface FinancialSummary {
  total_receive: number;
  total_pay: number;
  balance: number;
  pending_invoices: number;
  pending_invoice_amount: number;
}

/** สรุปงบประมาณ */
interface BudgetSummary {
  total_budget: number;
  total_real_budget: number;
  total_spent: number;
  remaining: number;
  utilization_pct: number;
  categories: { name: string; budget: number; spent: number }[];
}

/** สรุปการยืมเงิน */
interface LoanSummary {
  total_loans: number;
  pending_count: number;
  pending_amount: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface ChatContext {
  scId: number;
  scName?: string;
  budgetYear: string;
  contextPage?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ตอบคำถามแบบ one-shot
   */
  async chat(
    dto: ChatRequestDto,
    ctx: ChatContext,
  ): Promise<{ content: string; provider: string; model: string }> {
    const systemPrompt = await this.buildSystemPrompt(ctx);
    const messages = this.buildMessages(dto);

    const response = await this.aiRouter.chat('chat', messages, systemPrompt);
    return {
      content: response.content,
      provider: response.provider,
      model: response.model,
    };
  }

  /**
   * ตอบคำถามแบบ streaming — yield ทีละ chunk
   */
  async *streamChat(
    dto: ChatRequestDto,
    ctx: ChatContext,
  ): AsyncGenerator<string> {
    const systemPrompt = await this.buildSystemPrompt(ctx);
    const messages = this.buildMessages(dto);

    yield* this.aiRouter.chatStream('chat', messages, systemPrompt);
  }

  // ─────────────────────────────────────────────
  // Helper: สร้าง messages จาก DTO
  // ─────────────────────────────────────────────

  private buildMessages(dto: ChatRequestDto): ChatMessage[] {
    const history: ChatMessage[] = (dto.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    }));
    history.push({ role: 'user', content: dto.message });
    return history;
  }

  // ─────────────────────────────────────────────
  // Helper: สร้าง system prompt พร้อม context
  // ─────────────────────────────────────────────

  private async buildSystemPrompt(ctx: ChatContext): Promise<string> {
    const parts: string[] = [];

    parts.push(`คุณคือผู้ช่วย AI ระบบบริหารการเงินโรงเรียน (SFMIS)`);
    parts.push(`โรงเรียน: ${ctx.scName ?? `รหัส ${ctx.scId}`}`);
    const ceYear =
      ctx.budgetYear && Number(ctx.budgetYear) >= 2400
        ? Number(ctx.budgetYear) - 543
        : Number(ctx.budgetYear) || new Date().getFullYear();
    const beYear = ceYear + 543;
    parts.push(`ปีงบประมาณ: ${beYear} (CE: ${ceYear})`);
    parts.push(
      `วันที่ปัจจุบัน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    );
    parts.push('');
    parts.push(
      'หน้าที่ของคุณ: ตอบคำถามเกี่ยวกับการเงิน งบประมาณ ใบสำคัญจ่าย เช็ค การยืมเงิน และรายงานต่างๆ ของโรงเรียน',
    );
    parts.push('ตอบเป็นภาษาไทย กระชับ ชัดเจน และเป็นมืออาชีพ');
    parts.push('ตัวเลขเงินให้แสดงเป็นบาท เช่น 12,345.67 บาท');
    parts.push(
      '⚠️ สำคัญมาก: ห้ามใช้ placeholder เช่น (จำนวนเงิน) หรือ (ข้อมูล) เด็ดขาด — ถ้าไม่มีข้อมูลให้บอกตรงๆ ว่า "ไม่มีข้อมูลส่วนนี้ในระบบ"',
    );
    parts.push(
      'ใช้เฉพาะตัวเลขที่ระบุใน context ด้านล่างเท่านั้น อย่าสร้างตัวเลขขึ้นมาเอง',
    );
    parts.push('');

    // เพิ่มข้อมูลตามหน้าที่อยู่
    try {
      if (
        !ctx.contextPage ||
        ctx.contextPage === 'dashboard' ||
        ctx.contextPage === 'finance'
      ) {
        const fin = await this.getFinancialSummary(ctx.scId, ctx.budgetYear);
        parts.push('=== สรุปข้อมูลการเงินรวม ===');
        parts.push(`รายรับรวมทั้งหมด: ${this.fmt(fin.total_receive)} บาท`);
        parts.push(`รายจ่ายรวมทั้งหมด: ${this.fmt(fin.total_pay)} บาท`);
        parts.push(`ยอดคงเหลือ: ${this.fmt(fin.balance)} บาท`);
        parts.push(
          `ใบสำคัญจ่ายค้างอนุมัติ: ${fin.pending_invoices} รายการ (${this.fmt(fin.pending_invoice_amount)} บาท)`,
        );
        parts.push('');

        // เพิ่ม breakdown ตามประเภทเงิน
        const breakdown = await this.getBreakdownByMoneyType(ctx.scId);
        if (breakdown.length > 0) {
          parts.push('=== รายรับ-รายจ่าย แยกตามประเภทเงิน ===');
          for (const b of breakdown) {
            parts.push(
              `${b.name}: รายรับ ${this.fmt(b.receive)} บาท | รายจ่าย ${this.fmt(b.pay)} บาท | สุทธิ ${this.fmt(b.receive - b.pay)} บาท`,
            );
          }
          parts.push('');
        }
      }

      if (ctx.contextPage === 'budget') {
        const bud = await this.getBudgetSummary(ctx.scId, ctx.budgetYear);
        parts.push('=== สรุปงบประมาณ ===');
        parts.push(`งบประมาณทั้งหมด: ${this.fmt(bud.total_budget)} บาท`);
        parts.push(`งบประมาณจริง: ${this.fmt(bud.total_real_budget)} บาท`);
        parts.push(`ใช้จ่ายแล้ว: ${this.fmt(bud.total_spent)} บาท`);
        parts.push(`คงเหลือ: ${this.fmt(bud.remaining)} บาท`);
        parts.push(`อัตราใช้งาน: ${bud.utilization_pct.toFixed(1)}%`);
        if (bud.categories.length > 0) {
          parts.push('รายละเอียดตามหมวด:');
          for (const cat of bud.categories.slice(0, 5)) {
            parts.push(
              `  - ${cat.name}: ${this.fmt(cat.budget)} บาท (ใช้ ${this.fmt(cat.spent)} บาท)`,
            );
          }
        }
        parts.push('');
      }

      if (ctx.contextPage === 'loan') {
        const loan = await this.getLoanSummary(ctx.scId, ctx.budgetYear);
        parts.push('=== สรุปการยืมเงิน ===');
        parts.push(`ยืมเงินทั้งหมด: ${loan.total_loans} สัญญา`);
        parts.push(
          `รอส่งคืน: ${loan.pending_count} สัญญา (${this.fmt(loan.pending_amount)} บาท)`,
        );
        parts.push(
          `เกินกำหนด: ${loan.overdue_count} สัญญา (${this.fmt(loan.overdue_amount)} บาท)`,
        );
        parts.push('');
      }
    } catch (err) {
      this.logger.warn(
        'ดึงข้อมูล context ไม่สำเร็จ — ดำเนินการต่อโดยไม่มี context',
        err,
      );
    }

    return parts.join('\n');
  }

  // ─────────────────────────────────────────────
  // Helper Methods: ดึงข้อมูลจาก DB
  // ─────────────────────────────────────────────

  /**
   * สรุปข้อมูลการเงิน (รายรับ/รายจ่าย/ค้างจ่าย)
   * หมายเหตุ: financial_transactions ไม่มี budget_year — กรองด้วย sc_id + ปีงบฯ จาก create_date
   *           request_withdraw ใช้ column `year` (varchar) แทน budget_year
   */
  async getFinancialSummary(
    scId: number,
    budgetYear: string,
  ): Promise<FinancialSummary> {
    // หา CE year จาก budgetYear (อาจเป็น BE หรือ CE)
    const ceYear = this.toCeYear(budgetYear);

    // financial_transactions ไม่มี budget_year → ใช้ YEAR(create_date)
    const [txRow] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0)  AS total_receive,
        COALESCE(SUM(CASE WHEN type = -1 THEN amount ELSE 0 END), 0) AS total_pay
       FROM financial_transactions
       WHERE sc_id = ? AND YEAR(create_date) = ? AND del = 0`,
      [scId, ceYear],
    );

    // ถ้าปีปัจจุบันไม่มีข้อมูล ลองปีก่อนหน้า (ข้อมูล demo อาจอยู่ปีก่อน)
    let txFinal = txRow;
    if (
      Number(txRow?.total_receive ?? 0) === 0 &&
      Number(txRow?.total_pay ?? 0) === 0
    ) {
      const [txPrev] = await this.dataSource.query(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0)  AS total_receive,
          COALESCE(SUM(CASE WHEN type = -1 THEN amount ELSE 0 END), 0) AS total_pay
         FROM financial_transactions
         WHERE sc_id = ? AND del = 0`,
        [scId],
      );
      txFinal = txPrev;
    }

    // request_withdraw ใช้ column `year` (varchar) — ลองทั้งปีนี้และ CE year
    const [invRow] = await this.dataSource.query(
      `SELECT
        COUNT(*)                          AS pending_invoices,
        COALESCE(SUM(amount), 0)          AS pending_invoice_amount
       FROM request_withdraw
       WHERE sc_id = ? AND (year = ? OR year = ?) AND status = 0 AND del = 0`,
      [scId, budgetYear, String(ceYear)],
    );

    const totalReceive = Number(txFinal?.total_receive ?? 0);
    const totalPay = Number(txFinal?.total_pay ?? 0);

    return {
      total_receive: totalReceive,
      total_pay: totalPay,
      balance: totalReceive - totalPay,
      pending_invoices: Number(invRow?.pending_invoices ?? 0),
      pending_invoice_amount: Number(invRow?.pending_invoice_amount ?? 0),
    };
  }

  /**
   * สรุปงบประมาณตามหมวด
   * tb_estimate_acadyear มี budget_year (CE year string เช่น '2026')
   * master_budget_income_type ใช้แทน pln_budget_category
   */
  async getBudgetSummary(
    scId: number,
    budgetYear: string,
  ): Promise<BudgetSummary> {
    const ceYear = this.toCeYear(budgetYear);

    // ลอง budget_year ทั้งแบบ BE และ CE
    const [totRow] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(ea_budget), 0)   AS total_budget,
        COALESCE(SUM(real_budget), 0) AS total_real_budget
       FROM tb_estimate_acadyear
       WHERE sc_id = ? AND (budget_year = ? OR budget_year = ?) AND del = 0`,
      [scId, budgetYear, String(ceYear)],
    );

    // financial_transactions ไม่มี budget_year — ใช้ sc_id + YEAR(create_date)
    const [spentRow] = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM financial_transactions
       WHERE sc_id = ? AND YEAR(create_date) = ? AND type = -1 AND del = 0`,
      [scId, ceYear],
    );

    // ถ้าไม่มีข้อมูลปีนี้ ดึงทั้งหมด
    let totalSpentVal = Number(spentRow?.total_spent ?? 0);
    if (totalSpentVal === 0) {
      const [spentAll] = await this.dataSource.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_spent
         FROM financial_transactions
         WHERE sc_id = ? AND type = -1 AND del = 0`,
        [scId],
      );
      totalSpentVal = Number(spentAll?.total_spent ?? 0);
    }

    // หมวดงบประมาณจาก master_budget_income_type หรือ tb_estimate_acadyear
    const categories: {
      name: string;
      budget: number;
      spent: number;
      real_budget: number;
    }[] = await this.dataSource.query(
      `SELECT
        mit.income_type_name              AS name,
        COALESCE(SUM(ea.ea_budget), 0)    AS budget,
        COALESCE(SUM(ea.real_budget), 0)  AS real_budget
       FROM master_budget_income_type mit
       LEFT JOIN budget_income_type_school bits
         ON bits.income_type_id = mit.income_type_id AND bits.sc_id = ? AND bits.del = 0
       LEFT JOIN tb_estimate_acadyear ea
         ON ea.sc_id = ? AND (ea.budget_year = ? OR ea.budget_year = ?) AND ea.del = 0
       WHERE mit.del = 0
       GROUP BY mit.income_type_id, mit.income_type_name
       ORDER BY budget DESC
       LIMIT 8`,
      [scId, scId, budgetYear, String(ceYear)],
    );

    const totalBudget = Number(totRow?.total_budget ?? 0);
    const totalReal = Number(totRow?.total_real_budget ?? 0);
    const remaining = totalReal - totalSpentVal;
    const utilizationPct =
      totalReal > 0 ? (totalSpentVal / totalReal) * 100 : 0;

    return {
      total_budget: totalBudget,
      total_real_budget: totalReal,
      total_spent: totalSpentVal,
      remaining,
      utilization_pct: utilizationPct,
      categories: categories
        .filter((c) => Number(c.budget) > 0)
        .map((c) => ({
          name: c.name ?? 'ไม่ระบุ',
          budget: Number(c.budget),
          spent: Number(c.real_budget),
        })),
    };
  }

  /**
   * สรุปการยืมเงิน — loan_agreement มี budget_year (CE year string)
   */
  async getLoanSummary(scId: number, budgetYear: string): Promise<LoanSummary> {
    const ceYear = this.toCeYear(budgetYear);

    const [row] = await this.dataSource.query(
      `SELECT
        COUNT(*)                                                                    AS total_loans,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END)                                AS pending_count,
        COALESCE(SUM(CASE WHEN status = 1 THEN amount ELSE 0 END), 0)              AS pending_amount,
        SUM(CASE WHEN status = 1 AND (
          (loan_category = 1 AND DATEDIFF(NOW(), borrow_date) > 15) OR
          (loan_category != 1 AND DATEDIFF(NOW(), borrow_date) > 30)
        ) THEN 1 ELSE 0 END)                                                       AS overdue_count,
        COALESCE(SUM(CASE WHEN status = 1 AND (
          (loan_category = 1 AND DATEDIFF(NOW(), borrow_date) > 15) OR
          (loan_category != 1 AND DATEDIFF(NOW(), borrow_date) > 30)
        ) THEN amount ELSE 0 END), 0)                                              AS overdue_amount
       FROM loan_agreement
       WHERE sc_id = ? AND (budget_year = ? OR budget_year = ?) AND del = 0`,
      [scId, budgetYear, String(ceYear)],
    );

    return {
      total_loans: Number(row?.total_loans ?? 0),
      pending_count: Number(row?.pending_count ?? 0),
      pending_amount: Number(row?.pending_amount ?? 0),
      overdue_count: Number(row?.overdue_count ?? 0),
      overdue_amount: Number(row?.overdue_amount ?? 0),
    };
  }

  /**
   * รายรับ-รายจ่ายแยกตามประเภทเงิน (master_budget_income_type)
   */
  async getBreakdownByMoneyType(
    scId: number,
  ): Promise<{ name: string; receive: number; pay: number }[]> {
    const rows: { name: string; receive: number; pay: number }[] =
      await this.dataSource.query(
        `SELECT
        COALESCE(m.budget_type, CONCAT('ประเภท ', ft.bg_type_id)) AS name,
        COALESCE(SUM(CASE WHEN ft.type = 1 THEN ft.amount ELSE 0 END), 0)  AS receive,
        COALESCE(SUM(CASE WHEN ft.type = -1 THEN ft.amount ELSE 0 END), 0) AS pay
       FROM financial_transactions ft
       LEFT JOIN master_budget_income_type m ON m.bg_type_id = ft.bg_type_id AND m.del = 0
       WHERE ft.sc_id = ? AND ft.del = 0
       GROUP BY ft.bg_type_id, m.budget_type
       ORDER BY pay DESC`,
        [scId],
      );
    return rows.map((r) => ({
      name: r.name,
      receive: Number(r.receive),
      pay: Number(r.pay),
    }));
  }

  /** แปลง budget_year (BE หรือ CE) → CE year number */
  private toCeYear(budgetYear: string): number {
    const n = Number(budgetYear);
    if (!n) return new Date().getFullYear();
    return n >= 2400 ? n - 543 : n; // BE → CE
  }

  // ─────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────

  private fmt(n: number): string {
    return n.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
