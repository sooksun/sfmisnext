import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateAdminStatusDto {
  @IsInt()
  @IsNotEmpty()
  admin_id: number;

  @IsInt()
  @IsNotEmpty()
  del: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
