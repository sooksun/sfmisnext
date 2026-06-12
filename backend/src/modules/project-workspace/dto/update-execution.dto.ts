import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';

export class UpdateExecutionDto {
  @IsOptional()
  @IsInt()
  owner_admin_id?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  /** 1=ร่าง 2=พร้อม 3=กำลังทำ 4=รอตรวจสรุป 5=ปิด 6=ติดขัด 9=ยกเลิก */
  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3, 4, 5, 6, 9])
  execution_status?: number;

  @IsOptional()
  @IsString()
  expected_output?: string;

  @IsOptional()
  @IsString()
  success_indicator?: string;

  /** เหตุผล — บังคับเมื่อ execution_status = 9 (ยกเลิก) */
  @IsOptional()
  @IsString()
  cancel_reason?: string;
}
