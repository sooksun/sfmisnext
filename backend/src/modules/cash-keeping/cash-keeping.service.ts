import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashKeepingRecord } from './entities/cash-keeping-record.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

// ── เกณฑ์การนำเงินสดฝากธนาคาร (ระเบียบกระทรวงการคลังว่าด้วยการรับ-จ่าย-เก็บรักษาเงิน
//    และการนำเงินส่งคลัง พ.ศ. 2562 — "นำส่ง/ฝากโดยเร็ว") ──────────────────────────
//  - รับเงินสดวันใด "เกิน 10,000 บาท" → ฝากวันนั้น อย่างช้าวันทำการถัดไป (1 วันทำการ)
//  - รับไม่เกิน 10,000 บาท → เก็บได้ชั่วคราว แต่ไม่เกิน 3 วันทำการ
//  - วันหยุด/ธนาคารปิด → นับเฉพาะวันทำการ (ข้ามเสาร์-อาทิตย์)
const DEPOSIT_OVER_THRESHOLD = 10000;
const DEPOSIT_OVER_DAYS = 1; // เกินเกณฑ์ → ภายใน 1 วันทำการ
const DEPOSIT_MAX_DAYS = 3; // ไม่เกินเกณฑ์ → ภายใน 3 วันทำการ

/** บวกจำนวน "วันทำการ" (ข้ามเสาร์-อาทิตย์ ; ยังไม่รวมวันหยุดนักขัตฤกษ์) */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

