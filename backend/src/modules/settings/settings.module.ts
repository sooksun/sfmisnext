import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { BSettingsController } from './b-settings.controller';
import { BSchoolPolicyController } from './b-school-policy.controller';
import { SettingsService } from './settings.service';
import { MasterScPolicy } from './entities/master-sc-policy.entity';
import { MasterObecPolicy } from './entities/master-obec-policy.entity';
import { MasterSao } from './entities/master-sao.entity';
import { MasterSaoPolicy } from './entities/master-sao-policy.entity';
import { MasterMoePolicy } from './entities/master-moe-policy.entity';
import { MasterQuickWin } from './entities/master-quick-win.entity';
import { MasterCbLevel } from './entities/master-cb-level.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MasterScPolicy,
      MasterObecPolicy,
      MasterSao,
      MasterSaoPolicy,
      MasterMoePolicy,
      MasterQuickWin,
      MasterCbLevel,
      BudgetIncomeType,
    ]),
  ],
  controllers: [
    SettingsController,
    BSettingsController,
    BSchoolPolicyController,
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
