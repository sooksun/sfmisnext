import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntraBankTransfer } from './entities/intra-bank-transfer.entity';
import {
  AddIntraBankTransferDto,
  CompleteIntraBankTransferDto,
} from './dto/intra-bank-transfer.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

const STATUS_NAMES: Record<number, string> = {
  0: 'ร่าง',
  1: 'ดำเนินการ',
  2: 'สำเร็จ',
  3: 'ยกเลิก',
};
const METHOD_NAMES: Record<number, string> = {
  1: 'โอนเงินออนไลน์',
  2: 'เช็ค',
  3: 'เงินสด',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class IntraBankTransferService {
  constructor(
    @InjectRepository(IntraBankTransfer)
    private readonly ibtRepo: Repository<IntraBankTransfer>,
  ) {}

  async load(scId: number, from?: string, to?: string) {
    const qb = this.ibtRepo
      .createQueryBuilder('ibt')
      .where('ibt.sc_id = :scId AND ibt.del = 0', { scId });
    if (from) qb.andWhere('ibt.transfer_date >= :from', { from });
    if (to) qb.andWhere('ibt.transfer_date <= :to', { to });
    qb.orderBy('ibt.transfer_date', 'DESC').addOrderBy('ibt.ibt_id', 'DESC');

    const items = await qb.getMany();
    return {
      data: items.map((t) => ({
        ibt_id: t.ibtId,
        ibt_no: t.ibtNo,
        transfer_date: t.transferDate,
        from_bank_id: t.fromBankId,
        to_bank_id: t.toBankId,
        amount: toNum(t.amount),
        fee: toNum(t.fee),
        transfer_method: t.transferMethod,
        transfer_method_name: METHOD_NAMES[t.transferMethod] ?? '',
        ref_no: t.refNo,
        purpose: t.purpose,
        status: t.status,
        status_name: STATUS_NAMES[t.status] ?? '',
        completed_date: t.completedDate,
        create_date: t.createDate,
      })),
      count: items.length,
    };
  }

  async add(dto: AddIntraBankTransferDto) {
    if (dto.from_bank_id === dto.to_bank_id) {
      return {
        flag: false,
        ms: 'บัญชีต้นทางและปลายทางต้องไม่ใช่บัญชีเดียวกัน',
      };
    }
    if (Number(dto.amount) <= 0) {
      return { flag: false, ms: 'จำนวนเงินต้องมากกว่า 0' };
    }

    const last = await this.ibtRepo.findOne({
      where: { scId: dto.sc_id, del: 0 },
      order: { ibtId: 'DESC' },
    });
    const year = new Date(dto.transfer_date).getFullYear() + 543;
    const seq =
      last && last.ibtNo.endsWith(`/${year}`)
        ? Number(last.ibtNo.split('/')[0] ?? 0) + 1
        : 1;
    const ibtNo = `IBT${String(seq).padStart(4, '0')}/${year}`;

    const t = this.ibtRepo.create({
      ibtNo,
      scId: dto.sc_id,
      transferDate: dto.transfer_date,
      fromBankId: dto.from_bank_id,
      toBankId: dto.to_bank_id,
      amount: dto.amount,
      fee: dto.fee ?? 0,
      transferMethod: dto.transfer_method ?? 1,
      refNo: dto.ref_no ?? null,
      purpose: dto.purpose ?? null,
      status: 1,
      note: dto.note ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.ibtRepo.save(t);
    return {
      flag: true,
      ms: `สร้างรายการโอน ${ibtNo} เรียบร้อย`,
      ibt_id: t.ibtId,
    };
  }

  async complete(dto: CompleteIntraBankTransferDto, user: JwtUser) {
    const t = await this.ibtRepo.findOne({
      where: { ibtId: dto.ibt_id, del: 0 },
    });
    if (!t) return { flag: false, ms: 'ไม่พบรายการ' };
    assertSameSchool(user, t.scId);
    if (t.status !== 1) return { flag: false, ms: 'สถานะไม่ถูกต้อง' };
    t.status = 2;
    t.completedDate = dto.completed_date;
    if (dto.from_ledger_id) t.fromLedgerId = dto.from_ledger_id;
    if (dto.to_ledger_id) t.toLedgerId = dto.to_ledger_id;
    t.upBy = dto.up_by;
    await this.ibtRepo.save(t);
    return { flag: true, ms: 'บันทึกการโอนเงินสำเร็จ' };
  }

  async cancel(ibtId: number, reason: string, upBy: number, user: JwtUser) {
    const t = await this.ibtRepo.findOne({ where: { ibtId, del: 0 } });
    if (!t) return { flag: false, ms: 'ไม่พบรายการ' };
    assertSameSchool(user, t.scId);
    if (t.status === 2)
      return { flag: false, ms: 'รายการสำเร็จแล้ว ยกเลิกไม่ได้' };
    t.status = 3;
    t.note = reason;
    t.upBy = upBy;
    await this.ibtRepo.save(t);
    return { flag: true, ms: 'ยกเลิกรายการเรียบร้อย' };
  }
}
