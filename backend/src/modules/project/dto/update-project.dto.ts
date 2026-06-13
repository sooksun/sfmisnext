import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProjectDto {
  @IsInt()
  proj_id: number;

  @IsString()
  @IsOptional()
  proj_name?: string;

  @IsString()
  @IsOptional()
  proj_detail?: string;

  @IsString()
  @IsOptional()
  proj_policy?: string;

  /** นโยบายโรงเรียน (master_sc_policy.scp_id) ได้หลายข้อ — ส่งมาเพื่อแทนที่ทั้งชุด */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  policy_ids?: number[];

  @IsInt()
  @IsOptional()
  owner_admin_id?: number;

  @IsInt()
  @IsOptional()
  budget_year?: number;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  proj_budget_type?: string;

  @IsString()
  @IsOptional()
  proj_owner?: string;

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

  @IsInt()
  @IsOptional()
  proj_status?: number;
}
