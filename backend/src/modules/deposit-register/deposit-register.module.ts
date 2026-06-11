import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositRegister } from './entities/deposit-register.entity';
import { DepositRegisterService } from './deposit-register.service';
import { DepositRegisterController } from './deposit-register.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DepositRegister])],
  controllers: [DepositRegisterController],
  providers: [DepositRegisterService],
})
export class DepositRegisterModule {}
