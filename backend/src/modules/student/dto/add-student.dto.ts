import { IsInt, IsString, Min } from 'class-validator';

export class AddStudentDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsString()
  budget_year: string;

  @IsInt()
  class_id: number;

  @IsInt()
  @Min(0)
  st_count: number;

  @IsInt()
  up_by?: number;
}
