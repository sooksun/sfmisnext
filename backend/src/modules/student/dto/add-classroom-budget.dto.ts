import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AddClassroomBudgetDto {
  @IsInt()
  class_id: number;

  @IsInt()
  bg_type_id: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
