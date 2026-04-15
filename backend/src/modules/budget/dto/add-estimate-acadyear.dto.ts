import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class AddEstimateAcadyearDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsInt()
  @Min(1)
  sy_id: number;

  @IsString()
  @IsNotEmpty()
  budget_year: string;

  @IsNumber()
  @Min(0)
  ea_budget: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ea_status?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
