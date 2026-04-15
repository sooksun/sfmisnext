import { IsInt, IsNumber, Min } from 'class-validator';

export class AddClassroomBudgetDto {
  @IsInt()
  class_id: number;

  @IsInt()
  bg_type_id: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsInt()
  up_by?: number;
}
