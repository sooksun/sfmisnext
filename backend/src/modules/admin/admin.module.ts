import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { BAdminController } from './b-admin.controller';
import { AdminService } from './admin.service';
import { Admin } from './entities/admin.entity';
import { MasterLevel } from './entities/master-level.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, MasterLevel]), AuthModule],
  controllers: [AdminController, BAdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
