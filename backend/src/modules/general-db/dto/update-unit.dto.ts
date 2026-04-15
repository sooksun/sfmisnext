import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUnitDto {
  @IsInt()
  un_id: number;

  @IsString()
  @IsOptional()
  un_name?: string;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  u_status?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
