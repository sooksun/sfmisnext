import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EgpAnnouncement } from './entities/egp-announcement.entity';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

const TYPE_NAMES: Record<number, string> = {
  1: 'ประกาศแผนจัดซื้อ',
  2: 'ประกาศราคากลาง',
  3: 'ประกาศเชิญชวน',
  4: 'ประกาศผู้ชนะ',
  5: 'ประกาศยกเลิก',
  6: 'ร่างขอบเขตงาน (TOR)',
};
const STATUS_NAMES: Record<number, string> = {
  0: 'ร่าง',
  1: 'เผยแพร่แล้ว',
  2: 'ปิดประกาศ',
  9: 'ยกเลิก',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class EgpAnnouncementService {
  constructor(
    @InjectRepository(EgpAnnouncement)
    private readonly eaRepo: Repository<EgpAnnouncement>,
  ) {}

  async load(scId: number, budgetYear: number, announceType?: number) {
    const where: any = { scId, budgetYear, del: 0 };
    if (announceType) where.announceType = announceType;
    const items = await this.eaRepo.find({
      where,
      order: { announceDate: 'DESC', eaId: 'DESC' },
    });
    return {
      data: items.map((a) => ({
        ea_id: a.eaId,
        announce_type: a.announceType,
        announce_type_name: TYPE_NAMES[a.announceType] ?? '',
        ref_no: a.refNo,
        egp_ref: a.egpRef,
        announce_date: a.announceDate,
        title: a.title,
        description: a.description,
        estimated_price: toNum(a.estimatedPrice),
        winner_name: a.winnerName,
        winning_price: toNum(a.winningPrice),
        file_url: a.fileUrl,
        egp_url: a.egpUrl,
        status: a.status,
        status_name: STATUS_NAMES[a.status] ?? '',
        plan_id: a.planId,
        order_id: a.orderId,
        create_date: a.createDate,
      })),
      count: items.length,
    };
  }

  async add(dto: any) {
    const a = this.eaRepo.create({
      scId: dto.sc_id,
      budgetYear: dto.budget_year,
      planId: dto.plan_id ?? null,
      orderId: dto.order_id ?? null,
      announceType: dto.announce_type,
      refNo: dto.ref_no ?? null,
      egpRef: dto.egp_ref ?? null,
      announceDate: dto.announce_date,
      title: dto.title,
      description: dto.description ?? null,
      estimatedPrice: dto.estimated_price ?? 0,
      winnerName: dto.winner_name ?? null,
      winningPrice: dto.winning_price ?? 0,
      fileUrl: dto.file_url ?? null,
      egpUrl: dto.egp_url ?? null,
      status: dto.status ?? 0,
      note: dto.note ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.eaRepo.save(a);
    return { flag: true, ms: 'บันทึกประกาศเรียบร้อย', ea_id: a.eaId };
  }

  async update(dto: any, user?: JwtUser) {
    const a = await this.eaRepo.findOne({ where: { eaId: dto.ea_id, del: 0 } });
    if (!a) return { flag: false, ms: 'ไม่พบประกาศ' };
    if (user) assertSameSchool(user, a.scId);
    const fields = [
      'ref_no',
      'egp_ref',
      'announce_date',
      'title',
      'description',
      'estimated_price',
      'winner_name',
      'winning_price',
      'file_url',
      'egp_url',
      'note',
    ];
    const map: Record<string, keyof EgpAnnouncement> = {
      ref_no: 'refNo',
      egp_ref: 'egpRef',
      announce_date: 'announceDate',
      title: 'title',
      description: 'description',
      estimated_price: 'estimatedPrice',
      winner_name: 'winnerName',
      winning_price: 'winningPrice',
      file_url: 'fileUrl',
      egp_url: 'egpUrl',
      note: 'note',
    };
    for (const k of fields) {
      if (dto[k] !== undefined) (a as any)[map[k]] = dto[k];
    }
    a.upBy = dto.up_by;
    await this.eaRepo.save(a);
    return { flag: true, ms: 'แก้ไขประกาศเรียบร้อย' };
  }

  async publish(
    dto: { ea_id: number; egp_url?: string; up_by: number },
    user?: JwtUser,
  ) {
    const a = await this.eaRepo.findOne({ where: { eaId: dto.ea_id, del: 0 } });
    if (!a) return { flag: false, ms: 'ไม่พบประกาศ' };
    if (user) assertSameSchool(user, a.scId);
    if (a.status !== 0) return { flag: false, ms: 'ประกาศนี้เผยแพร่แล้ว' };
    a.status = 1;
    if (dto.egp_url) a.egpUrl = dto.egp_url;
    a.upBy = dto.up_by;
    await this.eaRepo.save(a);
    return { flag: true, ms: 'เผยแพร่ประกาศเรียบร้อย' };
  }

  async close(eaId: number, upBy: number, user?: JwtUser) {
    const a = await this.eaRepo.findOne({ where: { eaId, del: 0 } });
    if (!a) return { flag: false, ms: 'ไม่พบประกาศ' };
    if (user) assertSameSchool(user, a.scId);
    a.status = 2;
    a.upBy = upBy;
    await this.eaRepo.save(a);
    return { flag: true, ms: 'ปิดประกาศเรียบร้อย' };
  }

  async cancel(eaId: number, reason: string, upBy: number, user?: JwtUser) {
    const a = await this.eaRepo.findOne({ where: { eaId, del: 0 } });
    if (!a) return { flag: false, ms: 'ไม่พบประกาศ' };
    if (user) assertSameSchool(user, a.scId);
    a.status = 9;
    a.note = reason;
    a.upBy = upBy;
    await this.eaRepo.save(a);
    return { flag: true, ms: 'ยกเลิกประกาศเรียบร้อย' };
  }

  async remove(eaId: number, upBy: number, user?: JwtUser) {
    const a = await this.eaRepo.findOne({ where: { eaId, del: 0 } });
    if (!a) return { flag: false, ms: 'ไม่พบประกาศ' };
    if (user) assertSameSchool(user, a.scId);
    if (a.status === 1)
      return { flag: false, ms: 'เผยแพร่แล้ว ลบไม่ได้ — ใช้ยกเลิกแทน' };
    a.del = 1;
    a.upBy = upBy;
    await this.eaRepo.save(a);
    return { flag: true, ms: 'ลบเรียบร้อย' };
  }
}
