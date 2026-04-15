import { IsInt, IsOptional, IsString } from 'class-validator';

export class CheckClassOnYearDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsString()
  budget_date: string;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
