import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AddLoanAgreementDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
  @IsNumber() borrower_id: number;
  @IsNumber() money_type_id: number;
  @IsOptional() @IsString() purpose?: string;
  @IsNumber() @Min(0) amount: number;
  @IsString() borrow_date: string;
  @IsNumber() loan_category: number; // 1=เดินทาง 2=โครงการ 3=กิจกรรม 4=อื่น
  @IsOptional() @IsNumber() rw_id?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() up_by?: number;
}
