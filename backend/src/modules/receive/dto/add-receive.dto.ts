import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveDetailItem {
  @IsOptional()
  @IsNumber()
  prd_id?: number;

  @IsNotEmpty()
  @IsNumber()
  bg_type_id: number;

  @IsOptional()
  @IsString()
  prd_detail?: string;

  @IsNotEmpty()
  @IsNumber()
  prd_budget: number;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}

export class AddReceiveDto {
  @IsOptional()
  @IsNumber()
  pr_id?: number;

  @IsOptional()
  @IsString()
  pr_no?: string;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsOptional()
  @IsString()
  receive_form?: string;

  @IsNotEmpty()
  @IsNumber()
  sy_id: number;

  @IsNotEmpty()
  @IsString()
  budget_year: string;

  @IsOptional()
  @IsNumber()
  user_receive?: number;

  @IsOptional()
  @IsNumber()
  receive_money_type?: number;

  // Simple form fields from frontend
  @IsOptional()
  @IsNumber()
  budget_type_id?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNotEmpty()
  @IsDateString()
  receive_date: string;

  @IsOptional()
  @IsNumber()
  cf_transaction?: number;

  @IsOptional()
  @IsNumber()
  up_by?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveDetailItem)
  receiveList?: ReceiveDetailItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveDetailItem)
  receiveList_del?: ReceiveDetailItem[];
}
