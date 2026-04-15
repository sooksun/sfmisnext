import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRealBudgetDto {
  @IsInt()
  @Min(1)
  pbc_id: number;

  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsNumber()
  @Min(0)
  real_budget: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
