import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovRevenueEntry } from './entities/gov-revenue-entry.entity';
import { AddGovRevenueDto } from './dto/add-gov-revenue.dto';

const REVENUE_TYPE_NAMES: Record<number, string> = {
  1: 'ดอกเบี้ยเงินฝาก (เงินอุดหนุน)',
  2: 'ดอกเบี้ยเงินฝาก (เงินอาหารกลางวัน)',
  3: 'เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ',
  4: 'ค่าขายพัสดุชำรุด/ค่าธรรมเนียม/รายได้อื่น',
};

@Injectable()
export class GovRevenueService {
  constructor(
    @InjectRepository(GovRevenueEntry)
    private readonly entryRepo: Repository<GovRevenueEntry>,
  ) {}

  /**
   * โหลดรายการทั้งหมดของประเภทเงินที่เลือก พร้อม running balance
   */
  async loadEntries(
    scId: number,
    syId: number,
    budgetYear: string,
    revenueType: number,
  ) {
    const entries = await this.entryRepo.find({
      where: { scId, syId, budgetYear, revenueType, del: 0 },
      order: { docDate: 'ASC', greId: 'ASC' },
    });

    let balance = 0;
    const rows = entries.map((e) => {
      if (e.entryType === 1) balance += e.amount;
      else balance -= e.amount;

      return {
        gre_id: e.greId,
        sc_id: e.scId,
        sy_id: e.syId,
        budget_year: e.budgetYear,
        revenue_type: e.revenueType,
        revenue_type_name: REVENUE_TYPE_NAMES[e.revenueType] ?? '',
        entry_type: e.entryType,
        doc_no: e.docNo,
        doc_date: e.docDate,
        detail: e.detail,
        amount: e.amount,
        amount_in: e.entryType === 1 ? e.amount : 0,
        amount_out: e.entryType === 2 ? e.amount : 0,
        balance,
        note: e.note,
        up_by: e.upBy,
        create_date: e.createDate,
      };
    });

    return { data: rows, count: rows.length };
  }

  /**
   * สรุปยอดรายเดือน สำหรับแจ้งเตือนการนำส่ง
   */
  async monthlySummary(scId: number, syId: number, budgetYear: string) {
    const ALERT_THRESHOLD = 10000;
    const summaries: {
      revenue_type: number;
      revenue_type_name: string;
      total_in: number;
      total_out: number;
      balance: number;
      needs_remit: boolean;
      alert_threshold: number;
    }[] = [];

    for (const rt of [1, 2, 3, 4]) {
      const entries = await this.entryRepo.find({
        where: { scId, syId, budgetYear, revenueType: rt, del: 0 },
      });

      const totalIn = entries
        .filter((e) => e.entryType === 1)
        .reduce((s, e) => s + e.amount, 0);
      const totalOut = entries
        .filter((e) => e.entryType === 2)
        .reduce((s, e) => s + e.amount, 0);
      const balance = totalIn - totalOut;

      summaries.push({
        revenue_type: rt,
        revenue_type_name: REVENUE_TYPE_NAMES[rt],
        total_in: totalIn,
        total_out: totalOut,
        balance,
        needs_remit: balance >= ALERT_THRESHOLD,
        alert_threshold: ALERT_THRESHOLD,
      });
    }

    return summaries;
  }

  async addEntry(dto: AddGovRevenueDto) {
    const entry = this.entryRepo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      revenueType: dto.revenue_type,
      entryType: dto.entry_type,
      docNo: dto.doc_no ?? null,
      docDate: dto.doc_date ?? null,
      detail: dto.detail ?? null,
      amount: dto.amount,
      note: dto.note ?? null,
      upBy: dto.up_by ?? 0,
      del: 0,
    });
    await this.entryRepo.save(entry);
    return { flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' };
  }

  async updateEntry(greId: number, dto: Partial<AddGovRevenueDto>) {
    const entry = await this.entryRepo.findOne({ where: { greId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };

    if (dto.revenue_type !== undefined) entry.revenueType = dto.revenue_type;
    if (dto.entry_type !== undefined) entry.entryType = dto.entry_type;
    if (dto.doc_no !== undefined) entry.docNo = dto.doc_no;
    if (dto.doc_date !== undefined) entry.docDate = dto.doc_date;
    if (dto.detail !== undefined) entry.detail = dto.detail ?? null;
    if (dto.amount !== undefined) entry.amount = dto.amount;
    if (dto.note !== undefined) entry.note = dto.note ?? null;
    if (dto.up_by !== undefined) entry.upBy = dto.up_by;

    await this.entryRepo.save(entry);
    return { flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' };
  }

  async removeEntry(greId: number, upBy: number) {
    const entry = await this.entryRepo.findOne({ where: { greId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };
    entry.del = 1;
    entry.upBy = upBy;
    await this.entryRepo.save(entry);
    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }
}
