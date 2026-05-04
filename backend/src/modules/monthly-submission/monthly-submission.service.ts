import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlySubmission } from './entities/monthly-submission.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  SaveSubmissionDto,
  SubmitDto,
  ConfirmDto,
} from './dto/monthly-submission.dto';

const DEFAULT_CHECKLIST = [
  { id: 1, label: 'รายงานเงินคงเหลือประจำวัน' },
  { id: 2, label: 'งบเทียบยอดเงินฝากธนาคาร' },
  { id: 3, label: 'สำเนาสมุดบัญชีธนาคาร' },
  { id: 4, label: 'สำเนาทะเบียนคุมเงิน' },
];

@Injectable()
export class MonthlySubmissionService {
  constructor(
    @InjectRepository(MonthlySubmission)
    private readonly msRepo: Repository<MonthlySubmission>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async loadSubmissions(scId: number, syId: number) {
    const records = await this.msRepo.find({
      where: { scId, syId, del: 0 },
      order: { submitMonth: 'DESC' },
    });

    const today = new Date();

    const data = records.map((r) => {
      let isOverdue = false;
      if (r.status === 1 && r.submitMonth) {
        // Overdue: today > day 5 of month following submit_month
        const [yearStr, monthStr] = r.submitMonth.split('-');
        const yearRaw = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10); // 1-12
        // แปลง BE → CE เพื่อสร้าง Date ที่ถูกต้อง (เช่น 2568 BE → 2025 CE)
        const yearCE = yearRaw >= 2400 ? yearRaw - 543 : yearRaw;
        // next month (CE)
        let nextYear = yearCE;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }
        const deadline = new Date(nextYear, nextMonth - 1, 5, 23, 59, 59);
        isOverdue = today > deadline;
      }
      return {
        ms_id: r.msId,
        sc_id: r.scId,
        sy_id: r.syId,
        submit_month: r.submitMonth,
        status: r.status,
        checklist: r.checklist,
        submitted_at: r.submittedAt,
        submitted_by: r.submittedBy,
        submitted_by_name: r.submittedByName,
        note: r.note,
        create_date: r.createDate,
        update_date: r.updateDate,
        isOverdue,
      };
    });

    return { data, count: data.length };
  }

  async getOrCreate(scId: number, syId: number, submitMonth: string) {
    const existing = await this.msRepo.findOne({
      where: { scId, submitMonth, del: 0 },
    });
    if (existing) {
      return {
        ms_id: existing.msId,
        sc_id: existing.scId,
        sy_id: existing.syId,
        submit_month: existing.submitMonth,
        status: existing.status,
        checklist: existing.checklist,
        submitted_at: existing.submittedAt,
        submitted_by: existing.submittedBy,
        submitted_by_name: existing.submittedByName,
        note: existing.note,
        create_date: existing.createDate,
      };
    }

    const checklist = JSON.stringify(
      DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })),
    );

    const record = this.msRepo.create({
      scId,
      syId,
      submitMonth,
      status: 1,
      checklist,
      del: 0,
      upBy: 0,
    });
    await this.msRepo.save(record);

    return {
      ms_id: record.msId,
      sc_id: record.scId,
      sy_id: record.syId,
      submit_month: record.submitMonth,
      status: record.status,
      checklist: record.checklist,
      submitted_at: record.submittedAt,
      submitted_by: record.submittedBy,
      submitted_by_name: record.submittedByName,
      note: record.note,
      create_date: record.createDate,
    };
  }

  async saveSubmission(dto: SaveSubmissionDto) {
    // upsert by (sc_id, submit_month)
    const existing = await this.msRepo.findOne({
      where: { scId: dto.sc_id, submitMonth: dto.submit_month, del: 0 },
    });

    if (existing) {
      if (existing.status === 3) {
        return { flag: false, ms: 'ไม่สามารถแก้ไขรายการที่ยืนยันแล้ว' };
      }
      existing.checklist = dto.checklist;
      existing.note = dto.note ?? existing.note;
      if (dto.up_by !== undefined) existing.upBy = dto.up_by;
      await this.msRepo.save(existing);
      return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
    }

    const record = this.msRepo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      submitMonth: dto.submit_month,
      status: 1,
      checklist: dto.checklist,
      note: dto.note ?? null,
      upBy: dto.up_by ?? 0,
      del: 0,
    });
    await this.msRepo.save(record);
    return { flag: true, ms: 'บันทึกเรียบร้อยแล้ว' };
  }

  async submitMonth(dto: SubmitDto) {
    const record = await this.msRepo.findOne({
      where: { msId: dto.ms_id, del: 0 },
    });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (record.status === 3)
      return { flag: false, ms: 'ยืนยันแล้ว ไม่สามารถแก้ไขได้' };

    // snapshot submitted_by_name
    let submittedByName: string | null = null;
    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.up_by },
    });
    if (admin) {
      submittedByName = admin.name ?? admin.username ?? null;
    }

    record.status = 2;
    record.submittedAt = new Date();
    record.submittedBy = dto.up_by ?? null;
    record.submittedByName = submittedByName;
    if (dto.up_by !== undefined) record.upBy = dto.up_by;
    await this.msRepo.save(record);
    return { flag: true, ms: 'ส่งรายงานเรียบร้อยแล้ว' };
  }

  async confirmSubmission(dto: ConfirmDto) {
    const record = await this.msRepo.findOne({
      where: { msId: dto.ms_id, del: 0 },
    });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (record.status === 3) return { flag: false, ms: 'ยืนยันแล้ว' };

    record.status = 3;
    if (dto.up_by !== undefined) record.upBy = dto.up_by;
    await this.msRepo.save(record);
    return { flag: true, ms: 'ยืนยันรับรายงานเรียบร้อยแล้ว' };
  }

  async getCurrentMonthAlert(scId: number, syId: number) {
    const records = await this.msRepo.find({
      where: { scId, syId, del: 0 },
    });

    const today = new Date();
    const overdueMonths: string[] = [];

    for (const r of records) {
      if (r.status < 2 && r.submitMonth) {
        const [yearStr, monthStr] = r.submitMonth.split('-');
        const yearRaw = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        // แปลง BE → CE
        const yearCE = yearRaw >= 2400 ? yearRaw - 543 : yearRaw;
        let nextYear = yearCE;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }
        const deadline = new Date(nextYear, nextMonth - 1, 5, 23, 59, 59);
        if (today > deadline) {
          overdueMonths.push(r.submitMonth);
        }
      }
    }

    return {
      hasAlert: overdueMonths.length > 0,
      overdue_months: overdueMonths,
    };
  }
}
