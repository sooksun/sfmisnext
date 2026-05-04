import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddOpeningBalanceDto {
  @IsInt() sc_id: number;
  @IsInt() sy_id: number;
  @IsString() budget_year: string;
  @IsString() balance_date: string;
  @IsInt() money_type_id: number;
  @IsOptional() @IsString() money_type_name?: string;
  @IsInt() storage_type: number;
  @IsOptional() @IsInt() bank_account_id?: number;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() remark?: string;
  @IsInt() up_by: number;
}

export class UpdateOpeningBalanceDto {
  @IsInt() ob_id: number;
  @IsString() balance_date: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() remark?: string;
  @IsInt() up_by: number;
}
