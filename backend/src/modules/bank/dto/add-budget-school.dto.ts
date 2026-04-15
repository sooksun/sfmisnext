import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddBudgetSchoolDto {
  @IsOptional()
  @IsNumber()
  bg_type_school_id?: number;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsNumber()
  ba_id: number;

  @IsNotEmpty()
  @IsNumber()
  bg_type_id: number;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}
