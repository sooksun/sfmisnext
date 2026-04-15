import { IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateEstimateDto {
  @IsInt()
  @Min(1)
  ea_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sc_id?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ea_status?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  real_budget?: number;
}
