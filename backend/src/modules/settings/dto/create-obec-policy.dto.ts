import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateObecPolicyDto {
  @IsString()
  obec_policy: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsInt()
  up_by: number;
}
