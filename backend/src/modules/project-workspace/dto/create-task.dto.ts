import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsInt()
  assignee_admin_id?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  /** 0|1 — งานนี้ต้องมีหลักฐานก่อนปิดเป็น "เสร็จแล้ว" */
  @IsOptional()
  @IsInt()
  evidence_required?: number;

  @IsOptional()
  @IsInt()
  sy_id?: number;
}
