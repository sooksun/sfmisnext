import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardTypoController } from './dashboard-typo.controller';
import { DashboardService } from './dashboard.service';
import { SchoolYear } from '../school-year/entities/school-year.entity';
import { School } from '../school/entities/school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolYear, School])],
  controllers: [DashboardController, DashboardTypoController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
