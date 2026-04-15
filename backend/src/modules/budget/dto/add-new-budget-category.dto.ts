import { IsInt, IsString, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class AddNewBudgetCategoryDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsInt()
  @Min(1)
  bg_cate_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
