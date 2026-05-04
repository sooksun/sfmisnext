import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpeningBalance } from './entities/opening-balance.entity';
import {
  AddOpeningBalanceDto,
  UpdateOpeningBalanceDto,
} from './dto/opening-balance.dto';

@Injectable()
export class OpeningBalanceService {
  constructor(
    @InjectRepository(OpeningBalance)
    private readonly repo: Repository<OpeningBalance>,
  ) {}

  async loadOpeningBalances(scId: number, syId: number, budgetYear: string) {
    return this.repo.find({
      where: { scId, syId, budgetYear, del: 0 },
      order: { moneyTypeId: 'ASC', storageType: 'ASC' },
    });
  }

  async addOpeningBalance(dto: AddOpeningBalanceDto) {
    const entity = this.repo.create({
      scId: dto.sc_id,
      syId: dto.sy_id,
      budgetYear: dto.budget_year,
      balanceDate: dto.balance_date,
      moneyTypeId: dto.money_type_id,
      moneyTypeName: dto.money_type_name ?? null,
      storageType: dto.storage_type,
      bankAccountId: dto.bank_account_id ?? null,
      amount: dto.amount,
      remark: dto.remark ?? null,
      upBy: dto.up_by,
      del: 0,
    });
    await this.repo.save(entity);
    return { flag: true, ms: 'บันทึกยอดยกมาสำเร็จ' };
  }

  async updateOpeningBalance(dto: UpdateOpeningBalanceDto) {
    await this.repo.update(
      { obId: dto.ob_id },
      {
        balanceDate: dto.balance_date,
        amount: dto.amount,
        remark: dto.remark ?? null,
        upBy: dto.up_by,
      },
    );
    return { flag: true, ms: 'แก้ไขยอดยกมาสำเร็จ' };
  }

  async deleteOpeningBalance(obId: number, upBy: number) {
    await this.repo.update({ obId }, { del: 1, upBy });
    return { flag: true, ms: 'ลบสำเร็จ' };
  }

  /** สรุปยอดยกมาแยกตามประเภทเงิน สำหรับ daily-balance report */
  async getSummaryByMoneyType(scId: number, budgetYear: string) {
    return this.repo
      .createQueryBuilder('ob')
      .select('ob.moneyTypeId', 'moneyTypeId')
      .addSelect('ob.moneyTypeName', 'moneyTypeName')
      .addSelect('ob.storageType', 'storageType')
      .addSelect('SUM(ob.amount)', 'totalAmount')
      .where('ob.scId = :scId AND ob.budgetYear = :budgetYear AND ob.del = 0', {
        scId,
        budgetYear,
      })
      .groupBy('ob.moneyTypeId')
      .addGroupBy('ob.storageType')
      .getRawMany();
  }
}
