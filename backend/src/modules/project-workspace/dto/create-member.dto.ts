import { IsInt, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class CreateMemberDto {
  @IsInt()
  admin_id: number;

  @IsOptional()
  @IsString()
  @IsIn(['owner', 'member', 'reviewer'])
  project_role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  role_name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
