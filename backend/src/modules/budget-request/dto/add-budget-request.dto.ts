import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddBudgetRequestDto {
  @IsInt() sc_id: number;
  @IsInt() sy_id: number;
  @IsString() budget_year: string;
  @IsString() action_date: string;
  @IsString() creditor_name: string;
  @IsInt() expense_type: number;
  @IsOptional() @IsString() expense_type_text?: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() send_date?: string;
  @IsOptional() @IsString() remark?: string;
  @IsInt() up_by: number;
}

export class UpdateBudgetRequestDto {
  @IsInt() br_id: number;
  @IsString() action_date: string;
  @IsString() creditor_name: string;
  @IsInt() expense_type: number;
  @IsOptional() @IsString() expense_type_text?: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() send_date?: string;
  @IsOptional() @IsString() remark?: string;
  @IsInt() up_by: number;
}
