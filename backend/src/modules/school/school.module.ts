import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolController } from './school.controller';
import { SchoolLowerController } from './school-lower.controller';
import { BSchoolController } from './b-school.controller';
import { SchoolService } from './school.service';
import { School } from './entities/school.entity';
import { BudgetIncomeTypeSchool } from './entities/budget-income-type-school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([School, BudgetIncomeTypeSchool])],
  controllers: [SchoolController, SchoolLowerController, BSchoolController],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
