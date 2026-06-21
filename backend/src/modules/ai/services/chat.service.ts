import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';
import { ChatRequestDto } from '../dto/chat.dto';
import { RegulatoryConfigService } from '../../regulatory-config/regulatory-config.service';
import {
  buildGlossaryPromptBlock,
  suggestTerms,
} from '../knowledge/sfmis-glossary';

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
    private readonly regulatoryConfig: RegulatoryConfigService,
  ) {}

  /**
   * ตอบคำถามแบบ one-shot
   */
  async chat(
    dto: ChatRequestDto,
    ctx: ChatContext,
  ): Promise<{ content: string; provider: string; model: string }> {
    const systemPrompt = await this.buildSystemPrompt(ctx, dto.message);
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
    const systemPrompt = await this.buildSystemPrompt(ctx, dto.message);
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

  private async buildSystemPrompt(
    ctx: ChatContext,
    userMessage?: string,
  ): Promise<string> {
    const parts: string[] = [];

    // ── 1) บทบาท ──────────────────────────────────────────────────────────
    parts.push(
      'คุณคือ "ผู้ช่วยการเงินอัจฉริยะ" ของระบบบริหารการเงินและพัสดุโรงเรียน (SFMIS) ' +
        'สำหรับสถานศึกษาสังกัด สพฐ. — เป็นผู้เชี่ยวชาญด้านการเงิน การบัญชี และพัสดุภาครัฐ',
    );
    parts.push(
      'คุณให้คำปรึกษาที่ถูกต้องตามระเบียบราชการ และตอบคำถามเกี่ยวกับข้อมูลจริงในระบบของโรงเรียนได้',
    );
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

    // ── 2) ฐานความรู้ระเบียบ ──────────────────────────────────────────────
    try {
      parts.push(await this.buildRegulatoryKnowledge(ctx.scId));
      parts.push('');
    } catch (err) {
      this.logger.warn('สร้างฐานความรู้ระเบียบไม่สำเร็จ', err);
    }

    // ── 2.5) อภิธานศัพท์ + การตีความคำใกล้เคียง ───────────────────────────
    parts.push(buildGlossaryPromptBlock());
    const termHints = userMessage ? suggestTerms(userMessage, { limit: 3 }) : [];
    if (termHints.length > 0) {
      parts.push(
        'หมายเหตุการตีความคำในคำถามนี้ (จากอภิธานศัพท์ — ผู้ใช้อาจพิมพ์ย่อ/สะกดผิด):',
      );
      for (const t of termHints) {
        parts.push(`• น่าจะหมายถึง "${t.canonical}" — ${t.meaning}`);
      }
      parts.push(
        'ให้ยืนยันคำที่เข้าใจไว้ต้นคำตอบ และถ้ามีหลายความหมายให้ถามผู้ใช้สั้น ๆ ก่อนตอบยาว',
      );
    }
    parts.push('');

    // ── 3) แนวทางการตอบ ───────────────────────────────────────────────────
    parts.push('แนวทางการตอบ:');
    parts.push('- ตอบเป็นภาษาไทย เป็นมืออาชีพ ละเอียดพอใช้งานได้จริง แต่ไม่เยิ่นเย้อ');
    parts.push(
      '- จัดรูปแบบคำตอบให้อ่านง่าย: เริ่มด้วยสรุป/ตัวเลขสำคัญ 1-2 บรรทัด แล้วค่อยลงรายละเอียดเป็น bullet หรือข้อ ๆ',
    );
    parts.push(
      '- สำหรับคำถามให้คำปรึกษา ใช้โครงสร้าง: (1) คำตอบ/ข้อสรุป (2) เหตุผล/การคำนวณ (3) ระเบียบ/เกณฑ์ที่อ้างอิง (4) ข้อควรระวัง/ความเสี่ยง (5) ขั้นตอนถัดไปที่แนะนำ — ข้ามข้อที่ไม่เกี่ยวได้',
    );
    parts.push(
      '- อ้างอิงระเบียบ/มาตรา/เกณฑ์ที่เกี่ยวข้องพร้อมตัวเลขจริงเสมอ (เช่น "หักภาษี ณ ที่จ่ายเมื่อจ่าย ≥ 1,000 บาท") ไม่พูดลอย ๆ',
    );
    parts.push('- ตัวเลขเงินแสดงเป็นบาท เช่น 12,345.67 บาท');
    parts.push(
      '- เมื่อถูกถามเรื่องข้อมูลในระบบ ให้ใช้เฉพาะตัวเลขใน "ข้อมูลจริงในระบบ" ด้านล่าง อย่าสร้างตัวเลขเอง',
    );
    parts.push(
      '- ⚠️ ห้ามใช้ placeholder เช่น (จำนวนเงิน)/(ข้อมูล) เด็ดขาด — ถ้าไม่มีข้อมูลให้บอกตรงๆ ว่า "ไม่มีข้อมูลส่วนนี้ในระบบ"',
    );
    parts.push(
      '- ถ้าพบความเสี่ยงผิดระเบียบ (เช่น เงินยืมเกินกำหนด, รายได้แผ่นดินค้างนำส่ง, เงินสดเกินวงเงิน) ให้เตือนและแนะนำวิธีแก้ที่ทำได้ทันที',
    );
    parts.push(
      '- เมื่อเหมาะสม ให้ชี้เมนู/หน้าจอที่ผู้ใช้ควรไปทำต่อ (เช่น "ไปที่ จ่ายเงิน → สร้างใบสำคัญจ่าย") เพื่อให้ลงมือได้เลย',
    );
    parts.push('');

    // ── 4) ข้อมูลจริงในระบบ (snapshot) ────────────────────────────────────
    parts.push('=== ข้อมูลจริงในระบบ (ใช้ตอบคำถามเกี่ยวกับข้อมูล) ===');
    try {
      // ── การเงินรวม (เสมอ) ──
      const fin = await this.getFinancialSummary(ctx.scId, ctx.budgetYear);
      parts.push('— ภาพรวมการเงิน —');
      parts.push(
        `รายรับรวม ${this.fmt(fin.total_receive)} | รายจ่ายรวม ${this.fmt(fin.total_pay)} | คงเหลือ ${this.fmt(fin.balance)} บาท`,
      );
      parts.push(
        `ใบสำคัญจ่ายค้างอนุมัติ: ${fin.pending_invoices} รายการ (${this.fmt(fin.pending_invoice_amount)} บาท)`,
      );

      const breakdown = await this.getBreakdownByMoneyType(ctx.scId);
      if (breakdown.length > 0) {
        parts.push('— รายรับ-รายจ่ายแยกตามประเภทเงิน —');
        for (const b of breakdown) {
          parts.push(
            `• ${b.name}: รับ ${this.fmt(b.receive)} | จ่าย ${this.fmt(b.pay)} | สุทธิ ${this.fmt(b.receive - b.pay)} บาท`,
          );
        }
      }

      // ── เงินยืม (เสมอ) ──
      const loan = await this.getLoanSummary(ctx.scId, ctx.budgetYear);
      parts.push('— เงินยืม (ลูกหนี้เงินยืม บย.) —');
      parts.push(
        `ทั้งหมด ${loan.total_loans} สัญญา | ค้างคืน ${loan.pending_count} (${this.fmt(loan.pending_amount)} บาท) | เกินกำหนด ${loan.overdue_count} (${this.fmt(loan.overdue_amount)} บาท)`,
      );

      // ── ส่วนอื่น ๆ ในระบบ (รายได้แผ่นดิน / ยืมข้ามประเภท / ใบเสร็จ / จัดซื้อ / ส่งรายเดือน) ──
      const extra = await this.getSystemSnapshotExtra(ctx.scId, ctx.budgetYear);
      if (extra) parts.push(extra);

      // ── งบประมาณ (รายละเอียดเมื่ออยู่หน้า budget) ──
      if (ctx.contextPage === 'budget') {
        const bud = await this.getBudgetSummary(ctx.scId, ctx.budgetYear);
        parts.push('— งบประมาณ —');
        parts.push(
          `งบทั้งหมด ${this.fmt(bud.total_budget)} | งบจริง ${this.fmt(bud.total_real_budget)} | ใช้ไป ${this.fmt(bud.total_spent)} | คงเหลือ ${this.fmt(bud.remaining)} (ใช้ ${bud.utilization_pct.toFixed(1)}%)`,
        );
        for (const cat of bud.categories.slice(0, 6)) {
          parts.push(
            `  - ${cat.name}: ${this.fmt(cat.budget)} บาท (ใช้ ${this.fmt(cat.spent)})`,
          );
        }
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

  /**
   * ฐานความรู้ระเบียบงานการเงิน-พัสดุ — ใช้เกณฑ์จริงจาก regulatory-config
   */
  private async buildRegulatoryKnowledge(scId: number): Promise<string> {
    const k = await this.regulatoryConfig.getThresholds(scId, [
      'procurement.specific_max',
      'procurement.inspector_single_max',
      'procurement.plan_publish_min',
      'procurement.contract_security_pct',
      'finance.wht_min',
      'finance.wht_rate_goods',
      'finance.wht_rate_service',
      'finance.wht_rate_rent',
      'finance.gov_revenue_urgent',
      'finance.gov_revenue_urgent_days',
      'finance.monthly_submit_day',
      'finance.cash_reserve_default',
    ]);
    const f = (n: number) => Number(n).toLocaleString('th-TH');
    return [
      '=== ฐานความรู้ระเบียบงานการเงิน-พัสดุ (สพฐ.) — ใช้ให้คำปรึกษา ===',
      'อ้างอิง: ระบบควบคุมเงินหน่วยงานย่อย พ.ศ.2544 · ระเบียบกระทรวงการคลังว่าด้วยการเบิกจ่ายฯ 2562 · พ.ร.บ.การจัดซื้อจัดจ้างฯ 2560 · แนวการประเมิน สพฐ. 2567',
      '【พัสดุ】',
      `- วิธีเฉพาะเจาะจงใช้ได้เมื่อวงเงินไม่เกิน ${f(k['procurement.specific_max'])} บาท เกินกว่านี้ต้องวิธีคัดเลือก/e-bidding (พ.ร.บ.ฯ ม.56)`,
      `- วงเงินไม่เกิน ${f(k['procurement.inspector_single_max'])} บาท แต่งตั้งผู้ตรวจรับคนเดียวได้ เกินต้องคณะกรรมการตรวจรับ ≥3 คน`,
      `- โครงการวงเงิน ≥ ${f(k['procurement.plan_publish_min'])} บาท ต้องประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง (ม.11)`,
      `- หลักประกันสัญญา ${k['procurement.contract_security_pct']}% ของวงเงินตามสัญญา`,
      '- ลำดับงาน: รายงานขอซื้อขอจ้าง → อนุมัติ → ตรวจรับ → ตั้งเบิก → จ่าย (ห้ามจ่ายก่อนตรวจรับ)',
      '【การเงิน/ภาษี】',
      `- หักภาษี ณ ที่จ่ายเมื่อจ่าย ≥ ${f(k['finance.wht_min'])} บาท: ซื้อสินค้า/จ้างทำของ ${k['finance.wht_rate_goods']}% · บริการ/วิชาชีพ ${k['finance.wht_rate_service']}% · ค่าเช่า ${k['finance.wht_rate_rent']}%`,
      `- เงินรายได้แผ่นดิน: ยอด > ${f(k['finance.gov_revenue_urgent'])} บาท นำส่งภายใน ${k['finance.gov_revenue_urgent_days']} วันทำการ มิฉะนั้นรวบรวมนำส่งเดือนละครั้ง`,
      `- ส่งรายงานการเงินรายเดือนให้ สพท. ภายในวันที่ ${k['finance.monthly_submit_day']} ของเดือนถัดไป`,
      `- วงเงินเก็บรักษาเงินสด (เงินรายได้สถานศึกษา) เริ่มต้น ${f(k['finance.cash_reserve_default'])} บาท ส่วนเกินต้องนำฝากธนาคาร`,
      '- เงินยืม: ค่าเดินทางส่งใช้ภายใน 15 วัน, อื่น ๆ 30 วัน; ห้ามยืมใหม่ถ้ายังค้างเก่า; ต้องคืนหมดก่อนปิดปีงบ',
      '- ยืมเงินข้ามประเภท: ห้ามยืมจากภาษี/ประกัน/รายได้แผ่นดิน และต้องมีเงินคงเหลือเพียงพอ',
      '- เลขที่เอกสาร: บร.(ใบเสร็จ) บค.(เบิกเงินสด) บจ.(จ่ายเช็ค) บย.(ยืมเงิน) บง.(นำส่งรายได้แผ่นดิน) บฝ./บถ.(ฝาก/ถอน สพป.)',
      '- ใบเสร็จรับเงินต้องมี: ชื่อ-ที่อยู่ผู้ชำระ, วันที่, รายการ, จำนวนเงิน (ตัวเลข+ตัวอักษร), ลายมือชื่อผู้รับเงิน, แสดง บร. เล่มที่/เลขที่',
    ].join('\n');
  }

  /**
   * snapshot ส่วนเพิ่ม: รายได้แผ่นดิน / ยืมข้ามประเภท / ใบเสร็จ / จัดซื้อ / ส่งรายเดือน
   */
  private async getSystemSnapshotExtra(
    scId: number,
    _budgetYear: string,
  ): Promise<string> {
    const lines: string[] = [];
    const num = (v: unknown) => Number(v ?? 0);

    try {
      const [gr] = await this.dataSource.query(
        `SELECT COALESCE(SUM(CASE WHEN entry_type=1 THEN amount ELSE 0 END),0) AS received,
                COALESCE(SUM(CASE WHEN entry_type=2 THEN amount ELSE 0 END),0) AS remitted
         FROM gov_revenue_entry WHERE sc_id=? AND del=0`,
        [scId],
      );
      const outstanding = num(gr?.received) - num(gr?.remitted);
      lines.push(
        `— เงินรายได้แผ่นดิน — รับ ${this.fmt(num(gr?.received))} | นำส่งแล้ว ${this.fmt(num(gr?.remitted))} | ค้างนำส่ง ${this.fmt(outstanding)} บาท`,
      );
    } catch {
      /* ข้ามถ้าตารางไม่พร้อม */
    }

    try {
      const [fb] = await this.dataSource.query(
        `SELECT COUNT(*) AS cnt,
                COALESCE(SUM(CASE WHEN status=1 THEN amount ELSE 0 END),0) AS outstanding,
                SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS open_cnt
         FROM fund_borrowing WHERE sc_id=? AND del=0`,
        [scId],
      );
      if (num(fb?.cnt) > 0) {
        lines.push(
          `— ยืมเงินข้ามประเภท — ทั้งหมด ${num(fb?.cnt)} | ค้างคืน ${num(fb?.open_cnt)} (${this.fmt(num(fb?.outstanding))} บาท)`,
        );
      }
    } catch {
      /* ข้าม */
    }

    try {
      const [rc] = await this.dataSource.query(
        `SELECT COUNT(*) AS cnt FROM receipt WHERE sc_id=? AND status='1'`,
        [scId],
      );
      const [bk] = await this.dataSource.query(
        `SELECT book_code, current_no, to_no FROM receipt_book
         WHERE sc_id=? AND status=1 AND del=0 ORDER BY rb_id DESC LIMIT 1`,
        [scId],
      );
      const bookInfo = bk
        ? `เล่มที่ใช้งาน ${bk.book_code ?? '-'} เลขถัดไป ${num(bk.current_no)} (ถึง ${num(bk.to_no)})`
        : 'ยังไม่เปิดเล่มใบเสร็จ';
      lines.push(
        `— ใบเสร็จรับเงิน (บร.) — ออกแล้ว ${num(rc?.cnt)} ใบ | ${bookInfo}`,
      );
    } catch {
      /* ข้าม */
    }

    try {
      const rows: Array<{ s: number; cnt: number; amt: number }> =
        await this.dataSource.query(
          `SELECT order_status AS s, COUNT(*) AS cnt, COALESCE(SUM(budgets),0) AS amt
           FROM parcel_order WHERE sc_id=? AND del=0 GROUP BY order_status`,
          [scId],
        );
      if (rows.length) {
        const map: Record<number, string> = {
          0: 'ทบทวน',
          1: 'ขอ',
          2: 'แผน',
          3: 'การเงิน',
          4: 'พัสดุ',
          5: 'ผอ.',
          6: 'ตั้งกรรมการ',
          7: 'จัดซื้อ',
          8: 'สำเร็จ',
          9: 'ยกเลิก',
        };
        const summary = rows
          .map((r) => `${map[num(r.s)] ?? 'สถานะ' + r.s} ${num(r.cnt)}`)
          .join(', ');
        lines.push(`— จัดซื้อจัดจ้าง (ตามสถานะ) — ${summary}`);
      }
    } catch {
      /* ข้าม */
    }

    try {
      const [ms] = await this.dataSource.query(
        `SELECT SUM(CASE WHEN status<2 THEN 1 ELSE 0 END) AS pending, COUNT(*) AS total
         FROM monthly_submission WHERE sc_id=? AND del=0`,
        [scId],
      );
      if (num(ms?.total) > 0) {
        lines.push(
          `— ส่งรายงานรายเดือน สพท. — ค้างส่ง ${num(ms?.pending)} / ${num(ms?.total)} เดือน`,
        );
      }
    } catch {
      /* ข้าม */
    }

    return lines.join('\n');
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
