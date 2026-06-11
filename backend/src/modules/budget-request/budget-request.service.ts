import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetRequest } from './entities/budget-request.entity';
import { BudgetExpenseType } from './entities/budget-expense-type.entity';
import {
  AddBudgetRequestDto,
  UpdateBudgetRequestDto,
} from './dto/add-budget-request.dto';
import {
  AddExpenseTypeDto,
  DeleteExpenseTypeDto,
} from './dto/expense-type.dto';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Injectable()
export class BudgetRequestService {
  constructor(
    @InjectRepository(BudgetRequest)
    private readonly repo: Repository<BudgetRequest>,
    @InjectRepository(BudgetExpenseType)
    private readonly typeRepo: Repository<BudgetExpenseType>,
  ) {}

  // ─── ประเภทรายจ่าย (master) รายโรงเรียน ──────────────────────────────────

  async loadExpenseTypes(scId: number) {
    const rows = await this.typeRepo.find({
      where: { scId, del: 0 },
      order: { sortOrder: 'ASC', betId: 'ASC' },
    });
    return rows.map((r) => ({ bet_id: r.betId, name: r.name }));
  }

  async addExpenseType(dto: AddExpenseTypeDto) {
    const name = dto.name.trim();
    const dup = await this.typeRepo.findOne({
      where: { scId: dto.sc_id, name, del: 0 },
    });
    if (dup) return { flag: false, ms: 'มีประเภทรายจ่ายนี้อยู่แล้ว' };

    const maxSort = await this.typeRepo
      .createQueryBuilder('t')
      .select('MAX(t.sortOrder)', 'max')
      .where('t.scId = :scId AND t.del = 0', { scId: dto.sc_id })
      .getRawOne<{ max: number | null }>();

    const entity = this.typeRepo.create({
      scId: dto.sc_id,
      name,
      sortOrder: (maxSort?.max ?? 0) + 1,
      upBy: dto.up_by,
      del: 0,
    });
    await this.typeRepo.save(entity);
    return { flag: true, ms: 'เพิ่มประเภทรายจ่ายสำเร็จ' };
  }

  async deleteExpenseType(dto: DeleteExpenseTypeDto, user?: JwtUser) {
    if (user) {
      const row = await this.typeRepo.findOne({
        where: { betId: dto.bet_id },
      });
      if (row) assertSameSchool(user, row.scId);
    }
    await this.typeRepo.update(
      { betId: dto.bet_id },
      { del: 1, upBy: dto.up_by },
    );
    return { flag: true, ms: 'ลบประเภทรายจ่ายสำเร็จ' };
  }

  async loadBudgetRequests(scId: number, syId: number, budgetYear: string) {
    const rows = await this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { brSeq: 'ASC' },
    });
    // map → snake_case ให้ตรงกับที่ frontend อ่าน (repo.find คืน property แบบ camelCase)
    return rows.map((r) => ({
      br_id: r.brId,
      br_seq: r.brSeq,
      action_date: r.actionDate,
      creditor_name: r.creditorName,
      expense_type: r.expenseType,
      expense_type_text: r.expenseTypeText,
      amount: r.amount,
      status: r.status,
      send_date: r.sendDate,
      paid_date: r.paidDate,
      remark: r.remark,
    }));
  }

  async addBudgetRequest(dto: AddBudgetRequestDto) {
    const maxSeq = await this.repo
      .createQueryBuilder('br')
      .select('MAX(br.brSeq)', 'max')
      .where('br.scId = :scId AND br.budgetYear = :budgetYear AND br.del = 0', {
        scId: dto.sc_id,
        budgetYear: dto.budget_year,
      })
      .getRawOne();

    const nextSeq = (maxSeq?.max ?? 0) + 1;

    const entity = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      brSeq: nextSeq,
      actionDate: dto.action_date,
      creditorName: dto.creditor_name,
      expenseType: dto.expense_type,
      expenseTypeText: dto.expense_type_text ?? null,
      amount: dto.amount,
      sendDate: dto.send_date ?? null,
      remark: dto.remark ?? null,
      upBy: dto.up_by,
      del: 0,
    });

    await this.repo.save(entity);
    return { flag: true, ms: 'บันทึกสำเร็จ' };
  }

  async updateBudgetRequest(dto: UpdateBudgetRequestDto, user?: JwtUser) {
    // หมายเหตุ: ไม่แตะ status / send_date / paid_date — จัดการผ่าน updateStatus เท่านั้น
    if (user) {
      const row = await this.repo.findOne({ where: { brId: dto.br_id } });
      if (row) assertSameSchool(user, row.scId);
    }
    await this.repo.update(
      { brId: dto.br_id },
      {
        actionDate: dto.action_date,
        creditorName: dto.creditor_name,
        expenseType: dto.expense_type,
        expenseTypeText: dto.expense_type_text ?? null,
        amount: dto.amount,
        remark: dto.remark ?? null,
        upBy: dto.up_by,
      },
    );
    return { flag: true, ms: 'แก้ไขสำเร็จ' };
  }

  /**
   * เปลี่ยนสถานะเอกสาร: 0=รอส่งเบิก 1=ส่งเบิก 2=โอนเงินแล้ว 3=ยกเลิก
   *  - ส่งเบิก (1) → บันทึก send_date
   *  - โอนเงินแล้ว (2) → บันทึก paid_date
   *  - รอส่งเบิก (0) → ล้างวันที่ทั้งสอง (คืนสถานะต้น)
   *  - ยกเลิก (3) → คงวันที่เดิมไว้
   */
  async updateStatus(
    brId: number,
    status: number,
    date: string | null,
    upBy: number,
    user?: JwtUser,
  ) {
    if (user) {
      const row = await this.repo.findOne({ where: { brId } });
      if (row) assertSameSchool(user, row.scId);
    }
    const patch: Record<string, unknown> = { status, upBy };
    if (status === 1) patch.sendDate = date ?? null;
    if (status === 2) patch.paidDate = date ?? null;
    if (status === 0) {
      patch.sendDate = null;
      patch.paidDate = null;
    }
    await this.repo.update({ brId }, patch);
    return { flag: true, ms: 'อัปเดตสถานะสำเร็จ' };
  }

  async deleteBudgetRequest(brId: number, upBy: number, user?: JwtUser) {
    if (user) {
      const row = await this.repo.findOne({ where: { brId } });
      if (row) assertSameSchool(user, row.scId);
    }
    await this.repo.update({ brId }, { del: 1, upBy });
    return { flag: true, ms: 'ลบสำเร็จ' };
  }
}
