import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTypeSuppliesDto {
  @IsInt()
  ts_id: number;

  @IsString()
  @IsOptional()
  ts_name?: string;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
