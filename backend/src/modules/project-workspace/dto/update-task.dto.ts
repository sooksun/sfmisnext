import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

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

  /** 1=ยังไม่เริ่ม 2=กำลังทำ 3=รอตรวจ 4=เสร็จแล้ว 5=ติดขัด 9=ยกเลิก */
  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3, 4, 5, 9])
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsInt()
  evidence_required?: number;

  @IsOptional()
  @IsString()
  result_note?: string;

  @IsOptional()
  @IsString()
  blocked_reason?: string;
}
