import { Injectable, Logger } from '@nestjs/common';
import { AiRouterService } from '../ai-router.service';
import { ChatMessage } from '../providers/ai-provider.interface';
import { ParseProjectDto } from '../dto/parse-project.dto';

export interface ParsedProjectFields {
  proj_name: string | null;
  proj_detail: string | null;
  policy_ids: number[];
  proj_budget_type: string | null;
  start_date: string | null; // YYYY-MM-DD (CE)
  end_date: string | null;
  proj_budget: number | null;
}

export interface ParseProjectResult {
  flag: boolean;
  ms?: string;
  data?: {
    fields: ParsedProjectFields;
    questions: { field: string; question: string }[];
    provider: string;
  };
}

@Injectable()
export class ProjectExtractService {
  private readonly logger = new Logger(ProjectExtractService.name);

  constructor(private readonly aiRouter: AiRouterService) {}

  async parse(dto: ParseProjectDto): Promise<ParseProjectResult> {
    const policies = dto.policies ?? [];
    const budgetTypes = dto.budget_types ?? [];

    const policyList = policies.length
      ? policies.map((p) => `  - id=${p.scp_id}: ${p.name}`).join('\n')
      : '  (ไม่มีรายการนโยบาย)';
    const budgetTypeList = budgetTypes.length
      ? budgetTypes.map((b) => `  - ${b}`).join('\n')
      : '  (ไม่มีรายการประเภทงบ)';

    const fiscalHint =
      dto.fiscal_start && dto.fiscal_end
        ? `ปีงบประมาณนี้อยู่ในช่วง ${dto.fiscal_start} ถึง ${dto.fiscal_end} (ค.ศ.).`
        : dto.budget_year
          ? `ปีงบประมาณ พ.ศ. ${dto.budget_year}.`
          : '';

    const systemPrompt = `คุณเป็นผู้ช่วยกรอกแบบฟอร์ม "โครงการ" ของโรงเรียนไทย
หน้าที่: อ่านข้อความที่ผู้ใช้พิมพ์/พูดมาแบบรวม ๆ แล้วสกัดเป็นข้อมูลโครงการ
ตอบกลับเป็น JSON อย่างเดียว (ห้ามมีข้อความอื่นนอก JSON) ตาม schema นี้:
{
  "proj_name": string|null,            // ชื่อโครงการ
  "proj_detail": string|null,          // รายละเอียด/วัตถุประสงค์
  "policy_ids": number[],              // id ของนโยบายโรงเรียนที่สอดคล้อง (เลือกจากรายการที่ให้ เท่านั้น)
  "proj_budget_type": string|null,     // ประเภทงบประมาณ (ต้องตรงกับรายการที่ให้ เป๊ะ ๆ มิฉะนั้น null)
  "start_date": string|null,           // วันที่เริ่ม รูปแบบ YYYY-MM-DD (ค.ศ.)
  "end_date": string|null,             // วันที่สิ้นสุด รูปแบบ YYYY-MM-DD (ค.ศ.)
  "proj_budget": number|null,          // วงเงินงบประมาณ (ตัวเลขบาท ไม่มีคอมมา)
  "questions": [ { "field": string, "question": string } ]  // ถ้าข้อมูลใดไม่ชัด/ขาด ให้ถามกลับเป็นภาษาไทย
}

กติกาสำคัญ:
- ใช้ "วันที่ที่ผู้ใช้ระบุโดยตรง" เสมอ ห้ามแทนที่ด้วยวันต้น/ปลายปีงบ — ช่วงปีงบใช้เพื่อช่วยเดา "ปี" ที่หายไปเท่านั้น
- แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (ค.ศ. = พ.ศ. - 543). ${fiscalHint}
- รักษาชื่อโครงการตามที่ผู้ใช้ระบุ ไม่ต้องแต่งใหม่; เลือก policy_ids เฉพาะที่ผู้ใช้กล่าวถึงจริง ห้ามเดาเกิน
- policy_ids ต้องเป็น id จากรายการนโยบายด้านล่างเท่านั้น ถ้าจับคู่ไม่ได้ให้เว้นว่าง []
- proj_budget_type ต้องตรงกับรายการประเภทงบด้านล่างแบบเป๊ะ ถ้าไม่ตรงให้เป็น null
- ฟิลด์ที่ผู้ใช้ไม่ได้ระบุหรือไม่ชัดเจน ให้ใส่ค่า null และเพิ่มคำถามใน "questions"
- ถ้าข้อมูลครบชัดเจน ให้ "questions": []

รายการนโยบายโรงเรียน (เลือก policy_ids จากนี่):
${policyList}

รายการประเภทงบประมาณ:
${budgetTypeList}`;

    const messages: ChatMessage[] = [
      { role: 'user', content: dto.text },
    ];

    let content = '';
    let provider = '';
    try {
      const res = await this.aiRouter.chat('merge', messages, systemPrompt);
      content = res.content;
      provider = res.provider;
    } catch (e) {
      this.logger.error(`AI parse-project failed: ${(e as Error).message}`);
      return {
        flag: false,
        ms: 'AI ไม่พร้อมใช้งานขณะนี้ — กรุณากรอกฟอร์มเอง หรือลองใหม่อีกครั้ง',
      };
    }

    const parsed = this.extractJson(content);
    if (!parsed) {
      return {
        flag: false,
        ms: 'ไม่สามารถตีความข้อมูลจาก AI ได้ — กรุณาระบุข้อความให้ชัดเจนขึ้น',
      };
    }

    // จับ id นโยบายให้อยู่เฉพาะที่มีจริง
    const validIds = new Set(policies.map((p) => p.scp_id));
    const policyIds = Array.isArray(parsed.policy_ids)
      ? parsed.policy_ids
          .map((x) => Number(x))
          .filter((x) => validIds.has(x))
      : [];

    // ประเภทงบต้องตรงรายการ (กัน AI มั่ว)
    const budgetType =
      typeof parsed.proj_budget_type === 'string' &&
      budgetTypes.includes(parsed.proj_budget_type)
        ? parsed.proj_budget_type
        : null;

    const fields: ParsedProjectFields = {
      proj_name: this.str(parsed.proj_name),
      proj_detail: this.str(parsed.proj_detail),
      policy_ids: policyIds,
      proj_budget_type: budgetType,
      start_date: this.dateStr(parsed.start_date),
      end_date: this.dateStr(parsed.end_date),
      proj_budget:
        parsed.proj_budget != null && !isNaN(Number(parsed.proj_budget))
          ? Number(parsed.proj_budget)
          : null,
    };

    // วันที่จาก LLM ไม่น่าเชื่อถือ → ถ้าจับวันที่ไทยในข้อความได้ ให้ใช้ค่านั้นแทน (deterministic)
    const thDates = this.extractThaiDates(dto.text);
    if (thDates[0]) fields.start_date = thDates[0];
    if (thDates[1]) fields.end_date = thDates[1];

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter(
            (q): q is { field: string; question: string } =>
              !!q && typeof q.question === 'string',
          )
          .map((q) => ({ field: String(q.field ?? ''), question: q.question }))
      : [];

    return { flag: true, data: { fields, questions, provider } };
  }

