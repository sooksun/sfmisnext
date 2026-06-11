import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SavePrevBalanceRowDto {
  @IsInt() money_type_id: number;
  @IsOptional() @IsString() money_type_name?: string;
  @IsOptional() @IsString() source_budget_year?: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsNumber() finance_amount?: number;
  @IsOptional() @IsString() remark?: string;
}

export class SavePrevBalanceDto {
  @IsInt() sc_id: number;
  @IsInt() sy_id: number;
  @IsString() budget_year: string;
  @IsInt() up_by: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavePrevBalanceRowDto)
  rows: SavePrevBalanceRowDto[];
}

export class DeletePrevBalanceDto {
  @IsInt() ppb_id: number;
  @IsInt() up_by: number;
}
