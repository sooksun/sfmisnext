import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SarReport } from './entities/sar-report.entity';

const STATUS_NAMES: Record<number, string> = {
  0: 'ร่าง',
  1: 'กำลังจัดทำ',
  2: 'รอคณะกรรมการสถานศึกษา',
  3: 'อนุมัติแล้ว',
  4: 'ส่งต้นสังกัดแล้ว',
  9: 'ยกเลิก',
};

function levelFromScore(score: number): string {
  if (score >= 4.5) return 'ยอดเยี่ยม';
  if (score >= 3.5) return 'ดีเลิศ';
  if (score >= 2.5) return 'ดี';
  if (score >= 1.5) return 'ปานกลาง';
  return 'กำลังพัฒนา';
}

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class SarReportService {
  constructor(
    @InjectRepository(SarReport)
    private readonly sarRepo: Repository<SarReport>,
  ) {}

  async load(scId: number) {
    const items = await this.sarRepo.find({
      where: { scId, del: 0 },
      order: { budgetYear: 'DESC', sarId: 'DESC' },
    });
    return {
      data: items.map((s) => ({
        sar_id: s.sarId,
        budget_year: s.budgetYear,
        academic_year: s.academicYear,
        title: s.title,
        overall_score: toNum(s.overallScore),
        overall_level: s.overallLevel,
        status: s.status,
        status_name: STATUS_NAMES[s.status] ?? '',
        submitted_date: s.submittedDate,
        file_url: s.fileUrl,
      })),
      count: items.length,
    };
  }

  async get(sarId: number) {
    const s = await this.sarRepo.findOne({ where: { sarId, del: 0 } });
    if (!s) return null;
    return {
      ...s,
      sections: s.sections ? JSON.parse(s.sections) : [],
      overall_score: toNum(s.overallScore),
      status_name: STATUS_NAMES[s.status] ?? '',
    };
  }

  async add(dto: any) {
    const existing = await this.sarRepo.findOne({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
    });
    if (existing) {
      return { flag: false, ms: `มีรายงาน SAR ปี ${dto.budget_year} อยู่แล้ว` };
    }
    const sections = Array.isArray(dto.sections)
      ? JSON.stringify(dto.sections)
      : null;
    const s = this.sarRepo.create({
      scId: dto.sc_id,
      budgetYear: dto.budget_year,
      academicYear: dto.academic_year,
      title: dto.title ?? `รายงาน SAR ปีการศึกษา ${dto.academic_year}`,
      sections,
      overallScore: 0,
      summary: dto.summary ?? null,
      strengths: dto.strengths ?? null,
      improvements: dto.improvements ?? null,
      nextTargets: dto.next_targets ?? null,
      status: 1,
      upBy: dto.up_by,
      del: 0,
    });
    await this.sarRepo.save(s);
    return { flag: true, ms: 'สร้างรายงาน SAR เรียบร้อย', sar_id: s.sarId };
  }

  async update(dto: any) {
    const s = await this.sarRepo.findOne({
      where: { sarId: dto.sar_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (s.status === 3 || s.status === 4)
      return { flag: false, ms: 'รายงานถูกอนุมัติแล้ว ไม่สามารถแก้ไขได้' };

    if (dto.title !== undefined) s.title = dto.title;
    if (dto.summary !== undefined) s.summary = dto.summary;
    if (dto.strengths !== undefined) s.strengths = dto.strengths;
    if (dto.improvements !== undefined) s.improvements = dto.improvements;
    if (dto.next_targets !== undefined) s.nextTargets = dto.next_targets;
    if (dto.file_url !== undefined) s.fileUrl = dto.file_url;

    if (Array.isArray(dto.sections)) {
      s.sections = JSON.stringify(dto.sections);
      const scores = dto.sections
        .map((x: any) => Number(x.score || 0))
        .filter((n: number) => n > 0);
      if (scores.length > 0) {
        const avg =
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        s.overallScore = Math.round(avg * 100) / 100;
        s.overallLevel = levelFromScore(avg);
      }
    }

    s.upBy = dto.up_by;
    await this.sarRepo.save(s);
    return { flag: true, ms: 'บันทึกรายงานเรียบร้อย' };
  }

  async submitForApproval(sarId: number, upBy: number) {
    const s = await this.sarRepo.findOne({ where: { sarId, del: 0 } });
    if (!s) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (s.status !== 1) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    s.status = 2;
    s.upBy = upBy;
    await this.sarRepo.save(s);
    return { flag: true, ms: 'ส่งคณะกรรมการสถานศึกษาเรียบร้อย' };
  }

  async approve(dto: {
    sar_id: number;
    approved_by: number;
    approved_date: string;
  }) {
    const s = await this.sarRepo.findOne({
      where: { sarId: dto.sar_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (s.status !== 2) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    s.status = 3;
    s.approvedBy = dto.approved_by;
    s.approvedDate = dto.approved_date;
    s.upBy = dto.approved_by;
    await this.sarRepo.save(s);
    return { flag: true, ms: 'อนุมัติรายงานเรียบร้อย' };
  }

  async submitToDivision(sarId: number, submittedDate: string, upBy: number) {
    const s = await this.sarRepo.findOne({ where: { sarId, del: 0 } });
    if (!s) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (s.status !== 3) return { flag: false, ms: 'ยังไม่อนุมัติ' };
    s.status = 4;
    s.submittedDate = submittedDate;
    s.upBy = upBy;
    await this.sarRepo.save(s);
    return { flag: true, ms: 'ส่งต้นสังกัดเรียบร้อย' };
  }

  async remove(sarId: number, upBy: number) {
    const s = await this.sarRepo.findOne({ where: { sarId, del: 0 } });
    if (!s) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (s.status >= 3)
      return { flag: false, ms: 'รายงานอนุมัติ/ส่งแล้ว ลบไม่ได้' };
    s.del = 1;
    s.upBy = upBy;
    await this.sarRepo.save(s);
    return { flag: true, ms: 'ลบเรียบร้อย' };
  }
}
