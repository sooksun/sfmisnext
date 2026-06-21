import { Injectable, Logger } from '@nestjs/common';
import { AiRouterService } from '../ai-router.service';
import type { ChatMessage } from '../providers/ai-provider.interface';
import type { AssistantCommandDto } from '../dto/assistant-command.dto';
import {
  suggestTerms,
  normalizeThai,
  fuzzyIncludes,
  type TermSuggestion,
} from '../knowledge/sfmis-glossary';

type FieldType = 'string' | 'number' | 'date' | 'select';

interface TaskField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

interface AssistantTask {
  key: string;
  label: string;
  route: string;
  aliases: string[];
  open_button?: string;
  fields: TaskField[];
}

export interface AssistantCommandResult {
  phase: 'clarify' | 'navigate' | 'prepare';
  message: string;
  task_key: string | null;
  task_label: string | null;
  route: string | null;
  open_button: string | null;
  draft: Record<string, unknown>;
  field_labels: Record<string, string>;
  missing_fields: { field: string; label: string; question: string }[];
  /** คำใกล้เคียงที่เดาได้จากข้อความ (did-you-mean) — frontend แสดงเป็นชิปให้กดได้ */
  suggested_terms: TermSuggestion[];
  source: 'ai' | 'rule';
  safety: { can_save: false; requires_user_review: true };
}

const F = (key: string, label: string, type: FieldType, required = false): TaskField => ({
  key,
  label,
  type,
  required,
});

/**
 * รายการงานที่ผู้ช่วยนำทาง/เตรียมแบบร่างได้
 * Endpoint นี้ไม่มีการเรียก service สำหรับ create/update/delete โดยตั้งใจ
 */
