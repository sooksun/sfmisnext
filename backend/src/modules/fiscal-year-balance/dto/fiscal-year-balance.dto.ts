import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveBalanceDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsInt()
  @Min(1)
  money_type_id: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cash_balance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bank_balance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  smp_balance?: number;

  @IsOptional()
  @IsString()
  closing_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  closed_by?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}

export class BalanceItemDto {
  @IsInt()
  @Min(1)
  money_type_id: number;

  @IsNumber()
  @Min(0)
  cash_balance: number;

  @IsNumber()
  @Min(0)
  bank_balance: number;

  @IsNumber()
  @Min(0)
  smp_balance: number;
}

export class SaveBulkBalancesDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsString()
  @IsNotEmpty()
  closing_date: string;

  @IsInt()
  @Min(1)
  closed_by: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BalanceItemDto)
  balances: BalanceItemDto[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}

export class FinalizeYearDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsInt()
  @Min(1)
  signed_by: number;

  @IsOptional()
  @IsString()
  note?: string;
}
