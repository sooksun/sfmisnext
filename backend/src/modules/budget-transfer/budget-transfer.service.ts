import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetTransfer } from './entities/budget-transfer.entity';
import {
  AddBudgetTransferDto,
  ApproveBudgetTransferDto,
  RejectBudgetTransferDto,
} from './dto/budget-transfer.dto';

const STATUS_NAMES: Record<number, string> = {
  0: 'ร่าง',
  1: 'รออนุมัติ',
  2: 'อนุมัติแล้ว',
  3: 'ไม่อนุมัติ',
  9: 'ยกเลิก',
};

function toNum(v: any): number {
  return v == null ? 0 : Number(v);
}

@Injectable()
export class BudgetTransferService {
  constructor(
    @InjectRepository(BudgetTransfer)
    private readonly btRepo: Repository<BudgetTransfer>,
  ) {}

  async load(scId: number, budgetYear: number) {
    const items = await this.btRepo.find({
      where: { scId, budgetYear, del: 0 },
      order: { btId: 'DESC' },
    });
    return {
      data: items.map((b) => ({
        bt_id: b.btId,
        bt_no: b.btNo,
        bt_date: b.btDate,
        from_category_id: b.fromCategoryId,
        from_project_id: b.fromProjectId,
        to_category_id: b.toCategoryId,
        to_project_id: b.toProjectId,
        amount: toNum(b.amount),
        reason: b.reason,
        status: b.status,
        status_name: STATUS_NAMES[b.status] ?? '',
        approved_by: b.approvedBy,
        approved_date: b.approvedDate,
        note: b.note,
        create_date: b.createDate,
      })),
      count: items.length,
    };
  }

  async add(dto: AddBudgetTransferDto) {
    if (
      dto.from_category_id === dto.to_category_id &&
      dto.from_project_id === dto.to_project_id
    ) {
      return { flag: false, ms: 'ต้นทางและปลายทางต้องไม่เหมือนกัน' };
    }
    const last = await this.btRepo.findOne({
      where: { scId: dto.sc_id, budgetYear: dto.budget_year, del: 0 },
      order: { btId: 'DESC' },
    });
    const seq = last ? Number(last.btNo.split('/')[0] ?? 0) + 1 : 1;
    const btNo = `${seq}/${dto.budget_year}`;

    const bt = this.btRepo.create({
      btNo,
      btDate: dto.bt_date,
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      fromCategoryId: dto.from_category_id,
      fromProjectId: dto.from_project_id ?? null,
      toCategoryId: dto.to_category_id,
      toProjectId: dto.to_project_id ?? null,
      amount: dto.amount,
      reason: dto.reason,
      requestedBy: dto.requested_by ?? dto.up_by,
      status: dto.status ?? 1,
      note: dto.note ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.btRepo.save(bt);
    return { flag: true, ms: `สร้างคำขอโอนงบ ${btNo} เรียบร้อยแล้ว` };
  }

  async approve(dto: ApproveBudgetTransferDto) {
    const bt = await this.btRepo.findOne({
      where: { btId: dto.bt_id, del: 0 },
    });
    if (!bt) return { flag: false, ms: 'ไม่พบคำขอ' };
    if (bt.status !== 1)
      return { flag: false, ms: 'สถานะปัจจุบันไม่สามารถอนุมัติได้' };
    bt.status = 2;
    bt.approvedBy = dto.approved_by;
    bt.approvedDate = dto.approved_date;
    if (dto.note) bt.note = dto.note;
    bt.upBy = dto.approved_by;
    await this.btRepo.save(bt);
    return { flag: true, ms: 'อนุมัติการโอนงบเรียบร้อย' };
  }

  async reject(dto: RejectBudgetTransferDto) {
    const bt = await this.btRepo.findOne({
      where: { btId: dto.bt_id, del: 0 },
    });
    if (!bt) return { flag: false, ms: 'ไม่พบคำขอ' };
    bt.status = 3;
    bt.approvedBy = dto.approved_by;
    bt.note = dto.note;
    bt.upBy = dto.approved_by;
    await this.btRepo.save(bt);
    return { flag: true, ms: 'บันทึกการไม่อนุมัติเรียบร้อย' };
  }

  async cancel(btId: number, upBy: number) {
    const bt = await this.btRepo.findOne({ where: { btId, del: 0 } });
    if (!bt) return { flag: false, ms: 'ไม่พบคำขอ' };
    if (bt.status === 2) return { flag: false, ms: 'อนุมัติแล้ว ยกเลิกไม่ได้' };
    bt.status = 9;
    bt.upBy = upBy;
    await this.btRepo.save(bt);
    return { flag: true, ms: 'ยกเลิกคำขอเรียบร้อย' };
  }
}
