import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankLedgerEntry } from './entities/bank-ledger-entry.entity';
import { Admin } from '../admin/entities/admin.entity';
import { DeleteLogService } from '../delete-log/delete-log.service';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class BankLedgerService {
  constructor(
    @InjectRepository(BankLedgerEntry)
    private readonly repo: Repository<BankLedgerEntry>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly deleteLogService: DeleteLogService,
  ) {}

  /** โหลดรายการของบัญชีธนาคาร 1 บัญชี พร้อม running balance */
  async loadLedger(scId: number, syId: number, baId: number) {
    const entries = await this.repo.find({
      where: { scId, syId, baId, del: 0 },
      order: { entryDate: 'ASC', bleId: 'ASC' },
    });

    let balance = 0;
    return {
      data: entries.map((e) => {
        if (e.entryType === 1) balance += e.amount;
        else balance -= e.amount;
        return {
          ble_id: e.bleId,
          sc_id: e.scId,
          sy_id: e.syId,
          ba_id: e.baId,
          entry_type: e.entryType,
          entry_type_label: e.entryType === 1 ? 'ฝาก' : 'ถอน',
          doc_no: e.docNo,
          entry_date: e.entryDate,
          detail: e.detail,
          amount: e.amount,
          amount_in: e.entryType === 1 ? e.amount : 0,
          amount_out: e.entryType === 2 ? e.amount : 0,
          balance,
          ref_type: e.refType,
          ref_id: e.refId,
          signer_id: e.signerId,
          signer_name: e.signerName,
          note: e.note,
          up_by: e.upBy,
          create_date: e.createDate,
        };
      }),
      count: entries.length,
    };
  }

  /** สรุปยอดคงเหลือของบัญชี ณ ปัจจุบัน — ใช้ SQL aggregation แทนดึงทุก row */
  async getAccountBalance(scId: number, syId: number, baId: number) {
    const result = await this.repo
      .createQueryBuilder('e')
      .select(
        'SUM(CASE WHEN e.entry_type = 1 THEN e.amount ELSE 0 END)',
        'total_in',
      )
      .addSelect(
        'SUM(CASE WHEN e.entry_type = 2 THEN e.amount ELSE 0 END)',
        'total_out',
      )
      .where(
        'e.sc_id = :scId AND e.sy_id = :syId AND e.ba_id = :baId AND e.del = 0',
        {
          scId,
          syId,
          baId,
        },
      )
      .getRawOne<{ total_in: string | null; total_out: string | null }>();

    const totalIn = Number(result?.total_in ?? 0);
    const totalOut = Number(result?.total_out ?? 0);
    return {
      ba_id: baId,
      total_in: totalIn,
      total_out: totalOut,
      balance: totalIn - totalOut,
    };
  }

  /** สรุปยอดทุกบัญชีของโรงเรียน — ใช้ SQL GROUP BY แทนดึงทุก row */
  async getAllAccountBalances(scId: number, syId: number) {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.ba_id', 'ba_id')
      .addSelect(
        'SUM(CASE WHEN e.entry_type = 1 THEN e.amount ELSE 0 END)',
        'total_in',
      )
      .addSelect(
        'SUM(CASE WHEN e.entry_type = 2 THEN e.amount ELSE 0 END)',
        'total_out',
      )
      .where('e.sc_id = :scId AND e.sy_id = :syId AND e.del = 0', {
        scId,
        syId,
      })
      .groupBy('e.ba_id')
      .getRawMany<{
        ba_id: number;
        total_in: string | null;
        total_out: string | null;
      }>();

    return rows.map((r) => {
      const totalIn = Number(r.total_in ?? 0);
      const totalOut = Number(r.total_out ?? 0);
      return {
        ba_id: r.ba_id,
        total_in: totalIn,
        total_out: totalOut,
        balance: totalIn - totalOut,
      };
    });
  }

  async addEntry(dto: {
    sc_id: number;
    sy_id: number;
    ba_id: number;
    entry_type: number;
    doc_no?: string;
    entry_date?: string;
    detail?: string;
    amount: number;
    ref_type?: string;
    ref_id?: number;
    signer_id?: number;
    note?: string;
    up_by?: number;
  }) {
    // snapshot signer name
    let signerName: string | null = null;
    if (dto.signer_id) {
      const admin = await this.adminRepo.findOne({
        where: { adminId: dto.signer_id },
      });
      if (admin) signerName = admin.name ?? admin.username ?? null;
    }

    const entry = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      baId: dto.ba_id,
      entryType: dto.entry_type,
      docNo: dto.doc_no ?? null,
      entryDate: dto.entry_date ?? null,
      detail: dto.detail ?? null,
      amount: dto.amount,
      refType: dto.ref_type ?? 'manual',
      refId: dto.ref_id ?? null,
      signerId: dto.signer_id ?? null,
      signerName,
      note: dto.note ?? null,
      upBy: dto.up_by ?? 0,
      del: 0,
    });
    await this.repo.save(entry);
    return { flag: true, ms: 'บันทึกรายการเรียบร้อยแล้ว' };
  }

  async updateEntry(bleId: number, dto: any, user?: JwtUser) {
    const entry = await this.repo.findOne({ where: { bleId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, entry.scId);
    if (dto.entry_type !== undefined) entry.entryType = dto.entry_type;
    if (dto.doc_no !== undefined) entry.docNo = dto.doc_no;
    if (dto.entry_date !== undefined) entry.entryDate = dto.entry_date;
    if (dto.detail !== undefined) entry.detail = dto.detail ?? null;
    if (dto.amount !== undefined) entry.amount = dto.amount;
    if (dto.note !== undefined) entry.note = dto.note ?? null;
    if (dto.up_by !== undefined) entry.upBy = dto.up_by;
    await this.repo.save(entry);
    return { flag: true, ms: 'แก้ไขรายการเรียบร้อยแล้ว' };
  }

  async removeEntry(
    bleId: number,
    upBy: number,
    reason?: string,
    user?: JwtUser,
  ) {
    // ลบรายการทะเบียนเงินฝากธนาคารต้องมีเหตุผลประกอบเสมอ (audit trail)
    if (!reason || !String(reason).trim()) {
      return { flag: false, ms: 'กรุณาระบุเหตุผลการลบรายการ' };
    }

    const entry = await this.repo.findOne({ where: { bleId, del: 0 } });
    if (!entry) return { flag: false, ms: 'ไม่พบรายการ' };
    if (user) assertSameSchool(user, entry.scId);

    entry.del = 1;
    entry.upBy = upBy;
    await this.repo.save(entry);

    await this.deleteLogService.log({
      table: 'bank_ledger_entry',
      rowId: bleId,
      reason,
      deletedBy: upBy,
      scId: entry.scId,
      snapshot: {
        ble_id: entry.bleId,
        ba_id: entry.baId,
        entry_type: entry.entryType,
        entry_date: entry.entryDate,
        doc_no: entry.docNo,
        amount: entry.amount,
        detail: entry.detail,
      },
    });

    return { flag: true, ms: 'ลบรายการเรียบร้อยแล้ว' };
  }
}
