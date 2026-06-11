import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { BankReconciliationItem } from './entities/bank-reconciliation-item.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

const ITEM_TYPE_NAMES: Record<number, string> = {
  1: 'เช็คค้างขึ้น',
  2: 'เงินฝากระหว่างทาง',
  3: 'รายการอื่น',
};

const LOCKED_MS = 'งบเทียบยอดนี้ลงนามรับรองแล้ว ไม่สามารถแก้ไขได้';

/**
 * คำนวณงบเทียบยอดแบบ "ปรับฝั่งธนาคาร" ตามแบบราชการ (งบพิสูจน์ยอดเงินฝากธนาคาร):
 *   ยอดธนาคารหลังปรับ = bank statement − เช็คค้างขึ้น (type 1) + เงินฝากระหว่างทาง/อื่น (type ≠ 1)
 *   ผลต่าง           = ยอดธนาคารหลังปรับ − ยอดสมุดบัญชีโรงเรียน  (ควร = 0)
 *
 * ใช้ Math.abs() กับจำนวนเงิน → ผู้ใช้กรอกค่าบวกเสมอ ระบบหัก/บวกให้ตาม item_type
 * (ทนต่อข้อมูลเดิมที่อาจเก็บค่าติดลบไว้ด้วย) และตรงกับฟอร์มที่พิมพ์ออกทุกตัวเลข
 */
