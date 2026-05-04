import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';

export interface MonthlyAnalysisResult {
  month: string;
  rawData: {
    total_receive: number;
    total_pay: number;
    balance: number;
    invoice_count: number;
    check_count: number;
    top_categories: { name: string; amount: number }[];
  };
  aiAnalysis: string;
  provider: string;
}

export interface BudgetUtilizationResult {
  rawData: {
    categories: {
      bg_type_id: number;
      bg_type_name: string;
      budget: number;
      real_budget: number;
      spent: number;
      remaining: number;
      utilization_pct: number;
    }[];
    overall: {
      total_budget: number;
      total_real: number;
      total_spent: number;
      overall_pct: number;
    };
  };
  aiAnalysis: string;
  provider: string;
}

export interface SpendingTrendResult {
  months: number;
  rawData: {
    month: string;
    total_receive: number;
    total_pay: number;
    net: number;
  }[];
  aiAnalysis: string;
  provider: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  // Monthly Analysis
  // ─────────────────────────────────────────────

  /**
   * วิเคราะห์รายรับ-รายจ่ายประจำเดือน
   * @param month รูปแบบ YYYY-MM
   */
  async analyzeMonthly(
    scId: number,
    budgetYear: string,
    month: string,
  ): Promise<MonthlyAnalysisResult> {
    // financial_transactions ไม่มี budget_year — ใช้ DATE_FORMAT(create_date)
    // ถ้าเดือนที่ส่งมาไม่มีข้อมูล ดึงเดือนล่าสุดที่มีข้อมูล
    let queryMonth = month;
    const [checkRow] = await this.dataSource.query(
      `SELECT DATE_FORMAT(create_date, '%Y-%m') AS latest_month
       FROM financial_transactions WHERE sc_id = ? AND del = 0
       ORDER BY create_date DESC LIMIT 1`,
      [scId],
    );
    const latestMonth = checkRow?.latest_month ?? month;
    // ถ้าเดือนที่ขอไม่มีข้อมูล ใช้เดือนล่าสุด
    const [countCheck] = await this.dataSource.query(
      `SELECT COUNT(*) AS cnt FROM financial_transactions
       WHERE sc_id = ? AND DATE_FORMAT(create_date,'%Y-%m') = ? AND del = 0`,
      [scId, queryMonth],
    );
    if (Number(countCheck?.cnt ?? 0) === 0) queryMonth = latestMonth;

    // ดึงข้อมูลรายรับ-รายจ่าย
    const [txRow] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 1  THEN amount ELSE 0 END), 0) AS total_receive,
        COALESCE(SUM(CASE WHEN type = -1 THEN amount ELSE 0 END), 0) AS total_pay
       FROM financial_transactions
       WHERE sc_id = ? AND del = 0
         AND DATE_FORMAT(create_date, '%Y-%m') = ?`,
      [scId, queryMonth],
    );

    // จำนวนใบสำคัญจ่ายในเดือน — request_withdraw ใช้ year (varchar) + create_date
    const [invRow] = await this.dataSource.query(
      `SELECT COUNT(*) AS invoice_count
       FROM request_withdraw
       WHERE sc_id = ? AND del = 0
         AND DATE_FORMAT(create_date, '%Y-%m') = ?`,
      [scId, queryMonth],
    );

    // จำนวนเช็คในเดือน — ตาราง bank_ledger_entry แทน tb_check
    const [chkRow] = await this.dataSource
      .query(
        `SELECT COUNT(*) AS check_count
       FROM bank_ledger_entry
       WHERE sc_id = ? AND del = 0
         AND DATE_FORMAT(create_date, '%Y-%m') = ?`,
        [scId, queryMonth],
      )
      .catch(() => [{ check_count: 0 }]);

    // หมวดรายจ่ายสูงสุด 5 อันดับ จาก master_budget_income_type
    const topCategories: { name: string; amount: number }[] =
      await this.dataSource.query(
        `SELECT
        COALESCE(mit.budget_type, CONCAT('หมวด ', ft.bg_type_id)) AS name,
        COALESCE(SUM(ft.amount), 0) AS amount
       FROM financial_transactions ft
       LEFT JOIN master_budget_income_type mit ON mit.bg_type_id = ft.bg_type_id AND mit.del = 0
       WHERE ft.sc_id = ? AND ft.type = -1 AND ft.del = 0
         AND DATE_FORMAT(ft.create_date, '%Y-%m') = ?
       GROUP BY ft.bg_type_id, mit.budget_type
       ORDER BY amount DESC
       LIMIT 5`,
        [scId, queryMonth],
      );
    month = queryMonth; // อัปเดตเดือนจริงที่ใช้

    const totalReceive = Number(txRow?.total_receive ?? 0);
    const totalPay = Number(txRow?.total_pay ?? 0);

    const rawData = {
      total_receive: totalReceive,
      total_pay: totalPay,
      balance: totalReceive - totalPay,
      invoice_count: Number(invRow?.invoice_count ?? 0),
      check_count: Number(chkRow?.check_count ?? 0),
      top_categories: topCategories.map((c) => ({
        name: c.name ?? 'ไม่ระบุ',
        amount: Number(c.amount),
      })),
    };

    // สร้าง prompt สำหรับ AI
    const dataText = this.formatMonthlyDataForAi(rawData, month, budgetYear);

    const systemPrompt = `คุณคือนักวิเคราะห์การเงินโรงเรียน ปีงบประมาณ ${budgetYear}
