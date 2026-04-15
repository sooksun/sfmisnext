import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BankAccount } from './entities/bankaccount.entity';
import { BankDb } from './entities/bank-db.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { AddBudgetSchoolDto } from './dto/add-budget-school.dto';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(BankDb)
    private readonly bankDbRepository: Repository<BankDb>,
    @InjectRepository(BudgetIncomeTypeSchool)
    private readonly budgetIncomeTypeSchoolRepository: Repository<BudgetIncomeTypeSchool>,
    @InjectRepository(BudgetIncomeType)
    private readonly budgetIncomeTypeRepository: Repository<BudgetIncomeType>,
  ) {}

  async loadBankAccount(scId: number) {
    const accounts = await this.bankAccountRepository.find({
      where: { scId, del: 0 },
      order: { baId: 'ASC' },
    });

    // โหลดข้อมูลธนาคารทั้งหมดครั้งเดียว
    const bankIds = [...new Set(accounts.map((a) => a.bId).filter((id) => id > 0))];
    const banks = bankIds.length > 0
      ? await this.bankDbRepository.find({ where: { bId: In(bankIds) } })
      : [];
    const bankMap = new Map(banks.map((b) => [b.bId, b.bNameL ?? b.bNameS ?? '']));

    return accounts.map((account) => ({
      ba_id: account.baId,
      b_id: account.bId,
      bank_name: bankMap.get(account.bId) ?? '',   // ชื่อธนาคาร
      account_name: account.baName,                 // ชื่อบัญชี
      account_no: account.baNo,                     // เลขที่บัญชี
      ba_name: account.baName,
      ba_no: account.baNo,
      sc_id: account.scId,
      up_by: account.upBy,
      del: account.del,
      create_date: account.createDate,
      update_date: account.updateDate,
    }));
  }

  async loadBankDB() {
    const banks = await this.bankDbRepository.find({
      order: { bId: 'ASC' },
    });

    return banks.map((bank) => ({
      b_id: bank.bId,
      b_name_l: bank.bNameL,
      b_name_s: bank.bNameS,
      b_img: bank.bImg,
    }));
  }

  async checkBindingBankAccount(scId: number) {
    // Count how many budget_income_type_school records exist for this school
    const count = await this.budgetIncomeTypeSchoolRepository.count({
      where: {
        scId,
        del: 0,
      },
    });

    return count;
  }

  async loadBudget() {
    const budgetTypes = await this.budgetIncomeTypeRepository.find({
      where: { del: 0 },
      order: { bgTypeId: 'ASC' },
    });

    return budgetTypes.map((type) => ({
      bg_type_id: type.bgTypeId,
      budget_type: type.budgetType,
      del: type.del,
    }));
  }

  async addBankAccount(dto: AddBankAccountDto) {
    const account = this.bankAccountRepository.create({
      bId: dto.b_id,
      baName: dto.ba_name,
      baNo: dto.ba_no,
      scId: dto.sc_id,
      upBy: dto.up_by || null,
    });

    await this.bankAccountRepository.save(account);

    return { flag: true };
  }

  async updateBankAccount(dto: AddBankAccountDto) {
    if (!dto.ba_id) {
      return { flag: false, ms: 'ไม่พบ ba_id' };
    }

    const account = await this.bankAccountRepository.findOne({
      where: { baId: dto.ba_id, del: 0 },
    });

    if (!account) {
      return { flag: false, ms: 'ไม่พบข้อมูลบัญชีธนาคาร' };
    }

    account.bId = dto.b_id;
    account.baName = dto.ba_name;
    account.baNo = dto.ba_no;
    if (dto.up_by !== undefined) account.upBy = dto.up_by;

    await this.bankAccountRepository.save(account);

    return { flag: true };
  }

  async removeBankAccount(baId: number) {
    const account = await this.bankAccountRepository.findOne({
      where: { baId, del: 0 },
    });

    if (!account) {
      return { flag: false, ms: 'ไม่พบข้อมูลบัญชีธนาคาร' };
    }

    account.del = 1;
    await this.bankAccountRepository.save(account);

    return { flag: true };
  }

  async addBudgetSchool(dto: AddBudgetSchoolDto) {
    // Check if already exists
    const existing = await this.budgetIncomeTypeSchoolRepository.findOne({
      where: {
        scId: dto.sc_id,
        baId: dto.ba_id,
        bgTypeId: dto.bg_type_id,
        del: 0,
      },
    });

    if (existing) {
      // Update existing
      if (dto.bg_type_school_id && dto.bg_type_school_id > 0) {
        existing.upBy = dto.up_by || existing.upBy;
        await this.budgetIncomeTypeSchoolRepository.save(existing);
      }
      return { flag: true };
    }

    const binding = this.budgetIncomeTypeSchoolRepository.create({
      scId: dto.sc_id,
      baId: dto.ba_id,
      bgTypeId: dto.bg_type_id,
      upBy: dto.up_by || null,
    });

    await this.budgetIncomeTypeSchoolRepository.save(binding);

    return { flag: true };
  }
}