function computeBalances(
  r: BankReconciliation,
  items: BankReconciliationItem[],
) {
  const active = items.filter((i) => i.del === 0);
  const checkTotal = active
    .filter((i) => i.itemType === 1)
    .reduce((s, i) => s + Math.abs(i.amount), 0);
  const depositTotal = active
    .filter((i) => i.itemType !== 1)
    .reduce((s, i) => s + Math.abs(i.amount), 0);
  const adjustmentTotal = depositTotal - checkTotal;
  const adjustedBalance = r.bankStatementBalance + adjustmentTotal;
  const difference = adjustedBalance - r.bookBalance;
  return {
    adjustmentTotal,
    adjustedBalance,
    difference,
    isBalanced: Math.abs(difference) < 0.01 ? 1 : 0,
  };
}

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectRepository(BankReconciliation)
    private readonly reconRepo: Repository<BankReconciliation>,
    @InjectRepository(BankReconciliationItem)
    private readonly itemRepo: Repository<BankReconciliationItem>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) {}

  async loadReconciliations(scId: number, baId: number) {
    const recons = await this.reconRepo.find({
      where: { scId, baId, del: 0 },
      order: { reconMonth: 'DESC' },
    });
    return recons.map((r) => ({
      br_id: r.brId,
      sc_id: r.scId,
      ba_id: r.baId,
      recon_month: r.reconMonth,
      book_balance: r.bookBalance,
      bank_statement_balance: r.bankStatementBalance,
      adjustment_total: r.adjustmentTotal,
      adjusted_book_balance: r.adjustedBookBalance,
      difference: r.difference,
      is_balanced: r.isBalanced === 1,
      note: r.note,
      signed_by: r.signedBy,
      signed_name: r.signedName,
      signed_at: r.signedAt,
      create_date: r.createDate,
    }));
  }

  async loadDetail(brId: number, user?: JwtUser) {
    const recon = await this.reconRepo.findOne({ where: { brId, del: 0 } });
    if (!recon) return null;
    if (user) assertSameSchool(user, recon.scId);
    const items = await this.itemRepo.find({
      where: { brId, del: 0 },
      order: { briId: 'ASC' },
    });
    return {
      br_id: recon.brId,
      sc_id: recon.scId,
      ba_id: recon.baId,
      recon_month: recon.reconMonth,
      book_balance: recon.bookBalance,
      bank_statement_balance: recon.bankStatementBalance,
      adjustment_total: recon.adjustmentTotal,
      adjusted_book_balance: recon.adjustedBookBalance,
      difference: recon.difference,
      is_balanced: recon.isBalanced === 1,
      note: recon.note,
      signed_name: recon.signedName,
      signed_at: recon.signedAt,
      items: items.map((i) => ({
        bri_id: i.briId,
        br_id: i.brId,
        item_type: i.itemType,
        item_type_name: ITEM_TYPE_NAMES[i.itemType] ?? '',
        doc_ref: i.docRef,
        detail: i.detail,
        amount: i.amount,
      })),
    };
  }

  async createOrUpdate(dto: {
    sc_id: number;
    ba_id: number;
    recon_month: string;
    book_balance: number;
    bank_statement_balance: number;
    note?: string;
    up_by?: number;
  }) {
    let recon = await this.reconRepo.findOne({
      where: {
        scId: dto.sc_id,
        baId: dto.ba_id,
        reconMonth: dto.recon_month,
        del: 0,
      },
    });
    if (recon?.signedAt) return { flag: false, ms: LOCKED_MS };
    if (!recon) {
      recon = this.reconRepo.create({
        scId: dto.sc_id,
        baId: dto.ba_id,
        reconMonth: dto.recon_month,
        del: 0,
        upBy: dto.up_by ?? 0,
      });
    }
    recon.bookBalance = dto.book_balance;
    recon.bankStatementBalance = dto.bank_statement_balance;
    recon.note = dto.note ?? null;
    recon.upBy = dto.up_by ?? 0;

    // recompute
    const items = await this.itemRepo.find({
      where: { brId: recon.brId ?? 0, del: 0 },
    });
    const comp = computeBalances(recon, items);
    recon.adjustmentTotal = comp.adjustmentTotal;
    recon.adjustedBookBalance = comp.adjustedBalance;
    recon.difference = comp.difference;
    recon.isBalanced = comp.isBalanced;

    await this.reconRepo.save(recon);
    return {
      flag: true,
      ms: 'บันทึกงบเทียบยอดเรียบร้อยแล้ว',
      br_id: recon.brId,
    };
  }

  async addItem(
    dto: {
      br_id: number;
      item_type: number;
      doc_ref?: string;
      detail?: string;
      amount: number;
      up_by?: number;
    },
    user?: JwtUser,
  ) {
    const recon = await this.reconRepo.findOne({
      where: { brId: dto.br_id, del: 0 },
    });
    if (!recon) return { flag: false, ms: 'ไม่พบรายการงบเทียบยอด' };
    if (user) assertSameSchool(user, recon.scId);
    if (recon.signedAt) return { flag: false, ms: LOCKED_MS };

    const item = this.itemRepo.create({
      brId: dto.br_id,
      itemType: dto.item_type,
      docRef: dto.doc_ref ?? null,
      detail: dto.detail ?? null,
      amount: Math.abs(dto.amount),
      upBy: dto.up_by ?? 0,
      del: 0,
    });
    await this.itemRepo.save(item);

    // recompute recon
    const items = await this.itemRepo.find({
      where: { brId: dto.br_id, del: 0 },
    });
    const comp = computeBalances(recon, items);
    recon.adjustmentTotal = comp.adjustmentTotal;
    recon.adjustedBookBalance = comp.adjustedBalance;
    recon.difference = comp.difference;
    recon.isBalanced = comp.isBalanced;
    await this.reconRepo.save(recon);

    return { flag: true, ms: 'เพิ่มรายการปรับปรุงเรียบร้อยแล้ว' };
  }

  async removeItem(briId: number, upBy: number, user?: JwtUser) {
    const item = await this.itemRepo.findOne({ where: { briId, del: 0 } });
    if (!item) return { flag: false, ms: 'ไม่พบรายการ' };

    const recon = await this.reconRepo.findOne({
      where: { brId: item.brId, del: 0 },
    });
    if (user && recon) assertSameSchool(user, recon.scId);
    if (recon?.signedAt) return { flag: false, ms: LOCKED_MS };

    item.del = 1;
    item.upBy = upBy;
    await this.itemRepo.save(item);

    // recompute
    if (recon) {
      const items = await this.itemRepo.find({
        where: { brId: item.brId, del: 0 },
      });
      const comp = computeBalances(recon, items);
      recon.adjustmentTotal = comp.adjustmentTotal;
      recon.adjustedBookBalance = comp.adjustedBalance;
      recon.difference = comp.difference;
      recon.isBalanced = comp.isBalanced;
      await this.reconRepo.save(recon);
    }
    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }

  async signOff(
    dto: { br_id: number; signed_by: number; note?: string },
    user?: JwtUser,
  ) {
    const recon = await this.reconRepo.findOne({
      where: { brId: dto.br_id, del: 0 },
    });
    if (!recon) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, recon.scId);
    if (recon.signedAt)
      return { flag: false, ms: 'ลงนามแล้ว ไม่สามารถแก้ไขได้' };

    const admin = await this.adminRepo.findOne({
      where: { adminId: dto.signed_by },
    });
    recon.signedBy = dto.signed_by;
    recon.signedName = admin?.name ?? admin?.username ?? null;
    recon.signedAt = new Date();
    if (dto.note) recon.note = dto.note;
    await this.reconRepo.save(recon);
    return { flag: true, ms: 'ลงนามรับรองงบเทียบยอดเรียบร้อยแล้ว' };
  }
}
