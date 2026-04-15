import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { AddStudentDto } from './dto/add-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CheckSendRecordDto } from './dto/check-send-record.dto';
import { ConfirmSendRecordDto } from './dto/confirm-send-record.dto';
import { CheckClassOnYearDto } from './dto/check-class-on-year.dto';
import { AddClassroomBudgetDto } from './dto/add-classroom-budget.dto';
import { UpdateClassroomBudgetDto } from './dto/update-classroom-budget.dto';
import { SetBudgetAllocationDto } from './dto/set-budget-allocation.dto';
import { SetPerheadRateDto } from './dto/set-perhead-rate.dto';

@Controller('Student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('loadStudent/:sy_id/:budget_year/:sc_id/:page/:page_size')
  @HttpCode(HttpStatus.OK)
  loadStudent(
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('page_size', ParseIntPipe) pageSize: number,
  ) {
    return this.studentService.loadStudent(
      syId,
      budgetYear,
      scId,
      page,
      pageSize,
    );
  }

  @Post('addStudent')
  @HttpCode(HttpStatus.OK)
  addStudent(@Body() payload: AddStudentDto) {
    return this.studentService.addStudent(payload);
  }

  @Post('updateStudent')
  @HttpCode(HttpStatus.OK)
  updateStudent(@Body() payload: UpdateStudentDto) {
    return this.studentService.updateStudent(payload);
  }

  @Get('loadClassroom')
  @HttpCode(HttpStatus.OK)
  loadClassroom() {
    return this.studentService.loadClassroom();
  }

  @Post('checkSendRecord')
  @HttpCode(HttpStatus.OK)
  checkSendRecord(@Body() payload: CheckSendRecordDto) {
    return this.studentService.checkSendRecord(payload);
  }

  @Post('confirmSendRecord')
  @HttpCode(HttpStatus.OK)
  confirmSendRecord(@Body() payload: ConfirmSendRecordDto) {
    return this.studentService.confirmSendRecord(payload);
  }

  @Post('checkClassOnYear')
  @HttpCode(HttpStatus.OK)
  checkClassOnYear(@Body() payload: CheckClassOnYearDto) {
    return this.studentService.checkClassOnYear(payload);
  }

  @Get('loadCalculatePerhead/:sc_id/:year')
  @HttpCode(HttpStatus.OK)
  loadCalculatePerhead(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.studentService.loadCalculatePerhead(scId, year);
  }

  @Post('addClassroomBudget')
  @HttpCode(HttpStatus.OK)
  addClassroomBudget(@Body() payload: AddClassroomBudgetDto) {
    return this.studentService.addClassroomBudget(payload);
  }

  @Post('updateClassroomBudget')
  @HttpCode(HttpStatus.OK)
  updateClassroomBudget(@Body() payload: UpdateClassroomBudgetDto) {
    return this.studentService.updateClassroomBudget(payload);
  }

  @Get('loadBudgetAllocation/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadBudgetAllocation(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.studentService.loadBudgetAllocation(scId, syId);
  }

  @Post('setBudgetAllocation')
  @HttpCode(HttpStatus.OK)
  setBudgetAllocation(@Body() payload: SetBudgetAllocationDto) {
    return this.studentService.setBudgetAllocation(payload);
  }

  @Get('loadPerheadRateSetting/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadPerheadRateSetting(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.studentService.loadPerheadRateSetting(scId, syId);
  }

  @Post('setPerheadRate')
  @HttpCode(HttpStatus.OK)
  setPerheadRate(@Body() payload: SetPerheadRateDto) {
    return this.studentService.setPerheadRate(payload);
  }
}
