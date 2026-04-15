import { IsInt, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class CheckBudgetCategoryOnYearDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_date: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
