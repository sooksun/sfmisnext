import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmpDepositEntry } from './entities/smp-deposit-entry.entity';
import { DocCounterService } from '../doc-counter/doc-counter.service';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class SmpDepositService {
  constructor(
    @InjectRepository(SmpDepositEntry)
    private readonly repo: Repository<SmpDepositEntry>,
    private readonly docCounter: DocCounterService,
  ) {}

  /** โหลดรายการทั้งหมด พร้อม running balance */
  async loadEntries(scId: number, syId: number, budgetYear: string) {
    const entries = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { docDate: 'ASC', sdeId: 'ASC' },
    });

    let balance = 0;
    return {
      data: entries.map((e) => {
        if (e.entryType === 1) balance += e.amount;
        else balance -= e.amount;
        return {
          sde_id: e.sdeId,
          sc_id: e.scId,
          sy_id: e.syId,
          budget_year: e.budgetYear,
          entry_type: e.entryType,
          entry_type_label: e.entryType === 1 ? 'ฝาก' : 'ถอน',
          doc_no: e.docNo,
          doc_date: e.docDate,
          detail: e.detail,
          amount: e.amount,
          amount_in: e.entryType === 1 ? e.amount : 0,
          amount_out: e.entryType === 2 ? e.amount : 0,
          balance,
          money_type_id: e.moneyTypeId,
          money_type_name: e.moneyTypeName,
          note: e.note,
          up_by: e.upBy,
          create_date: e.createDate,
        };
      }),
      count: entries.length,
    };
  }

  /** สรุปยอดคงเหลือ */
  async getSummary(scId: number, syId: number, budgetYear: string) {
    const entries = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
    });
    const totalIn = entries
      .filter((e) => e.entryType === 1)
      .reduce((s, e) => s + e.amount, 0);
    const totalOut = entries
      .filter((e) => e.entryType === 2)
      .reduce((s, e) => s + e.amount, 0);
    return {
      total_in: totalIn,
      total_out: totalOut,
      balance: totalIn - totalOut,
      entry_count: entries.length,
    };
  }

  async addEntry(dto: {
    sc_id: number;
    sy_id: number;
    budget_year: string;
    entry_type: number;
    doc_no?: string;
    doc_date?: string;
    detail?: string;
    amount: number;
    money_type_id?: number;
    money_type_name?: string;
    note?: string;
    up_by?: number;
  }) {
    // ออกเลขที่เอกสารอัตโนมัติ บฝ. (นำฝาก) / บถ. (เบิกถอน) ถ้าไม่ได้ระบุ
    let docNo = dto.doc_no ?? null;
    if (!docNo) {
      const issued = await this.docCounter.issue(
        dto.sc_id,
        dto.budget_year,
        dto.entry_type === 1 ? 'BF' : 'BT',
      );
      docNo = issued.formatted;
    }
    const entry = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      entryType: dto.entry_type,
      docNo,
      docDate: dto.doc_date ?? null,
      detail: dto.detail ?? null,
      amount: dto.amount,
      moneyTypeId: dto.money_type_id ?? null,
      moneyTypeName: dto.money_type_name ?? null,
      note: dto.note ?? null,
      upBy: dto.up_by ?? 0,
      del: 0,
    });
    await this.repo.save(entry);
    return { flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' };
  }

  async updateEntry(
    sdeId: number,
    dto: Partial<{
      entry_type: number;
      doc_no: string;
      doc_date: string;
      detail: string;
      amount: number;
      money_type_id: number;
      money_type_name: string;
      note: string;
      up_by: number;
    }>,
    user?: JwtUser,
  ) {
    const entry = await this.repo.findOne({ where: { sdeId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, entry.scId);
    if (dto.entry_type !== undefined) entry.entryType = dto.entry_type;
    if (dto.doc_no !== undefined) entry.docNo = dto.doc_no;
    if (dto.doc_date !== undefined) entry.docDate = dto.doc_date;
    if (dto.detail !== undefined) entry.detail = dto.detail ?? null;
    if (dto.amount !== undefined) entry.amount = dto.amount;
    if (dto.money_type_id !== undefined)
      entry.moneyTypeId = dto.money_type_id ?? null;
    if (dto.money_type_name !== undefined)
      entry.moneyTypeName = dto.money_type_name ?? null;
    if (dto.note !== undefined) entry.note = dto.note ?? null;
    if (dto.up_by !== undefined) entry.upBy = dto.up_by;
    await this.repo.save(entry);
    return { flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' };
  }

  async removeEntry(sdeId: number, upBy: number, user?: JwtUser) {
    const entry = await this.repo.findOne({ where: { sdeId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, entry.scId);
    entry.del = 1;
    entry.upBy = upBy;
    await this.repo.save(entry);
    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }
}
