import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSchoolPolicyDto {
  @IsInt()
  scp_id: number;

  @IsOptional()
  @IsInt()
  sc_id?: number;

  @IsOptional()
  @IsString()
  sc_policy?: string;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
