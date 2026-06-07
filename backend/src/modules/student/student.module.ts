import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { Student } from './entities/student.entity';
import { SubmittingStudentRecords } from './entities/submitting-student-records.entity';
import { MasterClassroom } from './entities/master-classroom.entity';
import { MasterClassroomBudget } from './entities/master-classroom-budget.entity';
import { BudgetIncomeType } from '../policy/entities/budget-income-type.entity';
import { BudgetIncomeTypeSchool } from '../bank/entities/budget-income-type-school.entity';
import { SchoolClassroom } from './entities/school-classroom.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      SubmittingStudentRecords,
      MasterClassroom,
      MasterClassroomBudget,
      BudgetIncomeType,
      BudgetIncomeTypeSchool,
      SchoolClassroom,
    ]),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
