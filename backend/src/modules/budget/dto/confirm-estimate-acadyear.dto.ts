import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmEstimateAcadyearDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  up_by?: number;
}
