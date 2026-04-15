import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  proj_name: string;

  @IsString()
  @IsOptional()
  proj_detail?: string;

  @IsNumber()
  @IsOptional()
  proj_budget?: number;

  @IsInt()
  @IsOptional()
  pbc_id?: number;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  sy_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