const TASKS: AssistantTask[] = [
  {
    key: 'create_project',
    label: 'เพิ่มโครงการ',
    route: '/sfmis/plan-menu/project',
    aliases: ['เพิ่มโครงการ', 'สร้างโครงการ', 'บันทึกโครงการ', 'แผนงานโครงการ'],
    open_button: 'เพิ่มโครงการ',
    fields: [
      F('proj_name', 'ชื่อโครงการ', 'string', true),
      F('proj_detail', 'รายละเอียดหรือวัตถุประสงค์', 'string'),
      F('proj_budget_type', 'ประเภทงบประมาณ', 'select'),
      F('proj_budget', 'วงเงินโครงการ', 'number', true),
      F('start_date', 'วันที่เริ่มโครงการ', 'date'),
      F('end_date', 'วันที่สิ้นสุดโครงการ', 'date'),
    ],
  },
  {
    key: 'create_procurement_plan',
    label: 'เพิ่มแผนจัดซื้อจัดจ้าง',
    route: '/sfmis/plan-menu/procurement-plan',
    aliases: ['เพิ่มแผนจัดซื้อ', 'สร้างแผนจัดซื้อ', 'แผนจัดซื้อจัดจ้าง'],
    open_button: 'เพิ่มแผน',
    fields: [
      F('pp_no', 'เลขที่แผน', 'string'),
      F('pp_title', 'ชื่อแผนจัดซื้อจัดจ้าง', 'string', true),
      F('pp_total_budget', 'วงเงินรวม', 'number', true),
      F('remark', 'หมายเหตุ', 'string'),
    ],
  },
  {
    key: 'receive_money',
    label: 'รับเงินและออกใบเสร็จ',
    route: '/sfmis/receive-menu/receive',
    aliases: ['รับเงิน', 'ออกใบเสร็จ', 'บันทึกรายรับ', 'เพิ่มรายรับ'],
    fields: [
      F('pr_no', 'เลขที่ใบเสร็จ', 'string', true),
      F('receive_form', 'ชื่อผู้ชำระเงิน', 'string', true),
      F('receive_date', 'วันที่รับเงิน', 'date', true),
      F('receive_money_type', 'ช่องทางรับเงิน', 'select', true),
      F('receiveList.0.prd_detail', 'รายการรับเงิน', 'string', true),
      F('receiveList.0.prd_budget', 'จำนวนเงิน', 'number', true),
      F('receiveList.0.bg_type_id', 'ประเภทเงิน/งบประมาณ', 'select', true),
    ],
  },
  {
    key: 'create_invoice',
    label: 'สร้างใบสำคัญจ่าย',
    route: '/sfmis/pay-menu/invoice',
    aliases: ['สร้างใบสำคัญจ่าย', 'ตั้งเบิก', 'ขอเบิก', 'เพิ่มรายการจ่าย', 'เบิกจ่าย'],
    open_button: 'สร้างใบสำคัญจ่าย',
    fields: [
      F('rw_type', 'ประเภทการจ่าย', 'select', true),
      F('bg_type_id', 'ประเภทงบประมาณ', 'select', true),
      F('detail', 'รายละเอียดการจ่าย', 'string', true),
      F('amount', 'จำนวนเงิน', 'number', true),
      F('date_request', 'วันที่ขอเบิก', 'date', true),
      F('user_request', 'ผู้ขอเบิก', 'select', true),
      F('p_id', 'ผู้รับเงินหรือร้านค้า', 'select'),
    ],
  },
  {
    key: 'create_loan',
    label: 'เพิ่มสัญญายืมเงิน',
    route: '/sfmis/pay-menu/loan-agreement',
    aliases: ['เพิ่มสัญญายืม', 'สร้างสัญญายืม', 'ยืมเงิน', 'เงินยืม'],
    open_button: 'เพิ่มสัญญายืมเงิน',
    fields: [
      F('borrower_id', 'ผู้ยืม', 'select', true),
      F('money_type_id', 'ประเภทเงิน', 'select', true),
      F('loan_category', 'ประเภทการยืม', 'select', true),
      F('purpose', 'วัตถุประสงค์', 'string'),
      F('expense_detail', 'รายละเอียดค่าใช้จ่าย', 'string'),
      F('amount', 'จำนวนเงิน', 'number', true),
      F('borrow_date', 'วันที่ยืม', 'date', true),
    ],
  },
  {
    key: 'travel_reimbursement',
    label: 'เพิ่มคำขอเบิกค่าเดินทาง',
    route: '/sfmis/pay-menu/travel-reimbursement',
    aliases: ['เบิกค่าเดินทาง', 'ขอเบิกเดินทาง', 'ค่าเดินทางไปราชการ'],
    open_button: 'ยื่นขอเบิก',
    fields: [
      F('requester_id', 'ผู้เดินทาง', 'select', true),
      F('money_type_id', 'ประเภทเงิน', 'select', true),
      F('purpose', 'วัตถุประสงค์การเดินทาง', 'string', true),
      F('depart_date', 'วันที่ออกเดินทาง', 'date', true),
      F('return_date', 'วันที่กลับ', 'date', true),
      F('travelers.0.name', 'ชื่อผู้เดินทางรายการแรก', 'string'),
    ],
  },
  {
    key: 'withholding_certificate',
    label: 'เพิ่มหนังสือรับรองหักภาษี ณ ที่จ่าย',
    route: '/sfmis/pay-menu/withholding-certificate',
    aliases: ['หนังสือรับรองหักภาษี', 'หักภาษี ณ ที่จ่าย', 'ใบหักภาษี'],
    open_button: 'เพิ่มหนังสือรับรอง',
    fields: [
      F('of_id', 'ใบสำคัญจ่าย', 'select', true),
      F('wc_no', 'เล่มที่/เลขที่หนังสือรับรอง', 'string', true),
      F('wc_rank', 'ลำดับที่ในแบบ', 'number', true),
      F('cer_date', 'วันที่ออกหนังสือ', 'date', true),
    ],
  },
  {
    key: 'budget_request',
    label: 'เพิ่มหลักฐานขอเบิก',
    route: '/sfmis/pay-menu/budget-request',
    aliases: ['หลักฐานขอเบิก', 'ทะเบียนคุมหลักฐานขอเบิก', 'เพิ่มรายการขอเบิก'],
    open_button: 'เพิ่มรายการ',
    fields: [
      F('action_date', 'วันที่ดำเนินการ', 'date', true),
      F('creditor_name', 'เจ้าหนี้หรือผู้ขอเบิก', 'string', true),
      F('expense_type_text', 'ประเภทรายจ่าย', 'select', true),
      F('amount', 'จำนวนเงิน', 'number', true),
      F('remark', 'หมายเหตุ', 'string'),
    ],
  },
  {
    key: 'spp_deposit',
    label: 'เพิ่มรายการฝาก/ถอนเงิน สพป.',
    route: '/sfmis/receive-menu/spp-deposit',
    aliases: ['ฝากเงิน สพป', 'ถอนเงิน สพป', 'สมุดคู่ฝาก', 'เพิ่มรายการฝาก'],
    open_button: 'เพิ่มรายการฝาก',
    fields: [
      F('entry_type', 'ประเภทรายการฝากหรือถอน', 'select', true),
      F('doc_no', 'เลขที่เอกสาร', 'string'),
      F('doc_date', 'วันที่', 'date', true),
      F('detail', 'รายละเอียด', 'string', true),
      F('amount', 'จำนวนเงิน', 'number', true),
      F('money_type_id', 'ประเภทเงิน', 'select'),
    ],
  },
  {
    key: 'fund_borrowing',
    label: 'เพิ่มการยืมเงินข้ามประเภท',
    route: '/sfmis/pay-menu/fund-borrowing',
    aliases: ['ยืมเงินข้ามประเภท', 'เพิ่มการยืมข้ามประเภท'],
    open_button: 'เพิ่มการยืม',
    fields: [
      F('from_money_type_id', 'ประเภทเงินต้นทาง', 'select', true),
      F('to_money_type_id', 'ประเภทเงินปลายทาง', 'select', true),
      F('amount', 'จำนวนเงิน', 'number', true),
      F('borrow_date', 'วันที่ยืม', 'date', true),
      F('purpose', 'วัตถุประสงค์', 'string'),
    ],
  },
  { key: 'project_workspace', label: 'บริหารและติดตามโครงการ', route: '/sfmis/plan-menu/projects', aliases: ['บริหารโครงการ', 'ติดตามโครงการ', 'งานย่อยโครงการ'], fields: [] },
  { key: 'project_approval', label: 'อนุมัติโครงการ/คำขอจัดซื้อ', route: '/sfmis/plan-menu/proj-approve', aliases: ['อนุมัติโครงการ', 'อนุมัติคำขอจัดซื้อ', 'งานรออนุมัติ'], fields: [] },
  { key: 'committee', label: 'แต่งตั้งคณะกรรมการ', route: '/sfmis/setting-committee', aliases: ['แต่งตั้งกรรมการ', 'ตั้งคณะกรรมการ'], fields: [] },
  { key: 'procurement_request', label: 'คำขอจัดซื้อ/จัดจ้าง', route: '/sfmis/supplie-setting/withdraw-confirm', aliases: ['คำขอจัดซื้อ', 'คำขอจัดจ้าง', 'รับงานจัดซื้อ'], fields: [] },
  { key: 'procurement_docs', label: 'เอกสารจัดซื้อ/ตรวจรับ', route: '/sfmis/supplie-setting/procurement-docs', aliases: ['เอกสารจัดซื้อ', 'พิมพ์ใบสั่งซื้อ', 'ชุดเอกสารตรวจรับ'], fields: [] },
  { key: 'contract', label: 'สัญญา/ส่งมอบ', route: '/sfmis/supplie-setting/contract', aliases: ['ทำสัญญา', 'สัญญาส่งมอบ', 'บันทึกสัญญา'], fields: [] },
  { key: 'receive_parcel', label: 'รับและตรวจรับพัสดุ', route: '/sfmis/receive-parcel', aliases: ['รับพัสดุ', 'ตรวจรับพัสดุ', 'บันทึกตรวจรับ'], fields: [] },
  { key: 'supplies', label: 'บัญชีวัสดุ', route: '/sfmis/supplies', aliases: ['บัญชีวัสดุ', 'ทะเบียนวัสดุ', 'เบิกวัสดุ'], fields: [] },
  { key: 'generate_check', label: 'ออกเช็ค', route: '/sfmis/pay-menu/generate-check', aliases: ['ออกเช็ค', 'สร้างเช็ค', 'พิมพ์เช็ค'], fields: [] },
  { key: 'daily_balance', label: 'เงินคงเหลือประจำวัน', route: '/sfmis/financial-report/daily-balance', aliases: ['เงินคงเหลือประจำวัน', 'ปิดยอดประจำวัน', 'รายงานสิ้นวัน'], fields: [] },
  { key: 'monthly_submission', label: 'รายงานประจำเดือน', route: '/sfmis/financial-report/monthly-submission', aliases: ['รายงานประจำเดือน', 'นำส่งรายเดือน'], fields: [] },
  { key: 'work_alerts', label: 'งานค้างและคำเตือน', route: '/sfmis/work-alerts', aliases: ['งานค้าง', 'งานเร่งด่วน', 'คำเตือน', 'ความเสี่ยง'], fields: [] },
];