  /** ดึง JSON object แรกจาก content */
  private extractJson(content: string): Record<string, any> | null {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, any>;
    } catch {
      return null;
    }
  }

  private str(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length ? t : null;
  }

  /** ตรวจรูปแบบ YYYY-MM-DD */
  private dateStr(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  }

  // map ชื่อเดือนไทย (เต็ม/ย่อ) → เลขเดือน
  private static readonly TH_MONTHS: Record<string, number> = {
    มกราคม: 1, 'ม.ค.': 1, มค: 1,
    กุมภาพันธ์: 2, 'ก.พ.': 2, กพ: 2,
    มีนาคม: 3, 'มี.ค.': 3, มีค: 3,
    เมษายน: 4, 'เม.ย.': 4, เมย: 4,
    พฤษภาคม: 5, 'พ.ค.': 5, พค: 5,
    มิถุนายน: 6, 'มิ.ย.': 6, มิย: 6,
    กรกฎาคม: 7, 'ก.ค.': 7, กค: 7,
    สิงหาคม: 8, 'ส.ค.': 8, สค: 8,
    กันยายน: 9, 'ก.ย.': 9, กย: 9,
    ตุลาคม: 10, 'ต.ค.': 10, ตค: 10,
    พฤศจิกายน: 11, 'พ.ย.': 11, พย: 11,
    ธันวาคม: 12, 'ธ.ค.': 12, ธค: 12,
  };

  /** ปี พ.ศ.→ค.ศ. (idempotent); 2 หลักถือเป็น พ.ศ. ย่อ */
  private toCeYear(y: number): number {
    if (y < 100) y += 2500; // 69 → 2569
    return y >= 2400 ? y - 543 : y;
  }

  private pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /**
   * สกัดวันที่ไทยจากข้อความ (deterministic) — รองรับ:
   *   "1 พฤษภาคม 2569", "1 พ.ค. 69", "01/05/2569", "1-5-2026"
   * คืนเรียงตามลำดับที่พบ (ตัวแรก=เริ่ม, ตัวที่สอง=สิ้นสุด)
   */
  private extractThaiDates(input: string): string[] {
    const text = (input || '').normalize('NFC');
    const found: { pos: number; date: string }[] = [];

    // รูปแบบมีชื่อเดือนไทย: <วัน> <คำเดือนไทย (อักษรไทย+จุด)> <ปี>
    // ใช้ regex literal (เลี่ยงปัญหา escaping) แล้ว lookup เดือนจาก map
    const wordRe = /(\d{1,2})\s*([฀-๿.]+)\s*(\d{2,4})/g;
    let m: RegExpExecArray | null;
    while ((m = wordRe.exec(text)) !== null) {
      const day = Number(m[1]);
      const token = m[2].normalize('NFC');
      const mon = ProjectExtractService.TH_MONTHS[token];
      const year = this.toCeYear(Number(m[3]));
      if (day >= 1 && day <= 31 && mon) {
        found.push({
          pos: m.index,
          date: `${year}-${this.pad(mon)}-${this.pad(day)}`,
        });
      }
    }

    // รูปแบบตัวเลข dd/mm/yyyy หรือ dd-mm-yyyy
    const numRe = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g;
    while ((m = numRe.exec(text)) !== null) {
      const day = Number(m[1]);
      const mon = Number(m[2]);
      const year = this.toCeYear(Number(m[3]));
      if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
        found.push({
          pos: m.index,
          date: `${year}-${this.pad(mon)}-${this.pad(day)}`,
        });
      }
    }

    found.sort((a, b) => a.pos - b.pos);
    // ตัดซ้ำ (ตำแหน่งใกล้กัน) แบบง่าย
    const seen = new Set<string>();
    return found.map((f) => f.date).filter((d) => {
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
  }
}
