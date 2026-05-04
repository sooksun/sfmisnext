import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractSecurity } from './entities/contract-security.entity';
import { ContractPenalty } from './entities/contract-penalty.entity';

const TYPE_NAMES: Record<number, string> = {
  1: 'หลักประกันซอง',
  2: 'หลักประกันสัญญา',
  3: 'หลักประกันผลงาน',
  4: 'มัดจำ',
};
const FORM_NAMES: Record<number, string> = {
  1: 'เงินสด',
  2: 'แคชเชียร์เช็ค',
  3: 'หนังสือค้ำประกัน',
  4: 'พันธบัตร',
};
const STATUS_NAMES: Record<number, string> = {
  1: 'ถือครอง',
  2: 'คืนแล้ว',
  3: 'ยึด',
  9: 'ยกเลิก',
};

function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.ceil((e - s) / 86400000));
}

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class ContractSecurityService {
  constructor(
    @InjectRepository(ContractSecurity)
    private readonly secRepo: Repository<ContractSecurity>,
    @InjectRepository(ContractPenalty)
    private readonly penRepo: Repository<ContractPenalty>,
  ) {}

  async loadByContract(ctId: number) {
    const items = await this.secRepo.find({
      where: { ctId, del: 0 },
      order: { csId: 'ASC' },
    });
    return items.map((s) => ({
      cs_id: s.csId,
      ct_id: s.ctId,
      security_type: s.securityType,
      security_type_name: TYPE_NAMES[s.securityType] ?? '',
      security_form: s.securityForm,
      security_form_name: FORM_NAMES[s.securityForm] ?? '',
      amount: toNum(s.amount),
      percent_of_contract: toNum(s.percentOfContract),
      bank_name: s.bankName,
      document_no: s.documentNo,
      received_date: s.receivedDate,
      expiry_date: s.expiryDate,
      return_date: s.returnDate,
      return_evidence_no: s.returnEvidenceNo,
      status: s.status,
      status_name: STATUS_NAMES[s.status] ?? '',
      note: s.note,
    }));
  }

  async addSecurity(dto: any) {
    const s = this.secRepo.create({
      ctId: dto.ct_id,
      scId: dto.sc_id,
      securityType: dto.security_type,
      securityForm: dto.security_form ?? 1,
      amount: dto.amount,
      percentOfContract: dto.percent_of_contract ?? 0,
      bankName: dto.bank_name ?? null,
      documentNo: dto.document_no ?? null,
      receivedDate: dto.received_date ?? null,
      expiryDate: dto.expiry_date ?? null,
      status: 1,
      note: dto.note ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.secRepo.save(s);
    return { flag: true, ms: 'บันทึกหลักประกันเรียบร้อยแล้ว' };
  }

  async returnSecurity(dto: {
    cs_id: number;
    return_date: string;
    return_evidence_no?: string;
    note?: string;
    up_by: number;
  }) {
    const s = await this.secRepo.findOne({
      where: { csId: dto.cs_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายการหลักประกัน' };
    if (s.status !== 1)
      return { flag: false, ms: 'หลักประกันนี้ไม่ได้อยู่ในสถานะถือครอง' };

    s.returnDate = dto.return_date;
    s.returnEvidenceNo = dto.return_evidence_no ?? null;
    if (dto.note) s.note = dto.note;
    s.status = 2;
    s.upBy = dto.up_by;
    await this.secRepo.save(s);
    return { flag: true, ms: 'คืนหลักประกันเรียบร้อยแล้ว' };
  }

  async confiscateSecurity(dto: {
    cs_id: number;
    note?: string;
    up_by: number;
  }) {
    const s = await this.secRepo.findOne({
      where: { csId: dto.cs_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายการหลักประกัน' };
    s.status = 3;
    if (dto.note) s.note = dto.note;
    s.upBy = dto.up_by;
    await this.secRepo.save(s);
    return { flag: true, ms: 'บันทึกการยึดหลักประกันเรียบร้อยแล้ว' };
  }

  async removeSecurity(csId: number, upBy: number) {
    const s = await this.secRepo.findOne({ where: { csId, del: 0 } });
    if (!s) return { flag: false, ms: 'ไม่พบรายการ' };
    if (s.status === 2)
      return { flag: false, ms: 'หลักประกันที่คืนแล้วลบไม่ได้' };
    s.del = 1;
    s.upBy = upBy;
    await this.secRepo.save(s);
    return { flag: true, ms: 'ลบเรียบร้อยแล้ว' };
  }

  async calcPenalty(dto: {
    ct_id: number;
    sc_id: number;
    due_date: string;
    actual_delivery_date: string;
    contract_amount: number;
    daily_rate_percent?: number;
    up_by: number;
  }) {
    const daysLate = daysBetween(dto.due_date, dto.actual_delivery_date);
    if (daysLate <= 0) {
      return {
        flag: false,
        ms: 'ไม่มีค่าปรับ เนื่องจากส่งมอบภายในกำหนด',
        days_late: 0,
        penalty_amount: 0,
      };
    }
    const rate = dto.daily_rate_percent ?? 0.1;
    // ตามระเบียบ: ≥ 100 บาท/วัน หรือ rate% ของมูลค่าสัญญา แล้วแต่อย่างใดสูงกว่า
    const byPercent = (dto.contract_amount * rate) / 100;
    const perDay = Math.max(100, byPercent);
    const penalty = Math.round(perDay * daysLate * 100) / 100;

    const p = this.penRepo.create({
      ctId: dto.ct_id,
      scId: dto.sc_id,
      dueDate: dto.due_date,
      actualDeliveryDate: dto.actual_delivery_date,
      daysLate,
      contractAmount: dto.contract_amount,
      dailyRatePercent: rate,
      penaltyAmount: penalty,
      status: 1,
      upBy: dto.up_by,
      del: 0,
    });
    await this.penRepo.save(p);

    return {
      flag: true,
      ms: `คำนวณค่าปรับเรียบร้อย — ล่าช้า ${daysLate} วัน รวม ${penalty.toLocaleString()} บาท`,
      cp_id: p.cpId,
      days_late: daysLate,
      per_day: perDay,
      penalty_amount: penalty,
    };
  }

  async markPenaltyCollected(
    cpId: number,
    collectedDate: string,
    upBy: number,
  ) {
    const p = await this.penRepo.findOne({ where: { cpId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบค่าปรับ' };
    p.status = 3;
    p.collectedDate = collectedDate;
    p.upBy = upBy;
    await this.penRepo.save(p);
    return { flag: true, ms: 'บันทึกการรับชำระค่าปรับเรียบร้อย' };
  }

  async waivePenalty(cpId: number, reason: string, upBy: number) {
    const p = await this.penRepo.findOne({ where: { cpId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบค่าปรับ' };
    p.status = 4;
    p.waivedReason = reason;
    p.upBy = upBy;
    await this.penRepo.save(p);
    return { flag: true, ms: 'ยกเว้นค่าปรับเรียบร้อย' };
  }

  async loadPenalties(ctId: number) {
    const items = await this.penRepo.find({
      where: { ctId, del: 0 },
      order: { cpId: 'DESC' },
    });
    return items.map((p) => ({
      cp_id: p.cpId,
      ct_id: p.ctId,
      due_date: p.dueDate,
      actual_delivery_date: p.actualDeliveryDate,
      days_late: p.daysLate,
      contract_amount: toNum(p.contractAmount),
      daily_rate_percent: toNum(p.dailyRatePercent),
      penalty_amount: toNum(p.penaltyAmount),
      status: p.status,
      collected_date: p.collectedDate,
      waived_reason: p.waivedReason,
      create_date: p.createDate,
    }));
  }
}
