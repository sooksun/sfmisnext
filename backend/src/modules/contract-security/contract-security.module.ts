import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractSecurity } from './entities/contract-security.entity';
import { ContractPenalty } from './entities/contract-penalty.entity';
import { ContractSecurityController } from './contract-security.controller';
import { ContractSecurityService } from './contract-security.service';
import { SmpDepositEntry } from '../smp-deposit/entities/smp-deposit-entry.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractSecurity,
      ContractPenalty,
      SmpDepositEntry,
      BudgetIncomeType,
    ]),
  ],
  controllers: [ContractSecurityController],
  providers: [ContractSecurityService],
  exports: [ContractSecurityService],
})
export class ContractSecurityModule {}
