import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAssessment } from './entities/financial-assessment.entity';
import { FinancialAssessmentItem } from './entities/financial-assessment-item.entity';
import { FinanceAnnualAttestation } from './entities/finance-annual-attestation.entity';
import {
  ASSESS_ITEMS,
  ASSESS_TOPICS,
  assessLevel,
} from './catalog/assessment-catalog';

const MODE_BY_CODE = new Map(ASSESS_ITEMS.map((d) => [d.code, d.mode]));
import {
  SaveAssessmentDto,
  ConfirmAssessmentDto,
} from './dto/financial-assessment.dto';
import { RuleEngineService } from './rules/rule-engine.service';
import { type JwtUser } from '../../common/utils/tenant-guard';

@Injectable()
export class FinancialAssessmentService {
  constructor(
    @InjectRepository(FinancialAssessment)
    private readonly faRepo: Repository<FinancialAssessment>,
    @InjectRepository(FinancialAssessmentItem)
    private readonly itemRepo: Repository<FinancialAssessmentItem>,
    @InjectRepository(FinanceAnnualAttestation)
    private readonly attestRepo: Repository<FinanceAnnualAttestation>,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  /** บันทึกข้อมูลรับรองประจำปี (ความเห็นชอบ กก. — ข้อ 1.4) */
  async saveAttestation(dto: {
    sc_id: number;
    sy_id: number;
    budget_year: string;
    plan_committee_date?: string | null;
    plan_committee_doc_no?: string | null;
    up_by?: number;
  }) {
    let row = await this.attestRepo.findOne({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
    });
    if (!row) {
      row = this.attestRepo.create({
        scId: dto.sc_id,
        syId: dto.sy_id,
        budgetYear: dto.budget_year,
      });
    }
    if (dto.plan_committee_date !== undefined)
      row.planCommitteeDate = dto.plan_committee_date || null;
    if (dto.plan_committee_doc_no !== undefined)
      row.planCommitteeDocNo = dto.plan_committee_doc_no || null;
    row.upBy = dto.up_by ?? row.upBy;
    await this.attestRepo.save(row);
    return { flag: true, ms: 'บันทึกข้อมูลความเห็นชอบแผนเรียบร้อย' };
  }

  /**
   * รัน Rule Engine ประเมินอัตโนมัติจากข้อมูลโมดูลเดิม
   * - evalMode 'auto'    → เขียนทับ answer ตามผลที่ตรวจได้ (yes/no/na)
   * - evalMode 'prefill' → บันทึกเป็นข้อเสนอ (autoResult/autoDetail) ไม่แตะ answer
   * - result 'unknown'   → ไม่แตะ answer
   */
  async runAuto(faId: number) {
    const head = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!head) throw new NotFoundException('ไม่พบชุดประเมิน');
    if (head.status >= 2)
      return { flag: false, ms: 'ชุดประเมินถูกยืนยันแล้ว แก้ไขไม่ได้', applied: 0 };

    const evalMap = await this.ruleEngine.evaluate({
      scId: head.scId,
      syId: head.syId,
      budgetYear: head.budgetYear ?? '',
    });

    const rows = await this.itemRepo.find({
      where: { assessmentId: head.faId },
    });
    let applied = 0;
    for (const row of rows) {
      const ev = evalMap[row.itemCode];
      if (!ev) continue;
      row.autoResult = ev.result;
      row.autoDetail = ev.detail;
      // ใช้ mode จาก catalog ปัจจุบัน (กัน evalMode เก่าค้างใน row จาก catalog เวอร์ชันก่อน)
      const mode = MODE_BY_CODE.get(row.itemCode) ?? row.evalMode;
      row.evalMode = mode;
      // 'auto' → เขียนทับ yes/no/na ; ทุกโหมด → ถ้าเป็น 'na' (ข้อเท็จจริง ไม่เกี่ยวข้อง) ลงให้เลย
      const applyYesNo = mode === 'auto' && (ev.result === 'yes' || ev.result === 'no');
      const applyNa = ev.result === 'na';
      if (applyYesNo || applyNa) {
        row.answer = ev.result;
        row.score = ev.result === 'yes' ? row.weight : 0;
        applied++;
      }
    }
    await this.itemRepo.save(rows);
    await this.recompute(head);

    return {
      flag: true,
      ms: `ประเมินอัตโนมัติเรียบร้อย (ปรับคำตอบให้ ${applied} ข้อ) โปรดตรวจทานก่อนยืนยัน`,
      applied,
    };
  }

  /**
   * โหลดชุดประเมินของปีงบ — ถ้ายังไม่มี สร้าง draft + 52 ข้อจาก catalog
   */
  async loadAssessment(scId: number, syId: number, budgetYear: string) {
    let head = await this.faRepo.findOne({
      where: { scId, budgetYear, del: 0 },
    });

    if (!head) {
      head = await this.faRepo.save(
        this.faRepo.create({
          scId,
          syId,
          budgetYear,
          status: 1,
          maxScore: 100,
          level: 1,
        }),
      );
      const items = ASSESS_ITEMS.map((def) =>
        this.itemRepo.create({
          assessmentId: head!.faId,
          itemCode: def.code,
          topicNo: def.topic,
          answer: 'no',
          weight: def.weight,
          score: 0,
          evalMode: def.mode,
        }),
      );
      await this.itemRepo.save(items);
    }

    return this.buildView(head.faId);
  }

  /**
   * ประกอบ response: head + items (merge catalog metadata) + สรุปคะแนนรายประเด็น
   */
  private async buildView(faId: number) {
    const head = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!head) throw new NotFoundException('ไม่พบชุดประเมิน');
    const attest = await this.attestRepo.findOne({
      where: { scId: head.scId, budgetYear: head.budgetYear ?? '', del: 0 },
    });
    const rows = await this.itemRepo.find({
      where: { assessmentId: faId },
    });
    const byCode = new Map(rows.map((r) => [r.itemCode, r]));

