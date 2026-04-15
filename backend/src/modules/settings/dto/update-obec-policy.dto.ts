import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateObecPolicyDto {
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  obec_policy?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
