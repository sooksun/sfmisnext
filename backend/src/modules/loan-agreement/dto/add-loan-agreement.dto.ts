import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AddLoanAgreementDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
  @IsNumber() borrower_id: number;
  @IsOptional() @IsString() borrower_position?: string; // ตำแหน่งผู้ยืม
  @IsOptional() @IsString() affiliation?: string; // สังกัด (โรงเรียน/สพป./เขต)
  @IsOptional() @IsString() province?: string; // จังหวัด
  @IsNumber() money_type_id: number;
  @IsOptional() @IsString() purpose?: string; // เพื่อเป็นค่าใช้จ่ายในการ...
  @IsOptional() @IsString() expense_detail?: string; // รายละเอียดการใช้เงิน
  @IsNumber() @Min(0) amount: number;
  @IsString() borrow_date: string;
  @IsNumber() loan_category: number; // 1=เดินทาง 2=โครงการ 3=กิจกรรม 4=อื่น
  @IsOptional() @IsNumber() due_days?: number; // จำนวนวันส่งใช้ (0=ตาม category)
  @IsOptional() @IsNumber() rw_id?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() up_by?: number;
}
