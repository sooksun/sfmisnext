import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';
import { ColumnMapping, MatchResult } from '../dto/merge.dto';

/** ข้อมูลรายการจากระบบสำหรับนำมาจับคู่ */
interface SystemEntry {
  id: number;
  entry_date: string;
  amount: number;
  description: string;
  entry_type?: number;
  source_table: string;
}

/** ผลลัพธ์การ reconcile */
export interface ReconcileResult {
  matches: MatchResult[];
  summary: {
    total_bank: number;
    matched_exact: number;
    matched_fuzzy: number;
    unmatched: number;
    total_bank_amount: number;
    matched_amount: number;
    unmatched_amount: number;
  };
  aiNote: string;
  provider: string;
}

/** ผลลัพธ์การ suggest column mapping */
export interface ColumnMappingResult {
  mappings: ColumnMapping[];
  unmapped: string[];
  aiNote: string;
  provider: string;
}

/** Schema ของตารางเป้าหมายที่รู้จัก */
const TABLE_SCHEMAS: Record<string, { fields: string[]; description: string }> =
  {
    financial_transactions: {
      fields: [
        'amount',
        'type',
        'bg_type_id',
        'description',
        'cre_date',
        'sc_id',
        'budget_year',
      ],
      description: 'รายการรับ-จ่ายการเงิน',
    },
    request_withdraw: {
      fields: [
        'amount',
        'rw_type',
        'p_id',
        'description',
        'rw_date',
        'status',
        'sc_id',
        'budget_year',
      ],
      description: 'ใบสำคัญจ่าย/ใบขอเบิก',
    },
    bank_ledger_entry: {
      fields: [
        'amount',
        'entry_type',
        'ba_id',
        'description',
        'entry_date',
        'sc_id',
        'budget_year',
      ],
      description: 'รายการสมุดคุมบัญชีธนาคาร',
    },
    loan_agreement: {
      fields: [
        'la_no',
        'borrower_id',
        'amount',
        'borrow_date',
        'due_date',
        'loan_category',
        'status',
        'sc_id',
        'budget_year',
      ],
      description: 'สัญญายืมเงิน',
    },
  };

@Injectable()
export class MergeService {
  private readonly logger = new Logger(MergeService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  // Column Mapping
  // ─────────────────────────────────────────────

  /**
   * ให้ AI แนะนำการ map column จาก Excel ไปยัง field ของ DB
   * @param headers   header column จากไฟล์ Excel
   * @param targetTable ชื่อตารางเป้าหมายใน DB
   */
  async suggestColumnMapping(
    headers: string[],
    targetTable: string,
  ): Promise<ColumnMappingResult> {
    const schema = TABLE_SCHEMAS[targetTable] ?? {
      fields: [],
      description: 'ไม่ทราบชื่อตาราง',
    };

    const systemPrompt = `คุณคือผู้เชี่ยวชาญระบบฐานข้อมูลโรงเรียน
ช่วยจับคู่ column จาก Excel ให้ตรงกับ field ของตาราง "${targetTable}" (${schema.description})

field ที่มีในตาราง: ${schema.fields.join(', ')}

ตอบในรูปแบบ JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "mappings": [
    {"excel_column": "ชื่อ column Excel", "db_field": "ชื่อ field DB", "confidence": 0.0-1.0, "ai_reason": "เหตุผล"}
  ],
  "unmapped": ["column ที่จับคู่ไม่ได้"],
  "note": "หมายเหตุเพิ่มเติม"
}

กฎ:
- confidence 1.0 = แน่ใจ 100% (ชื่อตรงกันหรือความหมายเหมือนกันชัดเจน)
- confidence 0.7-0.9 = น่าจะใช่ (ความหมายใกล้เคียงกัน)
- confidence < 0.7 = ไม่แน่ใจ (อาจต้องให้ผู้ใช้ยืนยัน)
- ถ้าไม่มี field ที่ match ให้ใส่ใน unmapped แทน`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `column จาก Excel: ${headers.join(', ')}\n\nโปรดแนะนำการจับคู่กับตาราง "${targetTable}"`,
      },
    ];

    let aiNote = '';
    let provider = 'none';
    let mappings: ColumnMapping[] = [];
    let unmapped: string[] = [...headers];

