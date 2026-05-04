import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractSecurity } from './entities/contract-security.entity';
import { ContractPenalty } from './entities/contract-penalty.entity';
import { ContractSecurityController } from './contract-security.controller';
import { ContractSecurityService } from './contract-security.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContractSecurity, ContractPenalty])],
  controllers: [ContractSecurityController],
  providers: [ContractSecurityService],
  exports: [ContractSecurityService],
})
export class ContractSecurityModule {}