/** นับวันทำการจาก from→to (ไม่รวม from) ; 0 ถ้า to<=from */
function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const d = new Date(from);
  while (d < to) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CashKeepingService {
  constructor(
    @InjectRepository(CashKeepingRecord)
    private readonly ckrRepo: Repository<CashKeepingRecord>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async loadRecords(scId: number, syId: number) {
    const records = await this.ckrRepo.find({
      where: { scId, syId, del: 0 },
      order: { recordDate: 'DESC', ckrId: 'DESC' },
    });

    return {
      data: records.map((r) => ({
        ckr_id: r.ckrId,
        sc_id: r.scId,
        sy_id: r.syId,
        record_date: r.recordDate,
        amount: r.amount,
        money_detail: r.moneyDetail,
        sender_id: r.senderId,
        sender_name: r.senderName,
        sender_position: r.senderPosition,
        receiver_id: r.receiverId,
        receiver_name: r.receiverName,
        receiver_position: r.receiverPosition,
        note: r.note,
        status: r.status,
        returned_date: r.returnedDate,
        returned_amount: r.returnedAmount,
        return_note: r.returnNote,
        create_date: r.createDate,
      })),
      count: records.length,
    };
  }

  async addRecord(dto: {
    sc_id: number;
    sy_id: number;
    record_date: string;
    amount: number;
    money_detail?: string;
    sender_id: number;
    receiver_id: number;
    note?: string;
    up_by?: number;
  }) {
    // snapshot sender
    let senderName: string | null = null;
    let senderPosition: string | null = null;
    const sender = await this.adminRepo.findOne({
      where: { adminId: dto.sender_id },
    });
    if (sender) {
      senderName = sender.name ?? sender.username ?? null;
      senderPosition = sender.position != null ? String(sender.position) : null;
    }

    // snapshot receiver
    let receiverName: string | null = null;
    let receiverPosition: string | null = null;
    const receiver = await this.adminRepo.findOne({
      where: { adminId: dto.receiver_id },
    });
    if (receiver) {
      receiverName = receiver.name ?? receiver.username ?? null;
      receiverPosition =
        receiver.position != null ? String(receiver.position) : null;
    }

    const record = this.ckrRepo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      recordDate: dto.record_date,
      amount: dto.amount,
      moneyDetail: dto.money_detail ?? null,
      senderId: dto.sender_id,
      senderName,
      senderPosition,
      receiverId: dto.receiver_id,
      receiverName,
      receiverPosition,
      note: dto.note ?? null,
      status: 1,
      upBy: dto.up_by ?? 0,
      del: 0,
    });

    await this.ckrRepo.save(record);
    return { flag: true, ms: 'บันทึกการรับเงินเพื่อเก็บรักษาเรียบร้อยแล้ว' };
  }

  async returnRecord(
    dto: {
      ckr_id: number;
      returned_date: string;
      returned_amount: number;
      return_note?: string;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const record = await this.ckrRepo.findOne({
      where: { ckrId: dto.ckr_id, del: 0 },
    });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, record.scId);
    if (record.status === 2) return { flag: false, ms: 'บันทึกการส่งคืนแล้ว' };

    record.status = 2;
    record.returnedDate = dto.returned_date;
    record.returnedAmount = dto.returned_amount;
    record.returnNote = dto.return_note ?? null;
    record.upBy = dto.up_by ?? 0;
    await this.ckrRepo.save(record);
    return { flag: true, ms: 'บันทึกการส่งคืนเงินเรียบร้อยแล้ว' };
  }

  async removeRecord(ckrId: number, upBy: number, user?: JwtUser) {
    const record = await this.ckrRepo.findOne({ where: { ckrId, del: 0 } });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, record.scId);
    if (record.status === 2)
      return { flag: false, ms: 'ไม่สามารถลบรายการที่ส่งคืนแล้ว' };
    record.del = 1;
    record.upBy = upBy;
    await this.ckrRepo.save(record);
    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }

  /**
   * เตือนนำเงินสดฝากธนาคารตามระเบียบ 2562 — พิจารณาจากเงินสดที่ยัง "ถือไว้" (status=1)
   *  เกิน 10,000 → ครบกำหนด 1 วันทำการ ; ไม่เกิน → 3 วันทำการ นับจากวันรับ
   *  คืน เฉพาะรายการที่ overdue/ใกล้ครบกำหนด พร้อมยอดรวมที่ต้องนำฝาก
   */
  async depositReminder(scId: number, syId: number) {
    const held = await this.ckrRepo.find({
      where: { scId, syId, status: 1, del: 0 },
      order: { recordDate: 'ASC', ckrId: 'ASC' },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = held
      .map((r) => {
        const recv = r.recordDate ? new Date(r.recordDate) : new Date(today);
        recv.setHours(0, 0, 0, 0);
        const amount = Number(r.amount) || 0;
        const overThreshold = amount > DEPOSIT_OVER_THRESHOLD;
        const allowDays = overThreshold ? DEPOSIT_OVER_DAYS : DEPOSIT_MAX_DAYS;
        const deadline = addBusinessDays(recv, allowDays);

        let status: 'overdue' | 'due_today' | 'due_soon' | 'ok' = 'ok';
        if (today.getTime() > deadline.getTime()) status = 'overdue';
        else if (today.getTime() === deadline.getTime()) status = 'due_today';
        else if (businessDaysBetween(today, deadline) <= 1) status = 'due_soon';

        return {
          ckr_id: r.ckrId,
          record_date: r.recordDate,
          amount: round2(amount),
          money_detail: r.moneyDetail,
          over_threshold: overThreshold,
          deadline: deadline.toISOString().slice(0, 10),
          overdue_days: businessDaysBetween(deadline, today),
          status,
        };
      })
      .filter((x) => x.status !== 'ok');

    const overdueItems = items.filter((x) => x.status === 'overdue');
    return {
      data: items,
      count: items.length,
      overdue: overdueItems.length,
      total_overdue: round2(overdueItems.reduce((s, x) => s + x.amount, 0)),
      total_pending: round2(items.reduce((s, x) => s + x.amount, 0)),
    };
  }

  /**
   * ปิดบันทึกเก็บรักษาเงินสด (status 1→2) แบบ FIFO เมื่อมีการนำฝากธนาคาร
   *  ปิดรายการที่ยอดถูกครอบคลุมเต็มจำนวนก่อน (เก่าสุดก่อน) ; ส่วนที่ฝากไม่พอ
   *  ปิดทั้งรายการ จะเก็บถือต่อ (ไม่ split) — best-effort เพื่อให้ reminder แม่นขึ้น
   */
  async markDepositedFifo(
    scId: number,
    syId: number,
    amount: number,
    depositDate: string | null,
    upBy = 0,
  ): Promise<void> {
    let remaining = Number(amount) || 0;
    if (remaining <= 0) return;
    const held = await this.ckrRepo.find({
      where: { scId, syId, status: 1, del: 0 },
      order: { recordDate: 'ASC', ckrId: 'ASC' },
    });
    for (const r of held) {
      if (remaining <= 0.005) break;
      const amt = Number(r.amount) || 0;
      if (amt > remaining + 0.005) break; // ฝากไม่พอปิดรายการนี้ → หยุด
      r.status = 2;
      r.returnedDate = depositDate ?? null;
      r.returnedAmount = amt;
      r.returnNote = 'นำเงินสดฝากธนาคารแล้ว (อัตโนมัติ)';
      r.upBy = upBy || r.upBy;
      await this.ckrRepo.save(r);
      remaining -= amt;
    }
  }
}
