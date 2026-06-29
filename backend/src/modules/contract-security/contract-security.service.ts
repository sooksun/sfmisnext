import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractSecurity } from './entities/contract-security.entity';
import { ContractPenalty } from './entities/contract-penalty.entity';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { RegulatoryConfigService } from '../regulatory-config/regulatory-config.service';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

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
    @InjectRepository(SmpDepositEntry)
    private readonly smpRepo: Repository<SmpDepositEntry>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetTypeRepo: Repository<BudgetIncomeType>,
    private readonly regulatoryConfig: RegulatoryConfigService,
  ) {}

  /** หาประเภทเงิน "เงินประกันสัญญา" สำหรับลงทะเบียนคุมเงินฝากส่วนราชการ
   *  ใช้ config key `procurement.security_bg_type_id` (default=11) แทน LIKE matching
   *  เพื่อกันกรณีที่ admin เพิ่มประเภทเงินชื่อคล้ายกัน */
  private async resolveGuaranteeMoneyType(
    scId: number,
  ): Promise<{ id: number | null; name: string | null }> {
    const bgTypeId = await this.regulatoryConfig.getThreshold(
      scId,
      'procurement.security_bg_type_id',
    );
    if (!bgTypeId) return { id: null, name: null };

    const bt = await this.budgetTypeRepo.findOne({
      where: { bgTypeId, del: 0 },
    });
    return { id: bt ? bt.bgTypeId : null, name: bt ? bt.budgetType : null };
  }

  async loadByContract(ctId: number, user?: JwtUser) {
    const items = await this.secRepo.find({
      where: { ctId, del: 0 },
      order: { csId: 'ASC' },
    });
    // Multi-tenant guard: หลักประกันต้องเป็นของโรงเรียนผู้ใช้
    if (user) {
      for (const s of items) {
        if (s.scId != null) assertSameSchool(user, s.scId);
      }
    }
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
    const securityForm = dto.security_form ?? 1;
    const securityType = dto.security_type;
    const amount = Number(dto.amount ?? 0);

    const s = this.secRepo.create({
      ctId: dto.ct_id,
      scId: dto.sc_id,
      securityType,
      securityForm,
      amount,
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

    let extraMs = '';

    // 1.5 หลักประกันสัญญาที่เป็นเงินสด → นำฝาก สพป. (ทะเบียนคุมเงินฝากส่วนราชการ)
    if (securityForm === 1) {
      const mt = await this.resolveGuaranteeMoneyType(dto.sc_id ?? 0);
      const smp = this.smpRepo.create({
        scId: dto.sc_id ?? 0,
        syId: dto.sy_id ?? 0,
        budgetYear: dto.budget_year ?? null,
        entryType: 1, // ฝาก (นำฝาก สพป.)
        docNo: dto.document_no ?? null,
        docDate: dto.received_date ?? null,
        detail: `${TYPE_NAMES[securityType] ?? 'หลักประกัน'} (สัญญา #${dto.ct_id}) — นำฝาก สพป.`,
        amount,
        moneyTypeId: mt.id,
        moneyTypeName: mt.name,
        upBy: dto.up_by ?? 0,
        del: 0,
      });
      await this.smpRepo.save(smp);
      s.smpDepositId = smp.sdeId;
      await this.secRepo.save(s);
      extraMs = ' + นำฝาก สพป. เรียบร้อย';
    }

    // 1.5 ตรวจ % หลักประกันสัญญา (เตือน ไม่บล็อก)
    if (securityType === 2 && dto.contract_amount) {
      const pctCfg = await this.regulatoryConfig.getThreshold(
        dto.sc_id ?? 0,
        'procurement.contract_security_pct',
      );
      const expected = (Number(dto.contract_amount) * pctCfg) / 100;
      if (expected > 0 && Math.abs(expected - amount) > 1) {
        extraMs += ` (เตือน: หลักประกันสัญญาควรเป็น ${pctCfg}% = ${expected.toLocaleString('th-TH')} บาท)`;
      }
    }

    return { flag: true, ms: `บันทึกหลักประกันเรียบร้อยแล้ว${extraMs}` };
  }

  async returnSecurity(
    dto: {
      cs_id: number;
      return_date: string;
      return_evidence_no?: string;
      note?: string;
      up_by: number;
    },
    user?: JwtUser,
  ) {
    const s = await this.secRepo.findOne({
      where: { csId: dto.cs_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายการหลักประกัน' };
    if (user && s.scId != null) assertSameSchool(user, s.scId);
    if (s.status !== 1)
      return { flag: false, ms: 'หลักประกันนี้ไม่ได้อยู่ในสถานะถือครอง' };

    s.returnDate = dto.return_date;
    s.returnEvidenceNo = dto.return_evidence_no ?? null;
    if (dto.note) s.note = dto.note;
    s.status = 2;
    s.upBy = dto.up_by;
    await this.secRepo.save(s);

    // คืนหลักประกันเงินสด → ถอนจากเงินฝากส่วนราชการ (mirror entry)
    await this.reverseSmpDeposit(s, dto.return_date, dto.up_by);

    return { flag: true, ms: 'คืนหลักประกันเรียบร้อยแล้ว' };
  }

  /** สร้างรายการถอนเงินฝากส่วนราชการ คู่กับรายการนำฝากของหลักประกันเงินสด */
  private async reverseSmpDeposit(
    s: ContractSecurity,
    docDate: string | null | undefined,
    upBy: number,
  ): Promise<void> {
    if (!s.smpDepositId) return;
    const orig = await this.smpRepo.findOne({
      where: { sdeId: s.smpDepositId, del: 0 },
    });
    if (!orig) return;
    const withdraw = this.smpRepo.create({
      scId: orig.scId,
      syId: orig.syId,
      budgetYear: orig.budgetYear,
      entryType: 2, // ถอน (คืนหลักประกัน)
      docNo: s.returnEvidenceNo ?? orig.docNo,
      docDate: docDate ?? null,
      detail: `คืน${TYPE_NAMES[s.securityType] ?? 'หลักประกัน'} (สัญญา #${s.ctId})`,
      amount: Number(orig.amount),
      moneyTypeId: orig.moneyTypeId,
      moneyTypeName: orig.moneyTypeName,
      upBy: upBy ?? 0,
      del: 0,
    });
    await this.smpRepo.save(withdraw);
  }

  async confiscateSecurity(
    dto: {
      cs_id: number;
      note?: string;
      up_by: number;
    },
    user?: JwtUser,
  ) {
    const s = await this.secRepo.findOne({
      where: { csId: dto.cs_id, del: 0 },
    });
    if (!s) return { flag: false, ms: 'ไม่พบรายการหลักประกัน' };
    if (user && s.scId != null) assertSameSchool(user, s.scId);
    s.status = 3;
    if (dto.note) s.note = dto.note;
    s.upBy = dto.up_by;
    await this.secRepo.save(s);
    return { flag: true, ms: 'บันทึกการยึดหลักประกันเรียบร้อยแล้ว' };
  }

  async removeSecurity(csId: number, upBy: number, user?: JwtUser) {
    const s = await this.secRepo.findOne({ where: { csId, del: 0 } });
    if (!s) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user && s.scId != null) assertSameSchool(user, s.scId);
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
    user?: JwtUser,
  ) {
    const p = await this.penRepo.findOne({ where: { cpId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบค่าปรับ' };
    if (user && p.scId != null) assertSameSchool(user, p.scId);
    p.status = 3;
    p.collectedDate = collectedDate;
    p.upBy = upBy;
    await this.penRepo.save(p);
    return { flag: true, ms: 'บันทึกการรับชำระค่าปรับเรียบร้อย' };
  }

  async waivePenalty(
    cpId: number,
    reason: string,
    upBy: number,
    user?: JwtUser,
  ) {
    const p = await this.penRepo.findOne({ where: { cpId, del: 0 } });
    if (!p) return { flag: false, ms: 'ไม่พบค่าปรับ' };
    if (user && p.scId != null) assertSameSchool(user, p.scId);
    p.status = 4;
    p.waivedReason = reason;
    p.upBy = upBy;
    await this.penRepo.save(p);
    return { flag: true, ms: 'ยกเว้นค่าปรับเรียบร้อย' };
  }

  async loadPenalties(ctId: number, user?: JwtUser) {
    const items = await this.penRepo.find({
      where: { ctId, del: 0 },
      order: { cpId: 'DESC' },
    });
    // Multi-tenant guard: ค่าปรับต้องเป็นของโรงเรียนผู้ใช้
    if (user) {
      for (const p of items) {
        if (p.scId != null) assertSameSchool(user, p.scId);
      }
    }
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
