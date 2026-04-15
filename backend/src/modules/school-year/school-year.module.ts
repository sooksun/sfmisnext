import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearUpperController } from './school-year-upper.controller';
import { BSchoolYearController } from './b-school-year.controller';
import { SchoolYearService } from './school-year.service';
import { SchoolYear } from './entities/school-year.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolYear])],
  controllers: [
    SchoolYearController,
    SchoolYearUpperController,
    BSchoolYearController,
  ],
  providers: [SchoolYearService],
  exports: [SchoolYearService],
})
export class SchoolYearModule {}
