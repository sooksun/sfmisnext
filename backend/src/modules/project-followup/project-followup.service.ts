import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectFollowup } from './entities/project-followup.entity';

const PERIOD_NAMES: Record<number, string> = {
  1: 'ไตรมาสที่ 1',
  2: 'ไตรมาสที่ 2',
  3: 'ไตรมาสที่ 3',
  4: 'ไตรมาสที่ 4',
  5: 'สรุปปลายปี',
};
const STATUS_NAMES: Record<number, string> = {
  1: 'ร่าง',
  2: 'ส่งแล้ว',
  3: 'ผอ.รับทราบ',
  9: 'ยกเลิก',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class ProjectFollowupService {
  constructor(
    @InjectRepository(ProjectFollowup)
    private readonly pfRepo: Repository<ProjectFollowup>,
  ) {}

  async loadByProject(projectId: number) {
    const items = await this.pfRepo.find({
      where: { projectId, del: 0 },
      order: { reportDate: 'ASC', pfId: 'ASC' },
    });
    return items.map((p) => ({
      pf_id: p.pfId,
      project_id: p.projectId,
      budget_year: p.budgetYear,
      report_period: p.reportPeriod,
      report_period_name: PERIOD_NAMES[p.reportPeriod] ?? '',
      report_date: p.reportDate,
      percent_complete: toNum(p.percentComplete),
      actual_amount: toNum(p.actualAmount),
      output_qty: p.outputQty,
      output_quality: p.outputQuality,
      outcome: p.outcome,
      target_group_qty: p.targetGroupQty,
      satisfaction_percent: toNum(p.satisfactionPercent),
      problems: p.problems,
      solutions: p.solutions,
      next_plan: p.nextPlan,
      photo_urls: p.photoUrls ? JSON.parse(p.photoUrls) : [],
      status: p.status,
      status_name: STATUS_NAMES[p.status] ?? '',
      acknowledged_by: p.acknowledgedBy,
      acknowledged_date: p.acknowledgedDate,
    }));
  }

  async add(dto: any) {
    const photoUrls =
      Array.isArray(dto.photo_urls) && dto.photo_urls.length
        ? JSON.stringify(dto.photo_urls)
        : null;

    const p = this.pfRepo.create({
      projectId: dto.project_id,
      scId: dto.sc_id,
      syId: dto.sy_id ?? null,
      budgetYear: dto.budget_year,
      reportPeriod: dto.report_period ?? 1,
      reportDate: dto.report_date,
      percentComplete: dto.percent_complete ?? 0,
      actualAmount: dto.actual_amount ?? 0,
      outputQty: dto.output_qty ?? null,
      outputQuality: dto.output_quality ?? null,
      outcome: dto.outcome ?? null,
      targetGroupQty: dto.target_group_qty ?? 0,
      satisfactionPercent: dto.satisfaction_percent ?? 0,
      problems: dto.problems ?? null,
      solutions: dto.solutions ?? null,
      nextPlan: dto.next_plan ?? null,
      photoUrls,
      reportedBy: dto.reported_by ?? dto.up_by,
      status: dto.status ?? 1,
      upBy: dto.up_by,
      del: 0,
    });
    await this.pfRepo.save(p);
    return { flag: true, ms: 'บันทึกรายงานผลเรียบร้อยแล้ว' };
  }

  async update(dto: any) {
    const p = await this.pfRepo.findOne({ where: { pfId: dto.pf_id, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (p.status === 3)
      return { flag: false, ms: 'ผอ.รับทราบแล้ว ไม่สามารถแก้ไขได้' };

    const map: Record<string, keyof ProjectFollowup> = {
      report_period: 'reportPeriod',
      report_date: 'reportDate',
      percent_complete: 'percentComplete',
      actual_amount: 'actualAmount',
      output_qty: 'outputQty',
      output_quality: 'outputQuality',
      outcome: 'outcome',
      target_group_qty: 'targetGroupQty',
      satisfaction_percent: 'satisfactionPercent',
      problems: 'problems',
      solutions: 'solutions',
      next_plan: 'nextPlan',
    };
    for (const k of Object.keys(map)) {
      if (dto[k] !== undefined) (p as any)[map[k]] = dto[k];
    }
    if (Array.isArray(dto.photo_urls)) {
      p.photoUrls = JSON.stringify(dto.photo_urls);
    }
    p.upBy = dto.up_by;
    await this.pfRepo.save(p);
    return { flag: true, ms: 'แก้ไขรายงานเรียบร้อย' };
  }

  async submit(pfId: number, upBy: number) {
    const p = await this.pfRepo.findOne({ where: { pfId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (p.status !== 1) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    p.status = 2;
    p.upBy = upBy;
    await this.pfRepo.save(p);
    return { flag: true, ms: 'ส่งรายงานเรียบร้อย' };
  }

  async acknowledge(dto: {
    pf_id: number;
    acknowledged_by: number;
    acknowledged_date: string;
  }) {
    const p = await this.pfRepo.findOne({ where: { pfId: dto.pf_id, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (p.status !== 2) return { flag: false, ms: 'รายงานยังไม่ได้ส่ง' };
    p.status = 3;
    p.acknowledgedBy = dto.acknowledged_by;
    p.acknowledgedDate = dto.acknowledged_date;
    p.upBy = dto.acknowledged_by;
    await this.pfRepo.save(p);
    return { flag: true, ms: 'รับทราบรายงานเรียบร้อย' };
  }

  async remove(pfId: number, upBy: number) {
    const p = await this.pfRepo.findOne({ where: { pfId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบรายงาน' };
    if (p.status === 3) return { flag: false, ms: 'ผอ.รับทราบแล้ว ลบไม่ได้' };
    p.del = 1;
    p.upBy = upBy;
    await this.pfRepo.save(p);
    return { flag: true, ms: 'ลบเรียบร้อย' };
  }

  async summary(scId: number, budgetYear: number) {
    const items = await this.pfRepo.find({
      where: { scId, budgetYear, del: 0 },
      order: { projectId: 'ASC', reportDate: 'DESC' },
    });
    const byProject: Record<number, any> = {};
    for (const p of items) {
      if (!byProject[p.projectId]) {
        byProject[p.projectId] = {
          project_id: p.projectId,
          latest_percent: toNum(p.percentComplete),
          latest_actual: toNum(p.actualAmount),
          latest_date: p.reportDate,
          latest_status: p.status,
          report_count: 0,
        };
      }
      byProject[p.projectId].report_count++;
    }
    return {
      data: Object.values(byProject),
      count: Object.keys(byProject).length,
    };
  }
}
