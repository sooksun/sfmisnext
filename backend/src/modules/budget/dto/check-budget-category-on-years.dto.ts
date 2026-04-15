import { IsInt, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class CheckBudgetCategoryOnYearsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pbc_id?: number;

  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_date: string;
}
