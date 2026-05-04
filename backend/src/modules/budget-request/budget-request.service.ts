import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetRequest } from './entities/budget-request.entity';
import {
  AddBudgetRequestDto,
  UpdateBudgetRequestDto,
} from './dto/add-budget-request.dto';

@Injectable()
export class BudgetRequestService {
  constructor(
    @InjectRepository(BudgetRequest)
    private readonly repo: Repository<BudgetRequest>,
  ) {}

  async loadBudgetRequests(scId: number, syId: number, budgetYear: string) {
    return this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { brSeq: 'ASC' },
    });
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
      amount: dto.amount,
      sendDate: dto.send_date ?? null,
      remark: dto.remark ?? null,
      upBy: dto.up_by,
      del: 0,
    });

    await this.repo.save(entity);
    return { flag: true, ms: 'บันทึกสำเร็จ' };
  }

  async updateBudgetRequest(dto: UpdateBudgetRequestDto) {
    await this.repo.update(
      { brId: dto.br_id },
      {
        actionDate: dto.action_date,
        creditorName: dto.creditor_name,
        expenseType: dto.expense_type,
        amount: dto.amount,
        sendDate: dto.send_date ?? null,
        remark: dto.remark ?? null,
        upBy: dto.up_by,
      },
    );
    return { flag: true, ms: 'แก้ไขสำเร็จ' };
  }

  async markSent(brId: number, sendDate: string, upBy: number) {
    await this.repo.update({ brId }, { sendDate, upBy });
    return { flag: true, ms: 'บันทึกวันที่ส่งสำเร็จ' };
  }

  async deleteBudgetRequest(brId: number, upBy: number) {
    await this.repo.update({ brId }, { del: 1, upBy });
    return { flag: true, ms: 'ลบสำเร็จ' };
  }
}