@Injectable()
export class AssistantCommandService {
  private readonly logger = new Logger(AssistantCommandService.name);

  constructor(private readonly ai: AiRouterService) {}

  async interpret(dto: AssistantCommandDto): Promise<AssistantCommandResult> {
    const current = TASKS.find((t) => t.key === dto.task_key);
    // เดาคำใกล้เคียงจากข้อความ (ใช้ทั้งช่วยจับงาน และเสนอ did-you-mean)
    const suggestions = current ? [] : suggestTerms(dto.message, { limit: 3 });
    const fallbackTask = current ?? this.matchTask(dto.message, dto.current_path, suggestions);
    const previousDraft = this.cleanDraft(dto.draft ?? {});

    let parsed: Record<string, unknown> | null = null;
    try {
      const response = await this.ai.chat(
        'merge',
        [{ role: 'user', content: dto.message } satisfies ChatMessage],
        this.systemPrompt(fallbackTask, previousDraft, dto.budget_year, dto.current_path),
      );
      parsed = this.extractJson(response.content);
    } catch (error) {
      this.logger.warn(`assistant command ใช้ rule fallback: ${(error as Error).message}`);
    }

    const selected = current
      ?? TASKS.find((t) => t.key === String(parsed?.task_key ?? ''))
      ?? fallbackTask;

    if (!selected) {
      const didYouMean = suggestions.length
        ? `\nคุณหมายถึง ${suggestions.map((s) => `“${s.canonical}”`).join(' หรือ ')} ใช่ไหมครับ — กดเลือกได้เลย`
        : '';
      return this.result({
        phase: 'clarify',
        message:
          'ต้องการให้ช่วยทำงานใดครับ เช่น เพิ่มโครงการ รับเงิน สร้างใบสำคัญจ่าย หรือตรวจงานค้าง' +
          didYouMean,
        source: parsed ? 'ai' : 'rule',
        suggested_terms: suggestions,
      });
    }

    const aiFields = this.cleanFields(selected, parsed?.fields);
    const ruleFields = this.extractCommonFields(selected, dto.message);
    const draft = { ...previousDraft, ...ruleFields, ...aiFields };
    const missing = selected.fields
      .filter((field) => field.required && this.isMissing(draft[field.key]))
      .map((field) => ({
        field: field.key,
        label: field.label,
        question: `กรุณาระบุ${field.label}`,
      }));

    // ถามข้อมูลที่ขาดได้เพียงครั้งเดียว (ครั้งแรกที่ระบุงานได้)
    // ถ้า dto.task_key มีค่าแล้ว = ผู้ใช้ตอบคำถามมาแล้ว → ข้ามไป prepare ทันที
    const isFollowUp = !!dto.task_key;
    if (missing.length > 0 && !isFollowUp) {
      return {
        phase: 'clarify',
        message: `ก่อนพาไปหน้า “${selected.label}” ขอข้อมูลเพิ่มอีกนิดนึงครับ\n${missing.map((m, i) => `${i + 1}. ${m.question}`).join('\n')}\n(ข้อมูลไหนยังไม่มีสามารถข้ามได้ — ผมจะพาไปหน้ากรอกข้อมูลแล้วแจ้งรายการที่เหลือ)`,
        task_key: selected.key,
        task_label: selected.label,
        route: selected.route,
        open_button: selected.open_button ?? null,
        draft,
        field_labels: Object.fromEntries(selected.fields.map((field) => [field.key, field.label])),
        missing_fields: missing,
        suggested_terms: [],
        source: parsed ? 'ai' : 'rule',
        safety: { can_save: false, requires_user_review: true },
      };
    }

    const phase = selected.fields.length ? 'prepare' : 'navigate';
    const missingLabels = missing.map((m) => m.label);
    return {
      phase,
      message: selected.fields.length
        ? missing.length > 0
          ? `กำลังพาไปหน้า “${selected.label}” — ข้อมูลที่ได้บางส่วน จะมี popup แจ้งรายการที่ต้องกรอกเพิ่มเมื่อถึงหน้านั้น\n⚠️ ${missingLabels.join(', ')} ยังไม่ครบ กรุณากรอกในฟอร์มแล้วกดบันทึกด้วยตนเอง`
          : `ข้อมูลครบแล้ว — กำลังพาไปหน้า “${selected.label}” แล้วกรอกข้อมูลลงแบบฟอร์มไว้ให้\n⚠️ กรุณาตรวจสอบความถูกต้องในฟอร์ม แล้วกดปุ่มบันทึก/ยืนยันด้วยตนเอง`
        : `กำลังพาไปหน้า “${selected.label}”`,
      task_key: selected.key,
      task_label: selected.label,
      route: selected.route,
      open_button: selected.open_button ?? null,
      draft,
      field_labels: Object.fromEntries(selected.fields.map((field) => [field.key, field.label])),
      missing_fields: missing,
      suggested_terms: [],
      source: parsed ? 'ai' : 'rule',
      safety: { can_save: false, requires_user_review: true },
    };
  }

