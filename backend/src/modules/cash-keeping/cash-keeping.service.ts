import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashKeepingRecord } from './entities/cash-keeping-record.entity';
import { Admin } from '../admin/entities/admin.entity';

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

  async returnRecord(dto: {
    ckr_id: number;
    returned_date: string;
    returned_amount: number;
    return_note?: string;
    up_by?: number;
  }) {
    const record = await this.ckrRepo.findOne({
      where: { ckrId: dto.ckr_id, del: 0 },
    });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (record.status === 2) return { flag: false, ms: 'บันทึกการส่งคืนแล้ว' };

    record.status = 2;
    record.returnedDate = dto.returned_date;
    record.returnedAmount = dto.returned_amount;
    record.returnNote = dto.return_note ?? null;
    record.upBy = dto.up_by ?? 0;
    await this.ckrRepo.save(record);
    return { flag: true, ms: 'บันทึกการส่งคืนเงินเรียบร้อยแล้ว' };
  }

  async removeRecord(ckrId: number, upBy: number) {
    const record = await this.ckrRepo.findOne({ where: { ckrId, del: 0 } });
    if (!record) return { flag: false, ms: 'ไม่พบรายการ' };
    if (record.status === 2)
      return { flag: false, ms: 'ไม่สามารถลบรายการที่ส่งคืนแล้ว' };
    record.del = 1;
    record.upBy = upBy;
    await this.ckrRepo.save(record);
    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }
}
