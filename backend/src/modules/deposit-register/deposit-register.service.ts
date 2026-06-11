import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositRegister } from './entities/deposit-register.entity';
import {
  AddDepositRegisterDto,
  UpdateDepositRegisterDto,
} from './dto/deposit-register.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class DepositRegisterService {
  constructor(
    @InjectRepository(DepositRegister)
    private readonly repo: Repository<DepositRegister>,
  ) {}

  async load(scId: number, syId: number, budgetYear: string) {
    const rows = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { seq: 'ASC' },
    });
    return rows.map((r) => ({
      dr_id: r.drId,
      seq: r.seq,
      item_name: r.itemName,
      deposit_kind: r.depositKind,
      receive_date: r.receiveDate,
      receive_doc_no: r.receiveDocNo,
      receive_amount: r.receiveAmount,
      deposit_date: r.depositDate,
      deposit_doc_no: r.depositDocNo,
      deposit_amount: r.depositAmount,
      due_date: r.dueDate,
      return_date: r.returnDate,
      // เปิด/ปิด: ยังไม่คืน = เปิดอยู่
      is_open: !r.returnDate,
      note: r.note,
    }));
  }

  private fields(dto: AddDepositRegisterDto) {
    // แปลงค่าว่าง ("") → null สำหรับคอลัมน์ DATE (MySQL ไม่รับ empty string)
    const d = (v?: string | null) => (v ? v : null);
    return {
      itemName: dto.item_name ?? null,
      depositKind: dto.deposit_kind ?? null,
      receiveDate: d(dto.receive_date),
      receiveDocNo: dto.receive_doc_no ?? null,
      receiveAmount: dto.receive_amount ?? 0,
      depositDate: d(dto.deposit_date),
      depositDocNo: dto.deposit_doc_no ?? null,
      depositAmount: dto.deposit_amount ?? 0,
      dueDate: d(dto.due_date),
      returnDate: d(dto.return_date),
      note: dto.note ?? null,
      upBy: dto.up_by,
    };
  }

  async add(dto: AddDepositRegisterDto) {
    const maxSeq = await this.repo
      .createQueryBuilder('dr')
      .select('MAX(dr.seq)', 'max')
      .where('dr.scId = :scId AND dr.budgetYear = :by AND dr.del = 0', {
        scId: dto.sc_id,
        by: dto.budget_year,
      })
      .getRawOne<{ max: number | null }>();

    const entity = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      seq: (maxSeq?.max ?? 0) + 1,
      del: 0,
      ...this.fields(dto),
    });
    await this.repo.save(entity);
    return { flag: true, ms: 'บันทึกสำเร็จ' };
  }

  async update(dto: UpdateDepositRegisterDto, user?: JwtUser) {
    if (user) {
      const row = await this.repo.findOne({ where: { drId: dto.dr_id } });
      if (row) assertSameSchool(user, row.scId);
    }
    await this.repo.update({ drId: dto.dr_id }, this.fields(dto));
    return { flag: true, ms: 'แก้ไขสำเร็จ' };
  }

  async remove(drId: number, upBy: number, user?: JwtUser) {
    if (user) {
      const row = await this.repo.findOne({ where: { drId } });
      if (row) assertSameSchool(user, row.scId);
    }
    await this.repo.update({ drId }, { del: 1, upBy });
    return { flag: true, ms: 'ลบสำเร็จ' };
  }
}