    try {
      const response = await this.aiRouter.chat(
        'merge',
        messages,
        systemPrompt,
      );
      provider = response.provider;

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: {
          mappings?: {
            excel_column: string;
            db_field: string;
            confidence: number;
            ai_reason: string;
          }[];
          unmapped?: string[];
          note?: string;
        } = JSON.parse(jsonMatch[0]);

        mappings = (parsed.mappings ?? []).map((m) => ({
          excel_column: m.excel_column,
          db_field: m.db_field,
          confidence: Number(m.confidence ?? 0),
          ai_reason: m.ai_reason ?? '',
        }));

        unmapped = parsed.unmapped ?? [];
        aiNote = parsed.note ?? '';
      }
    } catch (err) {
      this.logger.warn('AI column mapping ล้มเหลว', err);
      aiNote = 'ไม่สามารถวิเคราะห์ได้ กรุณา map column ด้วยตนเอง';
    }

    return { mappings, unmapped, aiNote, provider };
  }

  // ─────────────────────────────────────────────
  // Bank Reconciliation Matching
  // ─────────────────────────────────────────────

  /**
   * จับคู่รายการจาก bank statement กับรายการในระบบ
   * @param bankEntries  รายการจาก bank statement (ส่งมาจาก frontend)
   * @param toleranceDays  ยอมรับความต่างกี่วัน (default 3)
   * @param toleranceAmount ยอมรับความต่างเงินกี่บาท (default 0)
   */
  async reconcileEntries(
    scId: number,
    budgetYear: string,
    month: string,
    bankEntries: Record<string, unknown>[],
    toleranceDays = 3,
    toleranceAmount = 0,
  ): Promise<ReconcileResult> {
    // ดึงรายการจากระบบในช่วงเดือนนั้น (±toleranceDays)
    const systemEntries = await this.fetchSystemEntries(
      scId,
      budgetYear,
      month,
      toleranceDays,
    );

    // Rule-based exact matching ก่อน
    const results: MatchResult[] = [];
    const usedSystemIds = new Set<number>();

    for (const bankEntry of bankEntries) {
      const bankAmount = Number(
        bankEntry['amount'] ?? bankEntry['จำนวนเงิน'] ?? 0,
      );
      const bankDate = String(bankEntry['date'] ?? bankEntry['วันที่'] ?? '');

      // หารายการที่ match แบบ exact (ยอดตรง + วันที่อยู่ในช่วง)
      const exactMatch = systemEntries.find(
        (s) =>
          !usedSystemIds.has(s.id) &&
          Math.abs(s.amount - bankAmount) <= toleranceAmount &&
          this.daysApart(s.entry_date, bankDate) <= toleranceDays,
      );

      if (exactMatch) {
        usedSystemIds.add(exactMatch.id);
        results.push({
          bank_entry: bankEntry,
          system_entry: exactMatch as unknown as Record<string, unknown>,
          match_confidence: 1.0,
          match_type: 'exact',
        });
        continue;
      }

      // fuzzy match: ยอดใกล้เคียง (±5%) หรือวันที่ใกล้เคียง
      const fuzzyMatch = systemEntries.find(
        (s) =>
          !usedSystemIds.has(s.id) &&
          (Math.abs(s.amount - bankAmount) / Math.max(bankAmount, 1) <= 0.05 ||
            this.daysApart(s.entry_date, bankDate) <= toleranceDays * 2),
      );

      if (fuzzyMatch) {
        usedSystemIds.add(fuzzyMatch.id);
        results.push({
          bank_entry: bankEntry,
          system_entry: fuzzyMatch as unknown as Record<string, unknown>,
          match_confidence: 0.7,
          match_type: 'fuzzy',
        });
      } else {
        results.push({
          bank_entry: bankEntry,
          system_entry: null,
          match_confidence: 0,
          match_type: 'unmatched',
        });
      }
    }

    // ให้ AI ตรวจสอบรายการที่ยัง unmatched
    const unmatched = results.filter((r) => r.match_type === 'unmatched');
    let aiNote = '';
    let provider = 'none';

    if (unmatched.length > 0) {
      try {
        const aiResult = await this.analyzeUnmatchedWithAi(
          unmatched,
          systemEntries,
          usedSystemIds,
          toleranceDays,
        );
        aiNote = aiResult.note;
        provider = aiResult.provider;

        // อัปเดต match ที่ AI แนะนำ
        for (const suggestion of aiResult.suggestions) {
          const idx = results.findIndex((r) => r === suggestion.original);
          if (
            idx >= 0 &&
            suggestion.systemEntry &&
            !usedSystemIds.has(suggestion.systemEntry.id)
          ) {
            usedSystemIds.add(suggestion.systemEntry.id);
            results[idx] = {
              bank_entry: suggestion.original.bank_entry,
              system_entry: suggestion.systemEntry as unknown as Record<
                string,
                unknown
              >,
              match_confidence: suggestion.confidence,
              match_type: 'fuzzy',
              ai_note: suggestion.note,
            };
          }
        }
      } catch (err) {
        this.logger.warn('AI reconcile ล้มเหลว', err);
        aiNote = 'AI วิเคราะห์ไม่สำเร็จ กรุณาตรวจสอบรายการ unmatched ด้วยตนเอง';
      }
    }

    // สรุปผล
    const exactCount = results.filter((r) => r.match_type === 'exact').length;
    const fuzzyCount = results.filter((r) => r.match_type === 'fuzzy').length;
    const unmatchedCount = results.filter(
      (r) => r.match_type === 'unmatched',
    ).length;
    const totalBankAmount = bankEntries.reduce(
      (s, e) => s + Number(e['amount'] ?? e['จำนวนเงิน'] ?? 0),
      0,
    );
    const matchedAmount = results
      .filter((r) => r.match_type !== 'unmatched' && r.system_entry)
      .reduce(
        (s, r) =>
          s + Number((r.system_entry as SystemEntry | null)?.amount ?? 0),
        0,
      );
    const unmatchedAmount = results
      .filter((r) => r.match_type === 'unmatched')
      .reduce(
        (s, r) =>
          s + Number(r.bank_entry['amount'] ?? r.bank_entry['จำนวนเงิน'] ?? 0),
        0,
      );

    return {
      matches: results,
      summary: {
        total_bank: bankEntries.length,
        matched_exact: exactCount,
        matched_fuzzy: fuzzyCount,
        unmatched: unmatchedCount,
        total_bank_amount: totalBankAmount,
        matched_amount: matchedAmount,
        unmatched_amount: unmatchedAmount,
      },
      aiNote,
      provider,
    };
  }

  // ─────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────

  /**
   * ดึงรายการจากระบบ (bank_ledger + financial_transactions) ในช่วงเดือน
   */
  private async fetchSystemEntries(
    scId: number,
    budgetYear: string,
    month: string,
    toleranceDays: number,
  ): Promise<SystemEntry[]> {
    // bank ledger entries
    const ledger: SystemEntry[] = await this.dataSource.query(
      `SELECT id, entry_date, amount, COALESCE(description,'') AS description,
              entry_type, 'bank_ledger_entry' AS source_table
       FROM bank_ledger_entry
       WHERE sc_id = ? AND budget_year = ? AND del = 0
         AND entry_date BETWEEN
           DATE_SUB(CONCAT(?, '-01'), INTERVAL ? DAY) AND
           LAST_DAY(DATE_ADD(CONCAT(?, '-01'), INTERVAL ? DAY))`,
      [scId, budgetYear, month, toleranceDays, month, toleranceDays],
    );

    // financial transactions
    const transactions: SystemEntry[] = await this.dataSource.query(
      `SELECT id, DATE(cre_date) AS entry_date, amount,
              COALESCE(description,'') AS description,
              type AS entry_type, 'financial_transactions' AS source_table
       FROM financial_transactions
       WHERE sc_id = ? AND budget_year = ? AND del = 0
         AND DATE(cre_date) BETWEEN
           DATE_SUB(CONCAT(?, '-01'), INTERVAL ? DAY) AND
           LAST_DAY(DATE_ADD(CONCAT(?, '-01'), INTERVAL ? DAY))`,
      [scId, budgetYear, month, toleranceDays, month, toleranceDays],
    );

    return [...ledger, ...transactions];
  }

  /**
   * ให้ AI ช่วยจับคู่รายการที่ rule-based หาไม่เจอ
   */
  private async analyzeUnmatchedWithAi(
    unmatched: MatchResult[],
    systemEntries: SystemEntry[],
    usedIds: Set<number>,
    toleranceDays: number,
  ): Promise<{
    suggestions: {
      original: MatchResult;
      systemEntry: SystemEntry | null;
      confidence: number;
      note: string;
    }[];
    note: string;
    provider: string;
  }> {
    const availableSystem = systemEntries.filter((s) => !usedIds.has(s.id));

    if (availableSystem.length === 0) {
      return {
        suggestions: [],
        note: 'ไม่มีรายการในระบบที่เหลือสำหรับจับคู่',
        provider: 'none',
      };
    }

    const unmatchedText = unmatched
      .map((u) => {
        const amount = Number(
          u.bank_entry['amount'] ?? u.bank_entry['จำนวนเงิน'] ?? 0,
        );
        const date = String(
          u.bank_entry['date'] ?? u.bank_entry['วันที่'] ?? '',
        );
        const desc = String(
          u.bank_entry['description'] ?? u.bank_entry['รายการ'] ?? '',
        );
        return `- วันที่ ${date} จำนวน ${amount} บาท รายการ: ${desc}`;
      })
      .join('\n');

    const systemText = availableSystem
      .slice(0, 20) // จำกัด 20 รายการเพื่อไม่ให้ prompt ยาวเกิน
      .map(
        (s) =>
          `[id=${s.id}] วันที่ ${s.entry_date} จำนวน ${s.amount} บาท รายการ: ${s.description} (${s.source_table})`,
      )
      .join('\n');

    const systemPrompt = `คุณคือผู้เชี่ยวชาญกระทบยอดบัญชีธนาคาร
ช่วยจับคู่รายการจาก bank statement กับรายการในระบบที่ยังจับคู่ไม่ได้
ยอมรับความต่างวันที่ได้ ${toleranceDays} วัน

ตอบในรูปแบบ JSON เท่านั้น:
{
  "matches": [
    {"bank_index": 0, "system_id": 123, "confidence": 0.8, "note": "เหตุผล"}
  ],
  "summary": "สรุปภาษาไทย"
}
bank_index คือ index ของรายการ bank (เริ่มจาก 0)
system_id คือ id ของรายการในระบบ
ถ้าจับคู่ไม่ได้ ให้ system_id เป็น null`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `รายการ bank statement ที่ยังไม่ match:\n${unmatchedText}\n\nรายการในระบบที่ยังว่าง:\n${systemText}`,
      },
    ];

    const response = await this.aiRouter.chat('merge', messages, systemPrompt);

    const suggestions: {
      original: MatchResult;
      systemEntry: SystemEntry | null;
      confidence: number;
      note: string;
    }[] = [];
    let note = '';

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: {
          matches?: {
            bank_index: number;
            system_id: number | null;
            confidence: number;
            note: string;
          }[];
          summary?: string;
        } = JSON.parse(jsonMatch[0]);

        note = parsed.summary ?? '';

        for (const m of parsed.matches ?? []) {
          const originalEntry = unmatched[m.bank_index];
          if (!originalEntry) continue;
          const sysEntry = m.system_id
            ? (availableSystem.find((s) => s.id === m.system_id) ?? null)
            : null;
          suggestions.push({
            original: originalEntry,
            systemEntry: sysEntry,
            confidence: Number(m.confidence ?? 0.5),
            note: m.note ?? '',
          });
        }
      }
    } catch {
      this.logger.warn('parse AI reconcile JSON ล้มเหลว');
      note = 'AI วิเคราะห์ได้ผลลัพธ์ที่ไม่สมบูรณ์';
    }

    return { suggestions, note, provider: response.provider };
  }

  /**
   * คำนวณความต่างของวันที่ (วัน)
   */
  private daysApart(dateA: string, dateB: string): number {
    if (!dateA || !dateB) return 9999;
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    if (isNaN(a) || isNaN(b)) return 9999;
    return Math.abs(Math.round((a - b) / 86_400_000));
  }
}