วิเคราะห์ข้อมูลการเงินประจำเดือนที่ให้มา แล้วสรุปเป็นภาษาไทย ครอบคลุม:
1. ภาพรวมรายรับ-รายจ่ายของเดือน
2. หมวดค่าใช้จ่ายหลัก
3. ข้อสังเกตหรือประเด็นที่ควรระวัง
4. ข้อเสนอแนะ (ถ้ามี)
ตอบกระชับ ใช้ bullet point ไม่เกิน 200 คำ`;

    const messages: ChatMessage[] = [{ role: 'user', content: dataText }];

    let aiAnalysis = 'ไม่สามารถวิเคราะห์ได้';
    let provider = 'none';

    try {
      const response = await this.aiRouter.chat(
        'analyze',
        messages,
        systemPrompt,
      );
      aiAnalysis = response.content;
      provider = response.provider;
    } catch (err) {
      this.logger.warn('AI monthly analysis ล้มเหลว', err);
    }

    return { month, rawData, aiAnalysis, provider };
  }

  // ─────────────────────────────────────────────
  // Budget Utilization Analysis
  // ─────────────────────────────────────────────

  /**
   * วิเคราะห์การใช้งบประมาณตามหมวด
   */
  async analyzeBudgetUtilization(
    scId: number,
    syId: number,
    budgetYear: string,
  ): Promise<BudgetUtilizationResult> {
    // toCeYear helper
    const ceYear =
      Number(budgetYear) >= 2400
        ? Number(budgetYear) - 543
        : Number(budgetYear);

    // งบประมาณแต่ละหมวด จาก tb_estimate_acadyear (มี budget_year)
    // + รายจ่ายจาก financial_transactions (ไม่มี budget_year — ใช้ YEAR(create_date))
    const categories: {
      bg_type_id: number;
      bg_type_name: string;
      budget: number;
      real_budget: number;
      spent: number;
    }[] = await this.dataSource.query(
      `SELECT
        mit.bg_type_id               AS bg_type_id,
        mit.budget_type             AS bg_type_name,
        COALESCE(ea.ea_budget, 0)        AS budget,
        COALESCE(ea.real_budget, 0)      AS real_budget,
        COALESCE(ft.total_spent, 0)      AS spent
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
       ORDER BY budget DESC
       LIMIT 10`,
      [scId, budgetYear, String(ceYear), scId, ceYear],
    );

    // รวมทั้งหมด
    const [overallRow] = await this.dataSource.query(
      `SELECT
        COALESCE(SUM(ea_budget), 0)   AS total_budget,
        COALESCE(SUM(real_budget), 0) AS total_real
       FROM tb_estimate_acadyear
       WHERE sc_id = ? AND (budget_year = ? OR budget_year = ?) AND del = 0`,
      [scId, budgetYear, String(ceYear)],
    );
    const [spentRow] = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM financial_transactions
       WHERE sc_id = ? AND YEAR(create_date) = ? AND type = -1 AND del = 0`,
      [scId, ceYear],
    );

    const totalBudget = Number(overallRow?.total_budget ?? 0);
    const totalReal = Number(overallRow?.total_real ?? 0);
    const totalSpent = Number(spentRow?.total_spent ?? 0);
    const overallPct = totalReal > 0 ? (totalSpent / totalReal) * 100 : 0;

    const catData = categories.map((c) => {
      const realBudget = Number(c.real_budget);
      const spent = Number(c.spent);
      return {
        bg_type_id: c.bg_type_id,
        bg_type_name: c.bg_type_name ?? 'ไม่ระบุ',
        budget: Number(c.budget),
        real_budget: realBudget,
        spent,
        remaining: realBudget - spent,
        utilization_pct: realBudget > 0 ? (spent / realBudget) * 100 : 0,
      };
    });

    const rawData = {
      categories: catData,
      overall: {
        total_budget: totalBudget,
        total_real: totalReal,
        total_spent: totalSpent,
        overall_pct: overallPct,
      },
    };

    // ส่งให้ AI วิเคราะห์
    const dataText = this.formatBudgetDataForAi(rawData, budgetYear);

    const systemPrompt = `คุณคือนักวิเคราะห์งบประมาณโรงเรียน ปีงบประมาณ ${budgetYear}
วิเคราะห์การใช้งบประมาณที่ให้มา แล้วสรุปเป็นภาษาไทย ครอบคลุม:
1. ภาพรวมการใช้งบประมาณ (%)
2. หมวดที่ใช้งบมากที่สุด/น้อยที่สุด
3. หมวดที่เสี่ยงงบเกิน
4. ข้อเสนอแนะการจัดสรรงบที่เหลือ
ตอบกระชับ ใช้ bullet point ไม่เกิน 200 คำ`;

    const messages: ChatMessage[] = [{ role: 'user', content: dataText }];

    let aiAnalysis = 'ไม่สามารถวิเคราะห์ได้';
    let provider = 'none';

    try {
      const response = await this.aiRouter.chat(
        'analyze',
        messages,
        systemPrompt,
      );
      aiAnalysis = response.content;
      provider = response.provider;
    } catch (err) {
      this.logger.warn('AI budget analysis ล้มเหลว', err);
    }

    return { rawData, aiAnalysis, provider };
  }

  // ─────────────────────────────────────────────
  // Spending Trend Analysis
  // ─────────────────────────────────────────────

  /**
   * วิเคราะห์แนวโน้มรายจ่ายย้อนหลัง N เดือน
   */
  async analyzeSpendingTrend(
    scId: number,
    budgetYear: string,
    months = 6,
  ): Promise<SpendingTrendResult> {
    const clampedMonths = Math.min(Math.max(months, 1), 24);

    // financial_transactions ไม่มี budget_year — กรองด้วย create_date
    const monthlyData: {
      month: string;
      total_receive: number;
      total_pay: number;
    }[] = await this.dataSource.query(
      `SELECT
        DATE_FORMAT(create_date, '%Y-%m') AS month,
        COALESCE(SUM(CASE WHEN type = 1  THEN amount ELSE 0 END), 0) AS total_receive,
        COALESCE(SUM(CASE WHEN type = -1 THEN amount ELSE 0 END), 0) AS total_pay
       FROM financial_transactions
       WHERE sc_id = ? AND del = 0
         AND create_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(create_date, '%Y-%m')
       ORDER BY month ASC`,
      [scId, clampedMonths],
    );

    const rawData = monthlyData.map((r) => ({
      month: r.month,
      total_receive: Number(r.total_receive),
      total_pay: Number(r.total_pay),
      net: Number(r.total_receive) - Number(r.total_pay),
    }));

    // สร้างตารางข้อมูลสำหรับ AI
    const tableRows = rawData
      .map(
        (r) =>
          `${r.month} | รับ ${this.fmt(r.total_receive)} | จ่าย ${this.fmt(r.total_pay)} | สุทธิ ${this.fmt(r.net)}`,
      )
      .join('\n');

    const systemPrompt = `คุณคือนักวิเคราะห์การเงินโรงเรียน ปีงบประมาณ ${budgetYear}
วิเคราะห์แนวโน้มรายรับ-รายจ่าย ${clampedMonths} เดือนย้อนหลัง แล้วสรุปเป็นภาษาไทย ครอบคลุม:
1. แนวโน้มรายรับและรายจ่ายโดยรวม (เพิ่ม/ลด/คงที่)
2. เดือนที่รายจ่ายสูงผิดปกติ (ถ้ามี)
3. ประมาณการแนวโน้มในอนาคต
4. ข้อแนะนำการบริหารเงิน
ตอบกระชับ ใช้ bullet point ไม่เกิน 200 คำ`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `ข้อมูลรายรับ-รายจ่ายย้อนหลัง ${clampedMonths} เดือน:\n\nเดือน | รายรับ | รายจ่าย | สุทธิ\n${tableRows}`,
      },
    ];

    let aiAnalysis = 'ไม่สามารถวิเคราะห์ได้';
    let provider = 'none';

    try {
      const response = await this.aiRouter.chat(
        'analyze',
        messages,
        systemPrompt,
      );
      aiAnalysis = response.content;
      provider = response.provider;
    } catch (err) {
      this.logger.warn('AI spending trend ล้มเหลว', err);
    }

    return { months: clampedMonths, rawData, aiAnalysis, provider };
  }

  // ─────────────────────────────────────────────
  // Private Formatters
  // ─────────────────────────────────────────────

  private formatMonthlyDataForAi(
    data: MonthlyAnalysisResult['rawData'],
    month: string,
    budgetYear: string,
  ): string {
    const lines = [
      `ข้อมูลการเงินเดือน ${month} ปีงบประมาณ ${budgetYear}`,
      `รายรับรวม: ${this.fmt(data.total_receive)} บาท`,
      `รายจ่ายรวม: ${this.fmt(data.total_pay)} บาท`,
      `ยอดสุทธิ: ${this.fmt(data.balance)} บาท`,
      `จำนวนใบสำคัญจ่าย: ${data.invoice_count} รายการ`,
      `จำนวนเช็คที่ออก: ${data.check_count} รายการ`,
      '',
      'หมวดรายจ่ายสูงสุด:',
      ...data.top_categories.map(
        (c) => `  - ${c.name}: ${this.fmt(c.amount)} บาท`,
      ),
    ];
    return lines.join('\n');
  }

  private formatBudgetDataForAi(
    data: BudgetUtilizationResult['rawData'],
    budgetYear: string,
  ): string {
    const { overall, categories } = data;
    const lines = [
      `งบประมาณปี ${budgetYear}`,
      `งบทั้งหมด: ${this.fmt(overall.total_budget)} บาท | งบจริง: ${this.fmt(overall.total_real)} บาท`,
      `ใช้แล้ว: ${this.fmt(overall.total_spent)} บาท (${overall.overall_pct.toFixed(1)}%)`,
      '',
      'รายละเอียดตามหมวด:',
      ...categories
        .filter((c) => c.real_budget > 0)
        .map(
          (c) =>
            `  ${c.bg_type_name}: งบ ${this.fmt(c.real_budget)} ใช้ ${this.fmt(c.spent)} (${c.utilization_pct.toFixed(1)}%) คงเหลือ ${this.fmt(c.remaining)}`,
        ),
    ];
    return lines.join('\n');
  }

  private fmt(n: number): string {
    return Number(n).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
