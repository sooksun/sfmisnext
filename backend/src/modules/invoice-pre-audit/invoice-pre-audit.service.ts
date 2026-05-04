import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoicePreAudit } from './entities/invoice-pre-audit.entity';

const RESULT_NAMES: Record<number, string> = {
  1: 'ผ่านการตรวจ',
  2: 'ส่งคืนแก้ไข',
  3: 'ไม่ผ่าน',
};

@Injectable()
export class InvoicePreAuditService {
  constructor(
    @InjectRepository(InvoicePreAudit)
    private readonly ipaRepo: Repository<InvoicePreAudit>,
  ) {}

  async loadByRw(rwId: number) {
    const items = await this.ipaRepo.find({
      where: { rwId, del: 0 },
      order: { ipaId: 'DESC' },
    });
    return items.map((a) => ({
      ipa_id: a.ipaId,
      rw_id: a.rwId,
      auditor_id: a.auditorId,
      auditor_name: a.auditorName,
      audit_date: a.auditDate,
      result: a.result,
      result_name: RESULT_NAMES[a.result] ?? '',
      checklist: a.checklist ? JSON.parse(a.checklist) : null,
      issues: a.issues,
      remarks: a.remarks,
      create_date: a.createDate,
    }));
  }

  async audit(dto: any) {
    const checklist = Array.isArray(dto.checklist)
      ? JSON.stringify(dto.checklist)
      : null;
    const a = this.ipaRepo.create({
      rwId: dto.rw_id,
      scId: dto.sc_id,
      auditorId: dto.auditor_id,
      auditorName: dto.auditor_name ?? null,
      auditDate: dto.audit_date,
      result: dto.result,
      checklist,
      issues: dto.issues ?? null,
      remarks: dto.remarks ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.ipaRepo.save(a);
    return {
      flag: true,
      ms: `บันทึกการตรวจฎีกา — ${RESULT_NAMES[dto.result] ?? ''} เรียบร้อย`,
      ipa_id: a.ipaId,
    };
  }

  async getStatus(rwId: number) {
    const latest = await this.ipaRepo.findOne({
      where: { rwId, del: 0 },
      order: { ipaId: 'DESC' },
    });
    if (!latest) return { audited: false };
    return {
      audited: true,
      result: latest.result,
      result_name: RESULT_NAMES[latest.result] ?? '',
      auditor_id: latest.auditorId,
      auditor_name: latest.auditorName,
      audit_date: latest.auditDate,
      can_submit: latest.result === 1,
    };
  }
}