  private result(
    input: Pick<AssistantCommandResult, 'phase' | 'message' | 'source'> &
      Partial<Pick<AssistantCommandResult, 'suggested_terms'>>,
  ): AssistantCommandResult {
    const { suggested_terms, ...rest } = input;
    return {
      ...rest,
      task_key: null,
      task_label: null,
      route: null,
      open_button: null,
      draft: {},
      field_labels: {},
      missing_fields: [],
      suggested_terms: suggested_terms ?? [],
      safety: { can_save: false, requires_user_review: true },
    };
  }

  private systemPrompt(
    current: AssistantTask | undefined,
    draft: Record<string, unknown>,
    budgetYear: string,
    currentPath?: string,
  ): string {
    const catalog = TASKS.map((task) => ({
      key: task.key,
      label: task.label,
      route: task.route,
      aliases: task.aliases,
      fields: task.fields,
    }));
    return `คุณเป็นตัวแปลคำสั่งงานของระบบ SFMIS ภาษาไทย
หน้าที่มีเพียงเลือกงานและสกัดข้อมูลสำหรับเตรียมแบบฟอร์ม ห้ามสั่งบันทึก ห้ามอนุมัติ ห้ามสร้าง/แก้ไข/ลบข้อมูล
ตอบ JSON อย่างเดียว: {"task_key":string|null,"fields":object}
เลือก task_key จาก catalog เท่านั้น ฟิลด์ต้องเป็น key ที่กำหนดของ task เท่านั้น
ถ้าผู้ใช้กำลังตอบคำถามต่อเนื่อง ให้ใช้ task ปัจจุบันและรวมความหมายกับ draft เดิม
วันที่ต้องเป็น YYYY-MM-DD ค.ศ. แปลง พ.ศ. เป็น ค.ศ. จำนวนเงินเป็นตัวเลขไม่ใส่ comma
ปีงบประมาณ พ.ศ. ${budgetYear}; หน้าปัจจุบัน ${currentPath ?? '-'}
task ปัจจุบัน: ${current?.key ?? '-'}
draft เดิม: ${JSON.stringify(draft)}
catalog: ${JSON.stringify(catalog)}`;
  }