    const items = ASSESS_ITEMS.map((def) => {
      const r = byCode.get(def.code);
      return {
        item_code: def.code,
        topic_no: def.topic,
        label: def.label,
        weight: def.weight,
        mode: def.mode,
        na_allowed: def.naAllowed,
        evidence: def.evidence ?? null,
        answer: r?.answer ?? 'no',
        score: r?.score ?? 0,
        auto_result: r?.autoResult ?? null,
        auto_detail: r?.autoDetail ?? null,
        attachment_id: r?.attachmentId ?? null,
        note: r?.note ?? null,
      };
    });

    const topics = ASSESS_TOPICS.map((t) => {
      const ti = items.filter((i) => i.topic_no === t.no);
      const earned = ti.reduce((s, i) => s + (i.score || 0), 0);
      const possible = ti
        .filter((i) => i.answer !== 'na')
        .reduce((s, i) => s + i.weight, 0);
      return {
        no: t.no,
        name: t.name,
        max: t.max,
        earned: round2(earned),
        possible: round2(possible),
      };
    });

    return {
      head: {
        fa_id: head.faId,
        sc_id: head.scId,
        sy_id: head.syId,
        budget_year: head.budgetYear,
        as_of_date: head.asOfDate,
        student_count: head.studentCount,
        total_score: head.totalScore,
        max_score: head.maxScore,
        percent: head.percent,
        level: head.level,
        level_label: assessLevel(head.percent).label,
        status: head.status,
        confirmed_by: head.confirmedBy,
        confirmed_at: head.confirmedAt,
        note: head.note,
        plan_committee_date: attest?.planCommitteeDate ?? null,
        plan_committee_doc_no: attest?.planCommitteeDocNo ?? null,
      },
      topics,
      items,
    };
  }

  /**
   * บันทึก header + รายข้อ → คำนวณคะแนนใหม่
   */
  async saveAssessment(dto: SaveAssessmentDto) {
    const head = await this.faRepo.findOne({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
    });
    if (!head) throw new NotFoundException('ไม่พบชุดประเมิน (โหลดก่อนบันทึก)');
    if (head.status >= 2) {
      return { flag: false, ms: 'ชุดประเมินถูกยืนยันแล้ว แก้ไขไม่ได้' };
    }

    if (dto.as_of_date !== undefined) head.asOfDate = dto.as_of_date;
    if (dto.student_count !== undefined) head.studentCount = dto.student_count;
    if (dto.note !== undefined) head.note = dto.note;
    head.upBy = dto.up_by ?? head.upBy;

    const weightOf = new Map(ASSESS_ITEMS.map((d) => [d.code, d.weight]));

    if (dto.items?.length) {
      const rows = await this.itemRepo.find({
        where: { assessmentId: head.faId },
      });
      const byCode = new Map(rows.map((r) => [r.itemCode, r]));
      for (const inc of dto.items) {
        const row = byCode.get(inc.item_code);
        if (!row) continue;
        row.answer = inc.answer;
        if (inc.note !== undefined) row.note = inc.note;
        if (inc.attachment_id !== undefined)
          row.attachmentId = inc.attachment_id;
        const w = weightOf.get(inc.item_code) ?? 0;
        row.score = inc.answer === 'yes' ? w : 0;
      }
      await this.itemRepo.save(rows);
    }

    await this.recompute(head);
    return { flag: true, ms: 'บันทึกผลการประเมินเรียบร้อย' };
  }

  /**
   * คำนวณคะแนนรวม + ฐานหลังตัด N/A + ระดับ
   */
  private async recompute(head: FinancialAssessment) {
    const rows = await this.itemRepo.find({
      where: { assessmentId: head.faId },
    });
    let total = 0;
    let max = 0;
    for (const r of rows) {
      if (r.answer === 'na') continue; // ตัดออกจากฐานคะแนน
      max += r.weight;
      if (r.answer === 'yes') total += r.weight;
    }
    head.totalScore = round2(total);
    head.maxScore = round2(max);
    head.percent = max > 0 ? round2((total / max) * 100) : 0;
    head.level = assessLevel(head.percent).level;
    await this.faRepo.save(head);
  }

  async confirm(dto: ConfirmAssessmentDto, user: JwtUser) {
    const head = await this.faRepo.findOne({
      where: { faId: dto.fa_id, del: 0 },
    });
    if (!head) throw new NotFoundException('ไม่พบชุดประเมิน');
    if (head.status >= 2) return { flag: false, ms: 'ยืนยันไปแล้ว' };
    await this.recompute(head);
    head.status = 2;
    head.confirmedBy = dto.up_by ?? user.admin_id;
    head.confirmedAt = new Date();
    await this.faRepo.save(head);
    return { flag: true, ms: 'ยืนยันผลการประเมินเรียบร้อย' };
  }

  async markSubmitted(faId: number) {
    const head = await this.faRepo.findOne({ where: { faId, del: 0 } });
    if (!head) throw new NotFoundException('ไม่พบชุดประเมิน');
    if (head.status < 2)
      return { flag: false, ms: 'ต้องยืนยันก่อนจึงทำเครื่องหมายส่งเขตได้' };
    head.status = 3;
    await this.faRepo.save(head);
    return { flag: true, ms: 'บันทึกสถานะส่งเขตพื้นที่ฯ แล้ว' };
  }

  /** ข้อมูลสำหรับ Export Excel (แบบ 2544-2/3) */
  async exportData(faId: number) {
    return this.buildView(faId);
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
