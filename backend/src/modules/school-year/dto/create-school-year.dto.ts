import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateSchoolYearDto {
  @IsInt()
  sy_year: number;

  @IsInt()
  @IsOptional()
  semester?: number;

  @IsDateString()
  sy_date_s: string;

  @IsDateString()
  sy_date_e: string;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  budget_year?: number;

  @IsDateString()
  @IsOptional()
  budget_date_s?: string;

  @IsDateString()
  @IsOptional()
  budget_date_e?: string;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
