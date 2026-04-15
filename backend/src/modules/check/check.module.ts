import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckController } from './check.controller';
import { CheckService } from './check.service';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Partner } from '../general-db/entities/partner.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestWithdraw,
      Partner,
      Admin,
      BudgetIncomeType,
    ]),
  ],
  controllers: [CheckController],
  providers: [CheckService],
  exports: [CheckService],
})
export class CheckModule {}
