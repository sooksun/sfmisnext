import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdateStudentDto {
  @IsInt()
  st_id: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  st_count?: number;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
