import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashKeepingCommittee } from './entities/cash-keeping-committee.entity';
import { CashCommitteeService } from './cash-committee.service';
import { CashCommitteeController } from './cash-committee.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashKeepingCommittee])],
  controllers: [CashCommitteeController],
  providers: [CashCommitteeService],
})
export class CashCommitteeModule {}