  private matchTask(
    message: string,
    currentPath?: string,
    suggestions: TermSuggestion[] = [],
  ): AssistantTask | undefined {
    const text = normalizeThai(message);

    // boost จากอภิธานศัพท์: คำที่เดาได้ซึ่งผูกกับงาน (เช่น "ค่าเดินทาง" → travel_reimbursement)
    const taskBoost = new Map<string, number>();
    for (const s of suggestions) {
      if (!s.relatedTask) continue;
      taskBoost.set(s.relatedTask, Math.max(taskBoost.get(s.relatedTask) ?? 0, s.score * 8));
    }

    let winner: { task: AssistantTask; score: number } | undefined;
    for (const task of TASKS) {
      let score = currentPath === task.route ? 2 : 0;
      score += taskBoost.get(task.key) ?? 0;
      for (const alias of task.aliases) {
        const norm = normalizeThai(alias);
        if (!norm) continue;
        if (text.includes(norm)) {
          score += norm.length; // ตรงเป๊ะ
        } else if (norm.length >= 4 && fuzzyIncludes(text, norm, 0.82)) {
          score += norm.length * 0.6; // ทนคำสะกดผิดเล็กน้อย
        }
      }
      if (score > 0 && (!winner || score > winner.score)) winner = { task, score };
    }
    return winner?.task;
  }

