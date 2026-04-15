import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateClassroomBudgetDto {
  @IsInt()
  @IsOptional()
  crb_id?: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsInt()
  @IsOptional()
  class_id?: number;

  @IsInt()
  @IsOptional()
  bg_type_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
