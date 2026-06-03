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

  /**
   * เตือนรอบดอกเบี้ยเงินฝาก → เงินรายได้แผ่นดิน (ต้องนำส่ง)
   *  - ธนาคารจ่ายดอกเบี้ยปีละ 2 งวด: 30 มิ.ย. และ 30 ธ.ค.
   *  - ดอกเบี้ยเงินอุดหนุน (type 1) + ดอกเบี้ยอาหารกลางวัน (type 2) = รายได้แผ่นดิน ต้องนำส่ง สพป.
   *  - ถ้ายอดค้างนำส่ง > 10,000 บาท ต้องนำส่งภายใน 3 วันทำการ
   */
  async interestReminder(scId: number, syId: number, budgetYear: string) {
    const INTEREST_TYPES = [1, 2]; // ดอกเบี้ยอุดหนุน, ดอกเบี้ยอาหารกลางวัน
    const URGENT_THRESHOLD = 10000;
    const MS = 24 * 60 * 60 * 1000;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = today.getFullYear();
    // วันจ่ายดอกเบี้ย: 30 มิ.ย. (เดือน index 5) และ 30 ธ.ค. (เดือน index 11)
    const candidates = [
      new Date(y - 1, 11, 30),
      new Date(y, 5, 30),
      new Date(y, 11, 30),
      new Date(y + 1, 5, 30),
    ];
    candidates.forEach((d) => d.setHours(0, 0, 0, 0));
    const past = candidates.filter((d) => d.getTime() <= today.getTime());
    const future = candidates.filter((d) => d.getTime() > today.getTime());
    const lastDate = past[past.length - 1];
    const nextDate = future[0];
    const daysToNext = Math.round((nextDate.getTime() - today.getTime()) / MS);
    const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / MS);

    // ยอดดอกเบี้ยที่รับ/นำส่ง ในปีงบนี้ แยกประเภท
    const entries = await this.entryRepo.find({
      where: { scId, syId, budgetYear, del: 0 },
    });
    const byType = INTEREST_TYPES.map((rt) => {
      const list = entries.filter((e) => e.revenueType === rt);
      const received = list
        .filter((e) => e.entryType === 1)
        .reduce((s, e) => s + Number(e.amount), 0);
      const remitted = list
        .filter((e) => e.entryType === 2)
        .reduce((s, e) => s + Number(e.amount), 0);
      return {
        revenue_type: rt,
        revenue_type_name: REVENUE_TYPE_NAMES[rt],
        received: Math.round(received * 100) / 100,
        remitted: Math.round(remitted * 100) / 100,
        outstanding: Math.round((received - remitted) * 100) / 100,
      };
    });
    const totalOutstanding = byType.reduce((s, t) => s + t.outstanding, 0);

    const alerts: { level: 'info' | 'warning' | 'urgent'; message: string }[] =
      [];

    // 1) ใกล้ถึงรอบดอกเบี้ย (เตรียมถอน+นำส่ง)
    if (daysToNext <= 15) {
      alerts.push({
        level: 'warning',
        message: `ใกล้ถึงรอบดอกเบี้ยเงินฝาก (${this.fmtThai(nextDate)}) อีก ${daysToNext} วัน — เตรียมตรวจสอบดอกเบี้ยและนำส่งเงินรายได้แผ่นดิน`,
      });
    }
    // 2) เพิ่งผ่านรอบดอกเบี้ย แต่ยังไม่บันทึกดอกเบี้ยรับ
    const receivedNearLast = entries.some(
      (e) =>
        INTEREST_TYPES.includes(e.revenueType) &&
        e.entryType === 1 &&
        e.docDate != null &&
        Math.abs(
          (new Date(e.docDate).getTime() - lastDate.getTime()) / MS,
        ) <= 31,
    );
    if (daysSinceLast <= 31 && !receivedNearLast) {
      alerts.push({
        level: 'warning',
        message: `ผ่านรอบดอกเบี้ย (${this.fmtThai(lastDate)}) มาแล้ว ${daysSinceLast} วัน แต่ยังไม่บันทึกดอกเบี้ยเงินฝาก — โปรดตรวจ Bank Statement แล้วบันทึก (ดอกเบี้ยไม่ต้องออกใบเสร็จ ใช้บันทึกข้อความ)`,
      });
    }
    // 3) มีดอกเบี้ยรับแล้วยังไม่นำส่ง
    if (totalOutstanding > 0.005) {
      const urgent = totalOutstanding > URGENT_THRESHOLD;
      alerts.push({
        level: urgent ? 'urgent' : 'info',
        message:
          `มีดอกเบี้ยรับแล้วยังไม่นำส่งรายได้แผ่นดิน ${totalOutstanding.toLocaleString('th-TH')} บาท` +
          (urgent
            ? ' — เกิน 10,000 บาท ต้องนำส่งภายใน 3 วันทำการ'
            : ' — รวบรวมนำส่งอย่างน้อยเดือนละ 1 ครั้ง'),
      });
    }

    return {
      today: this.isoLocal(today),
      next_interest_date: this.isoLocal(nextDate),
      days_to_next: daysToNext,
      last_interest_date: this.isoLocal(lastDate),
      by_type: byType,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      alerts,
      need_action: alerts.some((a) => a.level !== 'info'),
    };
  }

  /** format วันที่เป็น YYYY-MM-DD ตามเวลาท้องถิ่น (เลี่ยง toISOString ที่เลื่อน timezone) */
  private isoLocal(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private fmtThai(d: Date): string {
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
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