  private cleanFields(task: AssistantTask, value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const raw = value as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    for (const def of task.fields) {
      if (!(def.key in raw)) continue;
      const clean = this.cleanValue(raw[def.key], def.type);
      if (!this.isMissing(clean)) fields[def.key] = clean;
    }
    return fields;
  }

  private cleanDraft(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .filter(([key]) => key.length <= 80)
        .map(([key, val]) => [key, typeof val === 'string' ? val.slice(0, 1000) : val]),
    );
  }

  private cleanValue(value: unknown, type: FieldType): unknown {
    if (type === 'number') {
      const n = Number(String(value ?? '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    if (type === 'date') {
      const s = String(value ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    if (typeof value === 'number') return value;
    const s = String(value ?? '').trim();
    return s ? s.slice(0, 1000) : null;
  }

  private extractCommonFields(task: AssistantTask, message: string): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    const amountDef = task.fields.find((f) => ['amount', 'proj_budget', 'pp_total_budget', 'receiveList.0.prd_budget'].includes(f.key));
    const amount = message.match(/(?:วงเงิน|จำนวน|ยอด|ราคา)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:บาท|บ\.)/i);
    if (amountDef && amount) fields[amountDef.key] = Number(amount[1].replace(/,/g, ''));
    const dates = this.extractDates(message);
    const dateFields = task.fields.filter((f) => f.type === 'date');
    dates.forEach((date, index) => {
      if (dateFields[index]) fields[dateFields[index].key] = date;
    });
    return fields;
  }

  private extractDates(message: string): string[] {
    const found: string[] = [];
    const re = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(message)) !== null) {
      let year = Number(match[3]);
      if (year < 100) year += 2500;
      if (year >= 2400) year -= 543;
      found.push(`${year}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`);
    }
    return found;
  }

  private extractJson(content: string): Record<string, unknown> | null {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private isMissing(value: unknown): boolean {
    return value === undefined || value === null || value === '' || value === 0;
  }
}
