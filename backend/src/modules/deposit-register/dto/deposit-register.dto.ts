import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddDepositRegisterDto {
  @IsInt() sc_id: number;
  @IsInt() sy_id: number;
  @IsString() budget_year: string;
  @IsOptional() @IsString() item_name?: string;
  @IsOptional() @IsString() deposit_kind?: string;
  @IsOptional() @IsString() receive_date?: string;
  @IsOptional() @IsString() receive_doc_no?: string;
  @IsOptional() @IsNumber() @Min(0) receive_amount?: number;
  @IsOptional() @IsString() deposit_date?: string;
  @IsOptional() @IsString() deposit_doc_no?: string;
  @IsOptional() @IsNumber() @Min(0) deposit_amount?: number;
  @IsOptional() @IsString() due_date?: string;
  @IsOptional() @IsString() return_date?: string;
  @IsOptional() @IsString() note?: string;
  @IsInt() up_by: number;
}

export class UpdateDepositRegisterDto extends AddDepositRegisterDto {
  @IsInt() dr_id: number;
}
