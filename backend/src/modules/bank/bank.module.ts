import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankController, BankLowerController } from './bank.controller';
import { BankService } from './bank.service';
import { BankAccount } from './entities/bankaccount.entity';
import { BankDb } from './entities/bank-db.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccount,
      BankDb,
      BudgetIncomeTypeSchool,
      BudgetIncomeType,
    ]),
  ],
  controllers: [BankController, BankLowerController],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule {}
